from pydantic import BaseModel
from typing import Optional


class HoyStats(BaseModel):
    total_ventas: int
    monto_total: float
    ticket_promedio: float


class DiaSemana(BaseModel):
    fecha: str
    total: float


class ProductoBajoStock(BaseModel):
    id: int
    nombre: str
    codigo_barras: Optional[str] = ""
    stock_actual: int
    stock_minimo: int


class UltimaVenta(BaseModel):
    id: int
    total: float
    fecha_hora: str
    usuario_nombre: str


class TopProducto(BaseModel):
    producto_id: int
    nombre: str
    total_vendido: int


class DashboardResponse(BaseModel):
    hoy: HoyStats
    semana: list[DiaSemana]
    productos_bajo_stock: list[ProductoBajoStock]
    ultimas_ventas: list[UltimaVenta]
    top_productos: list[TopProducto]
