from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from app.auth import require_admin
from app.services.supabase import from_table, handle_supabase_error

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/dashboard")
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
        semana.append({
            "fecha": d.isoformat(),
            "total": float(total_dia),
        })

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
        {
            "id": p["id"],
            "nombre": p["nombre"],
            "codigo_barras": p.get("codigo_barras", ""),
            "stock_actual": p["stock_actual"],
            "stock_minimo": p["stock_minimo"],
        }
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

    ultimas = []
    for v in ultimas_ventas.data:
        try:
            usuario = (
                from_table("perfiles")
                .select("nombre_completo")
                .eq("id", v["usuario_id"])
                .single()
                .execute()
            )
            nombre = usuario.data["nombre_completo"] if usuario else "Desconocido"
        except Exception:
            nombre = "Desconocido"
        ultimas.append({
            "id": v["id"],
            "total": v["total"],
            "fecha_hora": v["fecha_hora"],
            "usuario_nombre": nombre,
        })

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
    top5 = []
    for pid, total_vendido in sorted_prods:
        try:
            p = from_table("productos").select("nombre").eq("id", pid).single().execute().data
            nombre = p["nombre"]
        except Exception:
            nombre = f"#{pid}"
        top5.append({
            "producto_id": pid,
            "nombre": nombre,
            "total_vendido": total_vendido,
        })

    return {
        "hoy": {
            "total_ventas": total_ventas,
            "monto_total": float(monto_total),
            "ticket_promedio": float(ticket_promedio),
        },
        "semana": semana,
        "productos_bajo_stock": bajos,
        "ultimas_ventas": ultimas,
        "top_productos": top5,
    }
