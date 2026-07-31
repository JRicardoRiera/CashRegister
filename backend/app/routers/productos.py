# ============================================================================
# routers/productos.py - Endpoints de gestión de productos
# ----------------------------------------------------------------------------
# Prefijo: /api/v1/productos
#   - GET    ""                  -> Lista paginada de productos activos.
#   - GET    /{producto_id}      -> Producto por id.
#   - POST   ""                  -> Crear producto (solo administrador).
#   - PUT    /{producto_id}      -> Actualizar producto (solo administrador).
#   - POST   /{id}/ajustar-stock -> Ajustar stock (solo administrador).
#   - DELETE /{producto_id}      -> Desactivar producto (solo admin).
# La lectura está abierta a cualquier usuario autenticado; la escritura
# requiere rol de administrador (Depends(require_admin)).
# ============================================================================

from math import ceil  # Para redondear hacia arriba en el paginado.

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional

# Modelos Pydantic de validación.
from app.models.producto import (
    ProductoCreate,
    ProductoUpdate,
    ProductoResponse,
    ProductosPaginados,
    AjusteStockRequest,
    MovimientoStockResponse,
)
# Dependencias de autenticación y autorización.
from app.auth import get_current_profile, require_admin
# Helpers de Supabase.
from app.services.supabase import from_table, handle_supabase_error, get_producto_or_404

# Router con prefijo y etiqueta.
router = APIRouter(prefix="/api/v1/productos", tags=["productos"])


# ----------------------------------------------------------------------------
# _build_filters(query, q)
# Ayudante para construir el filtro de búsqueda de la lista:
#   - Si el término es todo números (o muy largo, >= 8 caracteres), se
#     interpreta como código de barras y se busca por igualdad exacta.
#   - En cualquier otro caso se busca por nombre (búsqueda parcial,
#     insensible a mayúsculas).
# ----------------------------------------------------------------------------
def _build_filters(query, q):
    if not q:
        return query                      # Sin filtro: lista completa.
    if q.isdigit() or len(q) >= 8:
        return query.eq("codigo_barras", q)  # Es un código de barras.
    return query.ilike("nombre", f"%{q}%")   # Búsqueda por nombre parcial.


# ----------------------------------------------------------------------------
# GET /api/v1/productos
# Devuelve los productos activos paginados. Parámetros:
#   - q: término de búsqueda (nombre o código de barras).
#   - page: número de página (empieza en 1).
#   - per_page: elementos por página (máximo 100).
# Solo se muestran productos con activo = True (los eliminados son un
# borrado lógico que se oculta de la tienda).
# ----------------------------------------------------------------------------
@router.get("", response_model=ProductosPaginados)
def listar_productos(
    q: Optional[str] = None,
    page: int = Query(1, ge=1),          # Página mínima: 1.
    per_page: int = Query(20, ge=1, le=100),
    profile=Depends(get_current_profile),  # Requiere usuario autenticado.
):
    try:
        # Primero contamos el total de resultados para el paginado.
        count_q = _build_filters(
            from_table("productos").select("*", count="exact").eq("activo", True), q
        )
        count_resp = count_q.execute()
        total = count_resp.count if hasattr(count_resp, 'count') and count_resp.count is not None else 0

        # Luego pedimos la página concreta usando el rango de filas.
        start = (page - 1) * per_page
        end = page * per_page - 1
        data_q = _build_filters(
            from_table("productos").select("*").eq("activo", True).order("nombre").range(start, end), q
        )
        items = data_q.execute().data

        # Si no vino el total (por la búsqueda), lo estimamos.
        total = total or (start + len(items))
        total_pages = max(1, ceil(total / per_page))  # Mínimo 1 página.

        return ProductosPaginados(
            items=items, total=total, page=page,
            per_page=per_page, total_pages=total_pages,
        )
    except Exception as e:
        handle_supabase_error(e, "Error al listar productos")


# ----------------------------------------------------------------------------
# GET /api/v1/productos/{producto_id}
# Devuelve un producto concreto (activo o no). Si no existe, 404.
# ----------------------------------------------------------------------------
@router.get("/{producto_id}", response_model=ProductoResponse)
def obtener_producto(
    producto_id: int,
    profile=Depends(get_current_profile),
):
    return get_producto_or_404(producto_id)


