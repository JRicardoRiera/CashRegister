from fastapi import APIRouter, Depends, HTTPException, status
from decimal import Decimal
from typing import Optional
from app.models.venta import VentaCreate, VentaResponse, DetalleVentaResponse
from app.auth import get_current_profile, require_admin
from app.services.supabase import from_table, handle_supabase_error

router = APIRouter(prefix="/api/v1/ventas", tags=["ventas"])

IVA = Decimal("0.16")


@router.post("", response_model=VentaResponse, status_code=status.HTTP_201_CREATED)
def crear_venta(
    body: VentaCreate,
    profile=Depends(get_current_profile),
):
    metodo_pago = body.metodo_pago
    if metodo_pago not in ("efectivo", "tarjeta", "transferencia"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Método de pago inválido")

    if not body.items:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="La venta debe tener al menos un item")

    subtotal = Decimal("0.00")
    detalles_data = []

    for item in body.items:
        try:
            prod = from_table("productos").select("id,nombre,precio_venta,stock_actual").eq("id", item.producto_id).single().execute()
            producto = prod.data
        except Exception:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Producto {item.producto_id} no encontrado")

        if producto["stock_actual"] < item.cantidad:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Stock insuficiente para {producto['nombre']}")

        precio = Decimal(str(producto["precio_venta"]))
        item_subtotal = precio * item.cantidad
        subtotal += item_subtotal

        detalles_data.append({
            "producto_id": item.producto_id,
            "cantidad": item.cantidad,
            "precio_unitario": float(precio),
            "subtotal": float(item_subtotal),
        })

    impuestos = (subtotal * IVA).quantize(Decimal("0.01"))
    total = (subtotal + impuestos).quantize(Decimal("0.01"))

    monto_recibido = body.monto_recibido
    if metodo_pago == "efectivo" and monto_recibido < total:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Monto recibido insuficiente")

    cambio = Decimal("0.00")
    if metodo_pago == "efectivo":
        cambio = (monto_recibido - total).quantize(Decimal("0.01"))

    try:
        venta_data = {
            "usuario_id": profile["id"],
            "subtotal": float(subtotal),
            "impuestos": float(impuestos),
            "total": float(total),
            "metodo_pago": metodo_pago,
            "monto_recibido": float(monto_recibido),
            "cambio_entregado": float(cambio),
        }

        venta_resp = from_table("ventas").insert(venta_data).execute()
        venta_id = venta_resp.data[0]["id"]

        for det in detalles_data:
            det["venta_id"] = venta_id
        from_table("detalle_ventas").insert(detalles_data).execute()

        return get_venta_completa(venta_id)
    except Exception as e:
        handle_supabase_error(e, "Error al procesar la venta")


@router.get("", response_model=list[VentaResponse])
def listar_ventas(
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    profile=Depends(get_current_profile),
):
    try:
        query = from_table("ventas").select("*")

        if profile["rol"] != "administrador":
            query = query.eq("usuario_id", profile["id"])

        if desde:
            query = query.gte("fecha_hora", desde)
        if hasta:
            query = query.lte("fecha_hora", hasta)

        data = query.order("fecha_hora", desc=True).execute()
        result = []
        for v in data.data:
            result.append(get_venta_completa(v["id"]))
        return result
    except Exception as e:
        handle_supabase_error(e, "Error al listar ventas")


@router.get("/{venta_id}", response_model=VentaResponse)
def obtener_venta(
    venta_id: int,
    profile=Depends(get_current_profile),
):
    try:
        venta = from_table("ventas").select("*").eq("id", venta_id).single().execute().data
        if profile["rol"] != "administrador" and venta["usuario_id"] != profile["id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta venta")
        return get_venta_completa(venta_id)
    except HTTPException:
        raise
    except Exception as e:
        handle_supabase_error(e, "Error al obtener venta")


def get_venta_completa(venta_id: int) -> VentaResponse:
    venta = from_table("ventas").select("*").eq("id", venta_id).single().execute().data

    usuario = from_table("perfiles").select("nombre_completo").eq("id", venta["usuario_id"]).single().execute().data

    detalles_raw = from_table("detalle_ventas").select("*").eq("venta_id", venta_id).execute().data

    detalles = []
    for d in detalles_raw:
        prod = from_table("productos").select("nombre").eq("id", d["producto_id"]).single().execute().data
        detalles.append(DetalleVentaResponse(
            id=d["id"],
            producto_id=d["producto_id"],
            producto_nombre=prod["nombre"],
            cantidad=d["cantidad"],
            precio_unitario=d["precio_unitario"],
            subtotal=d["subtotal"],
        ))

    return VentaResponse(
        id=venta["id"],
        usuario_id=venta["usuario_id"],
        usuario_nombre=usuario["nombre_completo"],
        subtotal=venta["subtotal"],
        impuestos=venta["impuestos"],
        total=venta["total"],
        metodo_pago=venta["metodo_pago"],
        monto_recibido=venta["monto_recibido"],
        cambio_entregado=venta["cambio_entregado"],
        fecha_hora=venta["fecha_hora"],
        detalles=detalles,
    )
