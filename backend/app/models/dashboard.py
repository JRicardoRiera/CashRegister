# ============================================================================
# models/dashboard.py - Modelos Pydantic del panel de administración
# ----------------------------------------------------------------------------
# Esquemas de respuesta para el endpoint /admin/dashboard. Cada sección del
# panel tiene su propio modelo y DashboardResponse los agrupa todos:
#   - HoyStats: métricas del día (ventas, monto, ticket promedio).
#   - DiaSemana: total vendido en un día concreto.
#   - ProductoBajoStock: producto que necesita reposición.
#   - UltimaVenta: venta reciente para el historial.
#   - TopProducto: producto más vendido.
# ============================================================================

from pydantic import BaseModel
from typing import Optional


# ----------------------------------------------------------------------------
# HoyStats
# Resumen del día de hoy en la caja.
# ----------------------------------------------------------------------------
class HoyStats(BaseModel):
    total_ventas: int      # Número de tickets emitidos hoy.
    monto_total: float     # Dinero total vendido hoy.
    ticket_promedio: float # Promedio por ticket (monto / ventas).


# ----------------------------------------------------------------------------
# DiaSemana
# Un punto de la serie de los últimos 7 días (para la gráfica del panel).
# ----------------------------------------------------------------------------
class DiaSemana(BaseModel):
    fecha: str   # Fecha del día (formato ISO, YYYY-MM-DD).
    total: float # Total vendido ese día.


# ----------------------------------------------------------------------------
# ProductoBajoStock
# Producto con stock en o por debajo del mínimo configurado.
# ----------------------------------------------------------------------------
class ProductoBajoStock(BaseModel):
    id: int
    nombre: str
    codigo_barras: Optional[str] = ""
    stock_actual: int  # Unidades que quedan.
    stock_minimo: int  # Umbral de reposición.


# ----------------------------------------------------------------------------
# UltimaVenta
# Una de las últimas ventas mostradas en el panel.
# ----------------------------------------------------------------------------
class UltimaVenta(BaseModel):
    id: int
    total: float
    fecha_hora: str        # Momento de la venta (ISO).
    usuario_nombre: str    # Cajero que la atendió.


# ----------------------------------------------------------------------------
# TopProducto
# Uno de los productos más vendidos (por unidades).
# ----------------------------------------------------------------------------
class TopProducto(BaseModel):
    producto_id: int
    nombre: str
    total_vendido: int  # Unidades totales vendidas.


# ----------------------------------------------------------------------------
# DashboardResponse
# Respuesta completa del dashboard: agrupa las cinco secciones anteriores.
# ----------------------------------------------------------------------------
class DashboardResponse(BaseModel):
    hoy: HoyStats
    semana: list[DiaSemana]                       # Serie de 7 días.
    productos_bajo_stock: list[ProductoBajoStock]
    ultimas_ventas: list[UltimaVenta]
    top_productos: list[TopProducto]              # Top 5.
