# ============================================================================
# models/producto.py - Modelos Pydantic de productos
# ----------------------------------------------------------------------------
# Esquemas de validación y respuesta para el módulo de productos:
#   - ProductoBase: campos comunes del producto.
#   - ProductoCreate: se usa al crear (hereda de Base).
#   - ProductoUpdate: todos opcionales, para actualizaciones parciales.
#   - AjusteStockRequest / MovimientoStockResponse: movimientos de stock.
#   - ProductoResponse: producto completo con sus fechas.
#   - ProductosPaginados: envoltorio para la lista paginada.
# ============================================================================

from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal  # Precios con precisión exacta.
from datetime import datetime


# ----------------------------------------------------------------------------
# ProductoBase
# Campos de un producto con sus validaciones:
#   - Los precios no pueden ser negativos (ge=0), con 12 dígitos y 2
#     decimales (igual que NUMERIC(12,2) en la base de datos).
#   - El stock tampoco puede ser negativo.
# ============================================================================
class ProductoBase(BaseModel):
    codigo_barras: str = Field(..., max_length=50)   # Código del lector.
    nombre: str = Field(..., max_length=150)
    descripcion: Optional[str] = None
    categoria_id: Optional[int] = None               # Relación con categorías.
    precio_compra: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)
    precio_venta: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)
    stock_actual: int = Field(default=0, ge=0)        # Unidades disponibles.
    stock_minimo: int = Field(default=5, ge=0)        # Umbral de alerta.
    activo: bool = True                               # Visible en la tienda.


# ----------------------------------------------------------------------------
# ProductoCreate
# Para el POST /productos: hereda todos los campos de ProductoBase.
# ----------------------------------------------------------------------------
class ProductoCreate(ProductoBase):
    pass


# ----------------------------------------------------------------------------
# ProductoUpdate
# Para el PUT /productos/{id}: todos los campos opcionales (patch parcial).
# ----------------------------------------------------------------------------
class ProductoUpdate(BaseModel):
    codigo_barras: Optional[str] = Field(None, max_length=50)
    nombre: Optional[str] = Field(None, max_length=150)
    descripcion: Optional[str] = None
    categoria_id: Optional[int] = None
    precio_compra: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)
    precio_venta: Optional[Decimal] = Field(None, ge=0, max_digits=12, decimal_places=2)
    stock_actual: Optional[int] = Field(None, ge=0)
    stock_minimo: Optional[int] = Field(None, ge=0)
    activo: Optional[bool] = None


# ----------------------------------------------------------------------------
# AjusteStockRequest
# Cuerpo del POST /productos/{id}/ajustar-stock. El tipo indica la operación:
# 'entrada' (suma), 'salida' (resta) o 'ajuste' (fija el stock).
# ----------------------------------------------------------------------------
class AjusteStockRequest(BaseModel):
    tipo: str  # 'entrada' | 'salida' | 'ajuste'
    cantidad: int
    motivo: str  # Justificación del ajuste (auditoría).


# ----------------------------------------------------------------------------
# MovimientoStockResponse
# Movimiento de stock tal y como se devuelve tras el ajuste.
# ----------------------------------------------------------------------------
class MovimientoStockResponse(BaseModel):
    id: int
    producto_id: int
    tipo: str
    cantidad: int
    stock_anterior: int      # Stock antes del movimiento.
    stock_resultante: int    # Stock después del movimiento.
    motivo: str
    creado_en: datetime


# ----------------------------------------------------------------------------
# ProductoResponse
# Producto completo: campos de ProductoBase + identificador y fechas.
# ----------------------------------------------------------------------------
class ProductoResponse(ProductoBase):
    id: int
    creado_en: datetime
    actualizado_en: datetime


# ----------------------------------------------------------------------------
# ProductosPaginados
# Envoltorio de la lista con los metadatos de paginación que usa el frontend
# para mostrar "página X de Y".
# ----------------------------------------------------------------------------
class ProductosPaginados(BaseModel):
    items: list[ProductoResponse]
    total: int       # Total de productos que coinciden.
    page: int        # Página actual.
    per_page: int    # Elementos por página.
    total_pages: int # Número total de páginas.
