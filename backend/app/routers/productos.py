from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from app.models.producto import (
    ProductoCreate,
    ProductoUpdate,
    ProductoResponse,
    AjusteStockRequest,
    MovimientoStockResponse,
)
from app.auth import get_current_profile, require_admin
from app.services.supabase import from_table, handle_supabase_error

router = APIRouter(prefix="/api/v1/productos", tags=["productos"])


@router.get("", response_model=list[ProductoResponse])
def listar_productos(
    q: Optional[str] = None,
    profile=Depends(get_current_profile),
):
    try:
        query = from_table("productos").select("*").eq("activo", True)

        if q:
            if q.isdigit() or len(q) >= 8:
                query = query.eq("codigo_barras", q)
            else:
                query = query.ilike("nombre", f"%{q}%")

        data = query.order("nombre").execute()
        return data.data
    except Exception as e:
        handle_supabase_error(e, "Error al listar productos")


@router.get("/{producto_id}", response_model=ProductoResponse)
def obtener_producto(
    producto_id: int,
    profile=Depends(get_current_profile),
):
    try:
        data = from_table("productos").select("*").eq("id", producto_id).single().execute()
        return data.data
    except Exception as e:
        if "PGRST116" in str(e):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
        handle_supabase_error(e, "Error al obtener producto")


@router.post("", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def crear_producto(
    body: ProductoCreate,
    admin=Depends(require_admin),
):
    if body.precio_venta < body.precio_compra:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="precio_venta debe ser >= precio_compra")

    try:
        data = from_table("productos").insert(body.model_dump(mode='json')).execute()
        return data.data[0]
    except Exception as e:
        handle_supabase_error(e, "Error al crear producto")


@router.put("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(
    producto_id: int,
    body: ProductoUpdate,
    admin=Depends(require_admin),
):
    update_data = {k: v for k, v in body.model_dump(mode='json').items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay campos para actualizar")

    try:
        existing = from_table("productos").select("*").eq("id", producto_id).single().execute()
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    precio_compra = update_data.get("precio_compra") or existing.data["precio_compra"]
    precio_venta = update_data.get("precio_venta") or existing.data["precio_venta"]
    if precio_venta < precio_compra:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="precio_venta debe ser >= precio_compra")

    try:
        data = from_table("productos").update(update_data).eq("id", producto_id).execute()
        return data.data[0]
    except Exception as e:
        handle_supabase_error(e, "Error al actualizar producto")


@router.post("/{producto_id}/ajustar-stock", response_model=MovimientoStockResponse)
def ajustar_stock(
    producto_id: int,
    body: AjusteStockRequest,
    admin=Depends(require_admin),
):
    if body.cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="La cantidad debe ser mayor a 0")

    if body.tipo not in ("entrada", "salida", "ajuste"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tipo inválido: entrada, salida o ajuste")

    try:
        prod = from_table("productos").select("*").eq("id", producto_id).single().execute().data
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    stock_anterior = prod["stock_actual"]

    if body.tipo == "entrada":
        stock_resultante = stock_anterior + body.cantidad
    elif body.tipo == "salida":
        stock_resultante = stock_anterior - body.cantidad
        if stock_resultante < 0:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Stock insuficiente para esta salida")
    else:
        stock_resultante = body.cantidad

    from_table("productos").update({"stock_actual": stock_resultante}).eq("id", producto_id).execute()

    mov = {
        "producto_id": producto_id,
        "tipo": body.tipo,
        "cantidad": body.cantidad,
        "stock_anterior": stock_anterior,
        "stock_resultante": stock_resultante,
        "motivo": body.motivo,
        "usuario_id": admin["id"],
    }

    mov_resp = from_table("movimientos_stock").insert(mov).execute()
    return mov_resp.data[0]


@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(
    producto_id: int,
    admin=Depends(require_admin),
):
    try:
        from_table("productos").update({"activo": False}).eq("id", producto_id).execute()
    except Exception as e:
        handle_supabase_error(e, "Error al eliminar producto")