# ----------------------------------------------------------------------------
# POST /api/v1/productos
# Crea un producto nuevo. Antes valida que el precio de venta no sea menor
# que el de compra (no tendría sentido vender a pérdida).
# ----------------------------------------------------------------------------
@router.post("", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
def crear_producto(
    body: ProductoCreate,
    admin=Depends(require_admin),   # Solo administradores.
):
    # Validación de negocio.
    if body.precio_venta < body.precio_compra:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="precio_venta debe ser >= precio_compra")

    try:
        # Insertamos el producto y devolvemos la fila creada.
        data = from_table("productos").insert(body.model_dump(mode='json')).execute()
        return data.data[0]
    except Exception as e:
        handle_supabase_error(e, "Error al crear producto")


# ----------------------------------------------------------------------------
# PUT /api/v1/productos/{producto_id}
# Actualiza los campos que vengan rellenos (se descartan los None). Vuelve a
# comprobar la regla de precios teniendo en cuenta los valores actuales.
# ----------------------------------------------------------------------------
@router.put("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(
    producto_id: int,
    body: ProductoUpdate,
    admin=Depends(require_admin),
):
    # Solo enviamos los campos que el cliente ha indicado (model_dump con
    # exclude_none implícito vía el filtro de abajo).
    update_data = {k: v for k, v in body.model_dump(mode='json').items() if v is not None}

    # Si no hay nada que actualizar, respondemos con error.
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay campos para actualizar")

    # Cargamos el producto actual para validar precios (y para el 404).
    existing = get_producto_or_404(producto_id)

    # Precios resultantes: el nuevo si viene, si no el actual.
    precio_compra = update_data.get("precio_compra") or existing["precio_compra"]
    precio_venta = update_data.get("precio_venta") or existing["precio_venta"]
    if precio_venta < precio_compra:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="precio_venta debe ser >= precio_compra")

    try:
        # Actualizamos y devolvemos la fila resultante.
        data = from_table("productos").update(update_data).eq("id", producto_id).execute()
        return data.data[0]
    except Exception as e:
        handle_supabase_error(e, "Error al actualizar producto")


# ----------------------------------------------------------------------------
# POST /api/v1/productos/{producto_id}/ajustar-stock
# Ajusta el stock manualmente. Los tipos posibles:
#   - entrada: se suma la cantidad al stock.
#   - salida: se resta la cantidad (no puede dejar el stock en negativo).
#   - ajuste: se fija el stock al valor indicado (corrección de inventario).
# Cada ajuste queda registrado en la tabla "movimientos_stock" para auditar.
# ----------------------------------------------------------------------------
@router.post("/{producto_id}/ajustar-stock", response_model=MovimientoStockResponse)
def ajustar_stock(
    producto_id: int,
    body: AjusteStockRequest,
    admin=Depends(require_admin),
):
    # Validaciones de entrada.
    if body.cantidad <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="La cantidad debe ser mayor a 0")

    if body.tipo not in ("entrada", "salida", "ajuste"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tipo inválido: entrada, salida o ajuste")

    # Stock antes del movimiento.
    prod = get_producto_or_404(producto_id)
    stock_anterior = prod["stock_actual"]

    # Cálculo del stock resultante según el tipo.
    if body.tipo == "entrada":
        stock_resultante = stock_anterior + body.cantidad
    elif body.tipo == "salida":
        stock_resultante = stock_anterior - body.cantidad
        if stock_resultante < 0:  # No se puede sacar más de lo que hay.
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Stock insuficiente para esta salida")
    else:  # ajuste: se impone la cantidad como stock nuevo.
        stock_resultante = body.cantidad

    # 1) Actualizamos el stock del producto.
    from_table("productos").update({"stock_actual": stock_resultante}).eq("id", producto_id).execute()

    # 2) Registramos el movimiento en la tabla de auditoría.
    mov = {
        "producto_id": producto_id,
        "tipo": body.tipo,
        "cantidad": body.cantidad,
        "stock_anterior": stock_anterior,
        "stock_resultante": stock_resultante,
        "motivo": body.motivo,
        "usuario_id": admin["id"],  # Quién hizo el ajuste.
    }

    mov_resp = from_table("movimientos_stock").insert(mov).execute()
    return mov_resp.data[0]


# ----------------------------------------------------------------------------
# DELETE /api/v1/productos/{producto_id}
# "Elimina" un producto mediante borrado lógico: se marca activo = False en
# vez de borrar la fila, así no se rompen las referencias en ventas pasadas.
# ----------------------------------------------------------------------------
@router.delete("/{producto_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_producto(
    producto_id: int,
    admin=Depends(require_admin),
):
    try:
        from_table("productos").update({"activo": False}).eq("id", producto_id).execute()
    except Exception as e:
        handle_supabase_error(e, "Error al eliminar producto")
