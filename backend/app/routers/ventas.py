# ============================================================================
# routers/ventas.py - Endpoints de gestión de ventas
# ----------------------------------------------------------------------------
# Prefijo: /api/v1/ventas
#   - POST ""             -> Registrar una venta completa (cabecera + items).
#   - GET  ""             -> Listar ventas (con filtros de fecha y por rol).
#   - GET  /{venta_id}    -> Obtener una venta concreta con sus detalles.
# También define get_venta_completa(), helper reutilizado por crear_venta.
# La venta se guarda en dos tablas: "ventas" (la cabecera con totales) y
# "detalle_ventas" (cada línea: producto, cantidad y precio).
# ============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from decimal import Decimal  # Aritmética exacta para dinero (evita errores de float).
from typing import Optional

# Modelos Pydantic de validación.
from app.models.venta import VentaCreate, VentaResponse, DetalleVentaResponse
# Dependencias de autenticación/autorización.
from app.auth import get_current_profile, require_admin
# Helpers de Supabase.
from app.services.supabase import from_table, handle_supabase_error

# Router con prefijo y etiqueta.
router = APIRouter(prefix="/api/v1/ventas", tags=["ventas"])

# IVA aplicado a las ventas (15%). El frontend usa el mismo valor.
IVA = Decimal("0.15")


# ----------------------------------------------------------------------------
# _build_venta_response(venta, usuario_nombre, detalles, producto_map)
# Construye el objeto de respuesta VentaResponse a partir de la cabecera de
# la venta, los datos del usuario y los detalles. El mapa de productos se usa
# para traducir producto_id al nombre legible de cada línea.
# ----------------------------------------------------------------------------
def _build_venta_response(venta, usuario_nombre, detalles, producto_map):
    return VentaResponse(
        id=venta["id"],
        usuario_id=venta["usuario_id"],
        usuario_nombre=usuario_nombre,
        subtotal=venta["subtotal"],
        impuestos=venta["impuestos"],
        total=venta["total"],
        metodo_pago=venta["metodo_pago"],
        monto_recibido=venta["monto_recibido"],
        cambio_entregado=venta["cambio_entregado"],
        fecha_hora=venta["fecha_hora"],
        detalles=[
            DetalleVentaResponse(
                id=d["id"],
                producto_id=d["producto_id"],
                # Nombre del producto o un fallback con su id.
                producto_nombre=producto_map.get(d["producto_id"], f"#{d['producto_id']}"),
                cantidad=d["cantidad"],
                precio_unitario=d["precio_unitario"],
                subtotal=d["subtotal"],
            )
            for d in detalles
        ],
    )


# ----------------------------------------------------------------------------
# POST /api/v1/ventas
# Registra una venta nueva. Pasos:
#   1. Valida método de pago y que haya items.
#   2. Comprueba el stock de cada producto y calcula el subtotal.
#   3. Aplica el IVA y calcula el total.
#   4. Valida el monto recibido (efectivo) y calcula el cambio.
#   5. Inserta la cabecera en "ventas" y las líneas en "detalle_ventas".
#   6. Devuelve la venta completa recién creada.
# NOTA: en este momento NO se descuenta el stock automáticamente aquí;
# el descuento se gestiona con triggers en la base de datos.
# ----------------------------------------------------------------------------
@router.post("", response_model=VentaResponse, status_code=status.HTTP_201_CREATED)
def crear_venta(
    body: VentaCreate,
    profile=Depends(get_current_profile),  # La venta se asocia al cajero.
):
    # 1) Validaciones de la petición.
    metodo_pago = body.metodo_pago
    if metodo_pago not in ("efectivo", "tarjeta", "transferencia"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Método de pago inválido")

    if not body.items:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="La venta debe tener al menos un item")

    # 2) Recorremos los items: validamos producto, stock y calculamos subtotal.
    subtotal = Decimal("0.00")
    detalles_data = []

    for item in body.items:
        # Cargamos el producto con el precio y stock actuales.
        try:
            prod = from_table("productos").select("id,nombre,precio_venta,stock_actual").eq("id", item.producto_id).single().execute()
            producto = prod.data
        except Exception:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Producto {item.producto_id} no encontrado")

        # No se puede vender más de lo que hay en stock.
        if producto["stock_actual"] < item.cantidad:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Stock insuficiente para {producto['nombre']}")

        # Cálculo de la línea: precio de venta x cantidad (en Decimal).
        precio = Decimal(str(producto["precio_venta"]))
        item_subtotal = precio * item.cantidad
        subtotal += item_subtotal

        detalles_data.append({
            "producto_id": item.producto_id,
            "cantidad": item.cantidad,
            "precio_unitario": float(precio),
            "subtotal": float(item_subtotal),
        })

    # 3) Totales: IVA sobre el subtotal, redondeado a 2 decimales.
    impuestos = (subtotal * IVA).quantize(Decimal("0.01"))
    total = (subtotal + impuestos).quantize(Decimal("0.01"))

    # 4) Pago en efectivo: el monto recibido debe cubrir el total.
    monto_recibido = body.monto_recibido
    if metodo_pago == "efectivo" and monto_recibido < total:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Monto recibido insuficiente")

    # Cambio a devolver (solo en efectivo).
    cambio = Decimal("0.00")
    if metodo_pago == "efectivo":
        cambio = (monto_recibido - total).quantize(Decimal("0.01"))

    # 5) Persistencia en dos pasos: cabecera y luego líneas.
    try:
        venta_data = {
            "usuario_id": profile["id"],      # Cajero que realizó la venta.
            "subtotal": float(subtotal),
            "impuestos": float(impuestos),
            "total": float(total),
            "metodo_pago": metodo_pago,
            "monto_recibido": float(monto_recibido),
            "cambio_entregado": float(cambio),
        }

        # Insertamos la cabecera y recuperamos su id autogenerado.
        venta_resp = from_table("ventas").insert(venta_data).execute()
        venta_id = venta_resp.data[0]["id"]

        # Asociamos cada línea con esa venta e insertamos todas.
        for det in detalles_data:
            det["venta_id"] = venta_id
        from_table("detalle_ventas").insert(detalles_data).execute()

        # Devolvemos la venta completa con sus detalles.
        return get_venta_completa(venta_id)
    except Exception as e:
        handle_supabase_error(e, "Error al procesar la venta")


