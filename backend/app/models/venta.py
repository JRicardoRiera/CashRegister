# ============================================================================
# models/venta.py - Modelos Pydantic de ventas
# ----------------------------------------------------------------------------
# Esquemas de validación y respuesta para el módulo de ventas:
#   - DetalleVentaItem: una línea de la petición (producto + cantidad).
#   - VentaCreate: cuerpo del POST /ventas.
#   - DetalleVentaResponse / VentaResponse: lo que se devuelve al cliente,
#     con la cabecera de la venta y sus líneas con nombres de producto.
# ============================================================================

from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal  # Precisión exacta para importes.
from datetime import datetime


# ----------------------------------------------------------------------------
# DetalleVentaItem
# Línea del carrito que llega en la petición. La cantidad debe ser > 0
# (no tiene sentido vender 0 o cantidades negativas).
# ----------------------------------------------------------------------------
class DetalleVentaItem(BaseModel):
    producto_id: int
    cantidad: int = Field(..., gt=0)


# ----------------------------------------------------------------------------
# VentaCreate
# Cuerpo del POST /ventas:
#   - metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia' (se valida en
#     el router).
#   - monto_recibido: dinero que entrega el cliente (en efectivo; para los
#     otros métodos se envía el total).
#   - items: lista de líneas con producto y cantidad.
# ============================================================================
class VentaCreate(BaseModel):
    metodo_pago: str = "efectivo"
    monto_recibido: Decimal = Field(..., ge=0, max_digits=12, decimal_places=2)
    items: list[DetalleVentaItem]


# ----------------------------------------------------------------------------
# DetalleVentaResponse
# Línea de venta en la respuesta: incluye el nombre del producto (resuelto
# por el backend) y los importes de la línea.
# ----------------------------------------------------------------------------
class DetalleVentaResponse(BaseModel):
    id: int
    producto_id: int
    producto_nombre: str
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal


# ----------------------------------------------------------------------------
# VentaResponse
# Venta completa devuelta al cliente: cabecera con totales y pagos, más la
# lista de sus líneas. Es la estructura que muestra el ticket en el frontend.
# ----------------------------------------------------------------------------
class VentaResponse(BaseModel):
    id: int
    usuario_id: str                # Cajero que realizó la venta.
    usuario_nombre: str
    subtotal: Decimal              # Suma de las líneas (sin IVA).
    impuestos: Decimal             # IVA (15% del subtotal).
    total: Decimal                 # Subtotal + impuestos.
    metodo_pago: str
    monto_recibido: Decimal        # Dinero entregado por el cliente.
    cambio_entregado: Decimal      # Cambio a devolver (efectivo).
    fecha_hora: datetime
    detalles: list[DetalleVentaResponse]
