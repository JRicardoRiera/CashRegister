// ============================================================================
// DashboardPage.jsx (admin) - Resumen de métricas del negocio
// ----------------------------------------------------------------------------
// Página de inicio del panel de administración. Muestra tres bloques de
// información que llegan del backend (endpoint /api/v1/admin/dashboard):
//   1. Métricas del día: ventas, monto total y ticket promedio.
//   2. Gráfico de barras con el total de los últimos 7 días.
//   3. Tres listas: productos con bajo stock, top 5 de más vendidos y
//      las últimas ventas realizadas.
// ============================================================================

import { useState, useEffect } from 'react'
// API del dashboard.
import { dashboardApi } from '../../lib/adminApi'

// Nombres cortos de los días de la semana (índice 0 = domingo, según
// el resultado de Date.getDay()).
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function DashboardPage() {
  // Datos del dashboard (null mientras carga).
  const [data, setData] = useState(null)
  // Mensaje de error si falla la carga.
  const [error, setError] = useState(null)

  // Al montar, pedimos los datos del dashboard.
  useEffect(() => {
    dashboardApi.get().then(setData).catch((e) => setError(e.message))
  }, [])

  // Si hay error, mostramos la caja roja de error y salimos.
  if (error) {
    return (
      <div className="text-sm px-4 py-3 rounded-lg font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
        {error}
      </div>
    )
  }

  // Mientras no llegan los datos, mostramos un spinner.
  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#b8f2b8] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Valor máximo del gráfico semanal. Se usa como referencia para calcular
  // el ancho porcentual de cada barra. Math.max(..., 1) evita dividir
  // entre 0 si no hubo ventas en toda la semana.
  const maxSemana = Math.max(...data.semana.map((d) => d.total), 1)

  return (
    <div className="space-y-6">
      {/* Cabecera de la página */}
      <div>
        <h2 className="text-lg font-bold text-[#e8e3dd] tracking-wide">Dashboard</h2>
        <p className="text-sm text-[#6b6460] mt-0.5">Resumen del día y la semana</p>
      </div>

      {/* Tarjetas con las métricas de hoy */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Ventas hoy" value={data.hoy.total_ventas} suffix="" />
        <MetricCard label="Total hoy" value={data.hoy.monto_total} prefix="$" />
        <MetricCard label="Ticket prom." value={data.hoy.ticket_promedio} prefix="$" />
      </div>

      {/* Gráfico de barras de los últimos 7 días */}
      <div className="p-4 rounded-lg" style={{ background: '#222222' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-[#6b6460] uppercase tracking-widest">7 días</span>
          {/* Total de la semana (suma de todos los días con reduce) */}
          <span className="text-xs text-[#6b6460] font-[family-name:var(--font-mono)]">
            ${data.semana.reduce((a, d) => a + d.total, 0).toFixed(2)}
          </span>
        </div>
        {/* Una fila por cada día */}
        <div className="space-y-2">
          {data.semana.map((d, i) => {
            // La fecha llega como "AAAA-MM-DD"; añadimos 'T12:00:00' para
            // evitar que JavaScript la interprete en UTC y la convierta al
            // día anterior en zonas horarias negativas.
            const fecha = new Date(d.fecha + 'T12:00:00')
            const diaIdx = fecha.getDay()          // Índice del día (0-6)
            const pct = maxSemana > 0 ? (d.total / maxSemana) * 100 : 0  // % de la barra
            const esHoy = i === data.semana.length - 1  // Última entrada = hoy
            return (
              <div key={d.fecha} className="flex items-center gap-3 text-sm">
                {/* Nombre del día (el de hoy en verde) */}
                <span className={`w-8 text-xs font-medium ${esHoy ? 'text-[#b8f2b8]' : 'text-[#6b6460]'}`}>
                  {DIAS[diaIdx]}
                </span>
                {/* Barra: ancho proporcional al total del día */}
                <div className="flex-1 h-5 rounded-sm relative overflow-hidden" style={{ background: '#2a2726' }}>
                  <div
                    // La barra de hoy "pulsa" (animate-pulse)
                    className={`h-full rounded-sm transition-all duration-500 ${esHoy ? 'animate-pulse' : ''}`}
                    style={{
                      // Mínimo del 2% para que se vea aunque haya venta pequeña
                      width: `${Math.max(pct, 2)}%`,
                      background: esHoy ? '#b8f2b8' : '#3a5040',
                    }}
                  />
                </div>
                {/* Total del día en moneda */}
                <span className={`w-24 text-right font-[family-name:var(--font-mono)] text-xs tabular-nums ${esHoy ? 'text-[#b8f2b8] font-semibold' : 'text-[#8a8380]'}`}>
                  ${d.total.toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tres tarjetas de información auxiliar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tarjeta 1: productos con bajo stock */}
        <div className="p-4 rounded-lg" style={{ background: '#222222' }}>
          <h3 className="text-xs font-semibold text-[#6b6460] uppercase tracking-widest mb-3">
            Bajo stock
            {/* Contador rojo con el número de productos afectados */}
            {data.productos_bajo_stock.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded" style={{ background: '#2d1515', color: '#ff6b6b' }}>
                {data.productos_bajo_stock.length}
              </span>
            )}
          </h3>
          {data.productos_bajo_stock.length === 0 ? (
            // Sin productos bajo stock
            <p className="text-sm text-[#6b6460] py-4 text-center">Sin productos bajos de stock</p>
          ) : (
            <div className="space-y-1.5">
              {data.productos_bajo_stock.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-[#2a2726] last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#e8e3dd] truncate">{p.nombre}</p>
                    <p className="text-[10px] text-[#6b6460] font-[family-name:var(--font-mono)]">{p.codigo_barras}</p>
                  </div>
                  {/* Stock actual; rojo si es 0, ámbar si es bajo */}
                  <span className="text-sm font-bold font-[family-name:var(--font-mono)] tabular-nums ml-3" style={{ color: p.stock_actual === 0 ? '#ff6b6b' : '#e8a040' }}>
                    {p.stock_actual}
                    <span className="text-[#6b6460] font-normal text-xs"> / {p.stock_minimo}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tarjeta 2: top 5 productos más vendidos */}
        <div className="p-4 rounded-lg" style={{ background: '#222222' }}>
          <h3 className="text-xs font-semibold text-[#6b6460] uppercase tracking-widest mb-3">Top 5 más vendidos</h3>
          {data.top_productos.length === 0 ? (
            <p className="text-sm text-[#6b6460] py-4 text-center">Sin datos de ventas</p>
          ) : (
            <div className="space-y-2">
              {data.top_productos.map((p, i) => {
                // Referencia máxima para dimensionar las barras
                const maxV = Math.max(...data.top_productos.map((x) => x.total_vendido), 1)
                const pct = (p.total_vendido / maxV) * 100
                return (
                  <div key={p.producto_id} className="flex items-center gap-2">
                    {/* Posición: el 1 en verde, los del top 3 más claros */}
                    <span className={`w-4 text-xs font-bold ${i === 0 ? 'text-[#b8f2b8]' : i < 3 ? 'text-[#e8e3dd]' : 'text-[#6b6460]'}`}>
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#e8e3dd] truncate leading-tight">{p.nombre}</p>
                      {/* Barra de proporción con el número de unidades vendidas */}
                      <div className="h-2 rounded-sm mt-0.5 overflow-hidden" style={{ background: '#2a2726' }}>
                        <div className="h-full rounded-sm transition-all" style={{ width: `${Math.max(pct, 4)}%`, background: i === 0 ? '#b8f2b8' : i < 3 ? '#4a7a50' : '#3a5040' }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold font-[family-name:var(--font-mono)] tabular-nums text-[#e8e3dd]">{p.total_vendido}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tarjeta 3: últimas ventas registradas */}
        <div className="p-4 rounded-lg" style={{ background: '#222222' }}>
          <h3 className="text-xs font-semibold text-[#6b6460] uppercase tracking-widest mb-3">Últimas ventas</h3>
          {data.ultimas_ventas.length === 0 ? (
            <p className="text-sm text-[#6b6460] py-4 text-center">Sin ventas registradas</p>
          ) : (
            <div className="space-y-1.5">
              {data.ultimas_ventas.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-[#2a2726] last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-[#6b6460] font-[family-name:var(--font-mono)]">#{v.id}</span>
                    {/* Nombre del cajero que realizó la venta */}
                    <span className="text-sm text-[#e8e3dd] truncate">{v.usuario_nombre}</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    {/* Hora en formato corto (hora:minuto) */}
                    <span className="text-xs text-[#6b6460]">{new Date(v.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-sm font-semibold font-[family-name:var(--font-mono)] text-[#b8f2b8] tabular-nums">
                      ${Number(v.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// MetricCard({ label, value, prefix, suffix })
// Tarjeta simple para mostrar una métrica numérica destacada.
//   - prefix/suffix: texto antes/después del valor (p. ej. el símbolo $).
// ---------------------------------------------------------------------------
function MetricCard({ label, value, prefix = '', suffix = '' }) {
  // Si el valor es numérico lo formateamos con 2 decimales.
  const display = typeof value === 'number' ? value.toFixed(2) : value
  return (
    <div className="p-4 rounded-lg" style={{ background: '#222222' }}>
      <p className="text-xs text-[#6b6460] uppercase tracking-wider mb-2">{label}</p>
      {/* Estilo "pantalla" de la caja registradora para el valor */}
      <div className="register-display inline-block">
        <span className="text-xl font-bold text-[#b8f2b8] font-[family-name:var(--font-mono)] tabular-nums tracking-tight">
          {prefix}{display}{suffix}
        </span>
      </div>
    </div>
  )
}
