from pydantic import BaseModel, Field
from typing import Optional
from decimal import Decimal
from datetime import datetime


class ProductoBase(BaseModel):
    codigo_barras: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=150)
    descripcion: Optional[str] = None
    categoria_id: Optional[int] = None
    precio_compra: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)
    precio_venta: Decimal = Field(default=Decimal("0.00"), ge=0, max_digits=12, decimal_places=2)
    stock_actual: int = Field(default=0, ge=0)
    stock_minimo: int = Field(default=5, ge=0)
    activo: bool = True


class ProductoCreate(ProductoBase):
    pass


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


class AjusteStockRequest(BaseModel):
    tipo: str  # 'entrada' | 'salida' | 'ajuste'
    cantidad: int
    motivo: str


class MovimientoStockResponse(BaseModel):
    id: int
    producto_id: int
    tipo: str
    cantidad: int
    stock_anterior: int
    stock_resultante: int
    motivo: str
    creado_en: datetime


class ProductoResponse(ProductoBase):
    id: int
    creado_en: datetime
    actualizado_en: datetime


class ProductosPaginados(BaseModel):
    items: list[ProductoResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