# ----------------------------------------------------------------------------
# GET /api/v1/ventas
# Lista las ventas. Filtros opcionales "desde" y "hasta" (fechas ISO).
# Regla de visibilidad: un administrador ve todas las ventas; un cajero solo
# las suyas. Para evitar N+1, cargamos perfiles, detalles y productos en
# bloque con consultas IN.
# ----------------------------------------------------------------------------
@router.get("", response_model=list[VentaResponse])
def listar_ventas(
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    profile=Depends(get_current_profile),
):
    try:
        query = from_table("ventas").select("*")

        # Filtro por rol: los cajeros solo ven su historial.
        if profile["rol"] != "administrador":
            query = query.eq("usuario_id", profile["id"])

        # Filtros de fecha sobre fecha_hora.
        if desde:
            query = query.gte("fecha_hora", desde)
        if hasta:
            query = query.lte("fecha_hora", hasta)

        # Ordenadas de más reciente a más antigua.
        ventas = query.order("fecha_hora", desc=True).execute().data
        if not ventas:
            return []

        # Cargamos en bloque los nombres de los cajeros implicados.
        user_ids = list({v["usuario_id"] for v in ventas})
        perfiles = from_table("perfiles").select("id,nombre_completo").in_("id", user_ids).execute().data
        perfil_map = {p["id"]: p["nombre_completo"] for p in perfiles}

        # Cargamos en bloque todos los detalles de estas ventas.
        venta_ids = [v["id"] for v in ventas]
        detalles_raw = from_table("detalle_ventas").select("*").in_("venta_id", venta_ids).execute().data

        # Agrupamos los detalles por venta.
        detalles_por_venta = {}
        for d in detalles_raw:
            detalles_por_venta.setdefault(d["venta_id"], []).append(d)

        # Cargamos los nombres de los productos implicados (una sola consulta).
        all_prod_ids = list({d["producto_id"] for d in detalles_raw})
        if all_prod_ids:
            productos = from_table("productos").select("id,nombre").in_("id", all_prod_ids).execute().data
            producto_map = {p["id"]: p["nombre"] for p in productos}
        else:
            producto_map = {}

        # Construimos la respuesta completa de cada venta.
        return [
            _build_venta_response(
                v, perfil_map.get(v["usuario_id"], "Desconocido"),
                detalles_por_venta.get(v["id"], []), producto_map,
            )
            for v in ventas
        ]
    except Exception as e:
        handle_supabase_error(e, "Error al listar ventas")


# ----------------------------------------------------------------------------
# GET /api/v1/ventas/{venta_id}
# Devuelve una venta concreta. Un cajero solo puede ver sus propias ventas;
# si intenta acceder a otra, 403.
# ----------------------------------------------------------------------------
@router.get("/{venta_id}", response_model=VentaResponse)
def obtener_venta(
    venta_id: int,
    profile=Depends(get_current_profile),
):
    try:
        venta = from_table("ventas").select("*").eq("id", venta_id).single().execute().data
        # Control de acceso: solo admin o el cajero que la hizo.
        if profile["rol"] != "administrador" and venta["usuario_id"] != profile["id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes acceso a esta venta")

        # Nombre del cajero que la realizó.
        usuario = from_table("perfiles").select("nombre_completo").eq("id", venta["usuario_id"]).single().execute().data
        usuario_nombre = usuario["nombre_completo"]

        # Detalles y nombres de productos.
        detalles_raw = from_table("detalle_ventas").select("*").eq("venta_id", venta_id).execute().data

        prod_ids = list({d["producto_id"] for d in detalles_raw})
        if prod_ids:
            productos = from_table("productos").select("id,nombre").in_("id", prod_ids).execute().data
            producto_map = {p["id"]: p["nombre"] for p in productos}
        else:
            producto_map = {}

        return _build_venta_response(venta, usuario_nombre, detalles_raw, producto_map)
    except HTTPException:
        raise  # Re-lanzamos los errores HTTP controlados (404, 403...).
    except Exception as e:
        handle_supabase_error(e, "Error al obtener venta")


# ----------------------------------------------------------------------------
# get_venta_completa(venta_id)
# Función de apoyo (no es un endpoint): carga una venta con su cajero y sus
# detalles y la devuelve como VentaResponse. Se usa tras crear una venta.
# ----------------------------------------------------------------------------
def get_venta_completa(venta_id: int) -> VentaResponse:
    venta = from_table("ventas").select("*").eq("id", venta_id).single().execute().data
    usuario = from_table("perfiles").select("nombre_completo").eq("id", venta["usuario_id"]).single().execute().data
    detalles_raw = from_table("detalle_ventas").select("*").eq("venta_id", venta_id).execute().data

    prod_ids = list({d["producto_id"] for d in detalles_raw})
    if prod_ids:
        productos = from_table("productos").select("id,nombre").in_("id", prod_ids).execute().data
        producto_map = {p["id"]: p["nombre"] for p in productos}
    else:
        producto_map = {}

    return _build_venta_response(venta, usuario["nombre_completo"], detalles_raw, producto_map)
