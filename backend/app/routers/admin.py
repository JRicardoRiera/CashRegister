from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from app.auth import require_admin
from app.services.supabase import from_table, handle_supabase_error
from app.models.auth_schemas import UsuarioUpdate, UsuarioAdminResponse
from app.models.dashboard import (
    DashboardResponse,
    HoyStats,
    DiaSemana,
    ProductoBajoStock,
    UltimaVenta,
    TopProducto,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(admin=Depends(require_admin)):
    today = datetime.now(timezone.utc).date()
    today_start = today.isoformat()
    today_end = (today + timedelta(days=1)).isoformat()

    try:
        ventas_hoy = (
            from_table("ventas")
            .select("total")
            .gte("fecha_hora", today_start)
            .lt("fecha_hora", today_end)
            .execute()
        )
    except Exception as e:
        handle_supabase_error(e, "Error al obtener ventas del día")

    total_ventas = len(ventas_hoy.data)
    monto_total = sum(Decimal(str(v["total"])) for v in ventas_hoy.data)
    ticket_promedio = (monto_total / total_ventas).quantize(Decimal("0.01")) if total_ventas > 0 else Decimal("0.00")

    semana = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        start = d.isoformat()
        end = (d + timedelta(days=1)).isoformat()
        try:
            ventas_dia = (
                from_table("ventas")
                .select("total")
                .gte("fecha_hora", start)
                .lt("fecha_hora", end)
                .execute()
            )
        except Exception as e:
            handle_supabase_error(e, "Error al obtener ventas del día")
        total_dia = sum(Decimal(str(v["total"])) for v in ventas_dia.data)
        semana.append(DiaSemana(fecha=d.isoformat(), total=float(total_dia)))

    try:
        todos_productos = (
            from_table("productos")
            .select("id,nombre,codigo_barras,stock_actual,stock_minimo")
            .eq("activo", True)
            .execute()
        )
    except Exception as e:
        handle_supabase_error(e, "Error al obtener productos")

    bajos = [
        ProductoBajoStock(
            id=p["id"],
            nombre=p["nombre"],
            codigo_barras=p.get("codigo_barras", ""),
            stock_actual=p["stock_actual"],
            stock_minimo=p["stock_minimo"],
        )
        for p in todos_productos.data
        if p["stock_actual"] <= p["stock_minimo"]
    ]

    try:
        ultimas_ventas = (
            from_table("ventas")
            .select("id,total,fecha_hora,usuario_id")
            .order("fecha_hora", desc=True)
            .limit(5)
            .execute()
        )
    except Exception as e:
        handle_supabase_error(e, "Error al obtener últimas ventas")

    user_ids = list({v["usuario_id"] for v in ultimas_ventas.data})
    perfiles = from_table("perfiles").select("id,nombre_completo").in_("id", user_ids).execute().data
    perfil_map = {p["id"]: p["nombre_completo"] for p in perfiles}

    ultimas = [
        UltimaVenta(
            id=v["id"],
            total=v["total"],
            fecha_hora=v["fecha_hora"],
            usuario_nombre=perfil_map.get(v["usuario_id"], "Desconocido"),
        )
        for v in ultimas_ventas.data
    ]

    try:
        todos_detalles = (
            from_table("detalle_ventas")
            .select("producto_id,cantidad")
            .execute()
        )
    except Exception as e:
        handle_supabase_error(e, "Error al obtener detalle de ventas")

    agg = {}
    for d in todos_detalles.data:
        pid = d["producto_id"]
        agg[pid] = agg.get(pid, 0) + d["cantidad"]

    sorted_prods = sorted(agg.items(), key=lambda x: x[1], reverse=True)[:5]
    top_ids = [pid for pid, _ in sorted_prods]

    if top_ids:
        productos = (
            from_table("productos")
            .select("id,nombre")
            .in_("id", top_ids)
            .execute()
        )
        prod_map = {p["id"]: p["nombre"] for p in productos.data}
    else:
        prod_map = {}

    top5 = [
        TopProducto(
            producto_id=pid,
            nombre=prod_map.get(pid, f"#{pid}"),
            total_vendido=total_vendido,
        )
        for pid, total_vendido in sorted_prods
    ]

    return DashboardResponse(
        hoy=HoyStats(
            total_ventas=total_ventas,
            monto_total=float(monto_total),
            ticket_promedio=float(ticket_promedio),
        ),
        semana=semana,
        productos_bajo_stock=bajos,
        ultimas_ventas=ultimas,
        top_productos=top5,
    )


def _get_perfil_or_404(user_id: str) -> dict:
    try:
        resp = from_table("perfiles").select("*").eq("id", user_id).single().execute()
        return resp.data
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")


@router.get("/usuarios", response_model=list[UsuarioAdminResponse])
def listar_usuarios(admin=Depends(require_admin)):
    try:
        data = from_table("perfiles").select("*").order("creado_en", desc=True).execute()
        return data.data
    except Exception as e:
        handle_supabase_error(e, "Error al listar usuarios")


@router.get("/usuarios/{user_id}", response_model=UsuarioAdminResponse)
def obtener_usuario(user_id: str, admin=Depends(require_admin)):
    return _get_perfil_or_404(user_id)


@router.put("/usuarios/{user_id}", response_model=UsuarioAdminResponse)
def actualizar_usuario(
    user_id: str,
    body: UsuarioUpdate,
    admin=Depends(require_admin),
):
    update_data = {k: v for k, v in body.model_dump(exclude_none=True).items()}

    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay campos para actualizar")

    if "rol" in update_data and update_data["rol"] not in ("administrador", "cajero"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Rol inválido: debe ser 'administrador' o 'cajero'")

    _get_perfil_or_404(user_id)

    try:
        data = from_table("perfiles").update(update_data).eq("id", user_id).execute()
        return data.data[0]
    except Exception as e:
        handle_supabase_error(e, "Error al actualizar usuario")
