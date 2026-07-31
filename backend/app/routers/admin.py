# ============================================================================
# routers/admin.py - Endpoints de administración
# ----------------------------------------------------------------------------
# Prefijo: /api/v1/admin
#   - GET  /dashboard            -> Métricas del panel principal.
#   - GET  /usuarios             -> Lista de usuarios del sistema.
#   - GET  /usuarios/{user_id}   -> Usuario concreto.
#   - PUT  /usuarios/{user_id}   -> Actualizar rol / estado de un usuario.
# Todos los endpoints requieren rol de administrador (Depends(require_admin)).
# ============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone, timedelta  # Cálculo de fechas (hoy, semana).
from decimal import Decimal  # Aritmética exacta con dinero.

from app.auth import require_admin  # Autorización: solo administradores.
from app.services.supabase import from_table, handle_supabase_error
# Modelos de usuario y del dashboard.
from app.models.auth_schemas import UsuarioUpdate, UsuarioAdminResponse
from app.models.dashboard import (
    DashboardResponse,
    HoyStats,
    DiaSemana,
    ProductoBajoStock,
    UltimaVenta,
    TopProducto,
)

# Router con prefijo y etiqueta.
router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ----------------------------------------------------------------------------
# GET /api/v1/admin/dashboard
# Reúne las métricas del panel de administración:
#   - hoy: número de ventas, monto total y ticket promedio del día.
#   - semana: total vendido por día (últimos 7 días).
#   - productos_bajo_stock: productos con stock <= stock_minimo.
#   - ultimas_ventas: las 5 ventas más recientes.
#   - top_productos: los 5 productos más vendidos (por cantidad).
# ============================================================================
@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(admin=Depends(require_admin)):
    # Rango de "hoy" en UTC: [inicio del día, inicio del día siguiente).
    today = datetime.now(timezone.utc).date()
    today_start = today.isoformat()
    today_end = (today + timedelta(days=1)).isoformat()

    # 1) Ventas de hoy (solo sus totales para calcular métricas).
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
    # Suma de totales con Decimal para precisión monetaria.
    monto_total = sum(Decimal(str(v["total"])) for v in ventas_hoy.data)
    # Ticket promedio (evita división entre cero).
    ticket_promedio = (monto_total / total_ventas).quantize(Decimal("0.01")) if total_ventas > 0 else Decimal("0.00")

    # 2) Serie de los últimos 7 días (de hace 6 días hasta hoy).
    semana = []
    for i in range(6, -1, -1):  # 6, 5, ..., 0 (de más antiguo a hoy).
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

    # 3) Productos con stock bajo (activos y con stock <= mínimo).
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
        if p["stock_actual"] <= p["stock_minimo"]  # Filtro de stock bajo.
    ]

    # 4) Últimas 5 ventas con el nombre del cajero.
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

    # Cargamos los nombres de los cajeros de esas ventas (una sola consulta).
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

    # 5) Top 5 productos por cantidad vendida (sumando todo el histórico).
    try:
        todos_detalles = (
            from_table("detalle_ventas")
            .select("producto_id,cantidad")
            .execute()
        )
    except Exception as e:
        handle_supabase_error(e, "Error al obtener detalle de ventas")

    # Agrupamos: producto_id -> total de unidades vendidas.
    agg = {}
    for d in todos_detalles.data:
        pid = d["producto_id"]
        agg[pid] = agg.get(pid, 0) + d["cantidad"]

    # Ordenamos por cantidad descendente y nos quedamos con 5.
    sorted_prods = sorted(agg.items(), key=lambda x: x[1], reverse=True)[:5]
    top_ids = [pid for pid, _ in sorted_prods]

    # Nombres de esos productos.
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

    # Respuesta final con todas las secciones del dashboard.
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


# ----------------------------------------------------------------------------
# _get_perfil_or_404(user_id)
# Helper: devuelve el perfil de un usuario o lanza 404 si no existe.
# ----------------------------------------------------------------------------
def _get_perfil_or_404(user_id: str) -> dict:
    try:
        resp = from_table("perfiles").select("*").eq("id", user_id).single().execute()
        return resp.data
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")


# ----------------------------------------------------------------------------
# GET /api/v1/admin/usuarios
# Lista todos los usuarios ordenados por fecha de registro (nuevos primero).
# ----------------------------------------------------------------------------
@router.get("/usuarios", response_model=list[UsuarioAdminResponse])
def listar_usuarios(admin=Depends(require_admin)):
    try:
        data = from_table("perfiles").select("*").order("creado_en", desc=True).execute()
        return data.data
    except Exception as e:
        handle_supabase_error(e, "Error al listar usuarios")


# ----------------------------------------------------------------------------
# GET /api/v1/admin/usuarios/{user_id}
# Devuelve un usuario concreto por su id (UUID).
# ----------------------------------------------------------------------------
@router.get("/usuarios/{user_id}", response_model=UsuarioAdminResponse)
def obtener_usuario(user_id: str, admin=Depends(require_admin)):
    return _get_perfil_or_404(user_id)


# ----------------------------------------------------------------------------
# PUT /api/v1/admin/usuarios/{user_id}
# Actualiza un usuario: permite cambiar el rol (administrador/cajero) y el
# estado activo. Los campos None se ignoran (solo se cambia lo enviado).
# ----------------------------------------------------------------------------
@router.put("/usuarios/{user_id}", response_model=UsuarioAdminResponse)
def actualizar_usuario(
    user_id: str,
    body: UsuarioUpdate,
    admin=Depends(require_admin),
):
    # Solo enviamos a la base de datos los campos que vienen rellenos.
    update_data = {k: v for k, v in body.model_dump(exclude_none=True).items()}

    # Sin campos no hay nada que hacer.
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay campos para actualizar")

    # Validación del rol permitido.
    if "rol" in update_data and update_data["rol"] not in ("administrador", "cajero"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Rol inválido: debe ser 'administrador' o 'cajero'")

    # Comprobamos que el usuario existe (404 si no).
    _get_perfil_or_404(user_id)

    try:
        data = from_table("perfiles").update(update_data).eq("id", user_id).execute()
        return data.data[0]
    except Exception as e:
        handle_supabase_error(e, "Error al actualizar usuario")
