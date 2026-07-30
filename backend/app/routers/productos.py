from math import ceil
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from app.models.producto import (
    ProductoCreate,
    ProductoUpdate,
    ProductoResponse,
    ProductosPaginados,
    AjusteStockRequest,
    MovimientoStockResponse,
)
from app.auth import get_current_profile, require_admin
from app.services.supabase import from_table, handle_supabase_error, get_producto_or_404

router = APIRouter(prefix="/api/v1/productos", tags=["productos"])


def _build_filters(query, q):
    if not q:
        return query
    if q.isdigit() or len(q) >= 8:
        return query.eq("codigo_barras", q)
    return query.ilike("nombre", f"%{q}%")


@router.get("", response_model=ProductosPaginados)
def listar_productos(
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    profile=Depends(get_current_profile),
):
    try:
        count_q = _build_filters(
            from_table("productos").select("*", count="exact").eq("activo", True), q
        )
        count_resp = count_q.execute()
        total = count_resp.count if hasattr(count_resp, 'count') and count_resp.count is not None else 0

        start = (page - 1) * per_page
        end = page * per_page - 1
        data_q = _build_filters(
            from_table("productos").select("*").eq("activo", True).order("nombre").range(start, end), q
        )
        items = data_q.execute().data

        total = total or (start + len(items))
        total_pages = max(1, ceil(total / per_page))

        return ProductosPaginados(
            items=items, total=total, page=page,
            per_page=per_page, total_pages=total_pages,
        )
    except Exception as e:
        handle_supabase_error(e, "Error al listar productos")


@router.get("/{producto_id}", response_model=ProductoResponse)
def obtener_producto(
    producto_id: int,
    profile=Depends(get_current_profile),
):
    return get_producto_or_404(producto_id)


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

    existing = get_producto_or_404(producto_id)

    precio_compra = update_data.get("precio_compra") or existing["precio_compra"]
    precio_venta = update_data.get("precio_venta") or existing["precio_venta"]
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

    prod = get_producto_or_404(producto_id)
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
