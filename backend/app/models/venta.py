from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from datetime import datetime


class DetalleVentaItem(BaseModel):
    producto_id: int
    cantidad: int = Field(..., gt=0)


class VentaCreate(BaseModel):
    metodo_pago: str = "efectivo"
    monto_recibido: Decimal = Field(..., ge=0, max_digits=12, decimal_places=2)
    items: list[DetalleVentaItem]


class DetalleVentaResponse(BaseModel):
    id: int
    producto_id: int
    producto_nombre: str
    cantidad: int
    precio_unitario: Decimal
    subtotal: Decimal


class VentaResponse(BaseModel):
    id: int
    usuario_id: str
    usuario_nombre: str
    subtotal: Decimal
    impuestos: Decimal
    total: Decimal
    metodo_pago: str
    monto_recibido: Decimal
    cambio_entregado: Decimal
    fecha_hora: datetime
    detalles: list[DetalleVentaResponse]
