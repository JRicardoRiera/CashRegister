import { useState, useEffect } from 'react'
import { dashboardApi } from '../../lib/adminApi'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    dashboardApi.get().then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="text-sm px-4 py-3 rounded-lg font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#b8f2b8] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const maxSemana = Math.max(...data.semana.map((d) => d.total), 1)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[#e8e3dd] tracking-wide">Dashboard</h2>
        <p className="text-sm text-[#6b6460] mt-0.5">Resumen del día y la semana</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Ventas hoy" value={data.hoy.total_ventas} suffix="" />
        <MetricCard label="Total hoy" value={data.hoy.monto_total} prefix="$" />
        <MetricCard label="Ticket prom." value={data.hoy.ticket_promedio} prefix="$" />
      </div>

      <div className="p-4 rounded-lg" style={{ background: '#222222' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-[#6b6460] uppercase tracking-widest">7 días</span>
          <span className="text-xs text-[#6b6460] font-[family-name:var(--font-mono)]">
            ${data.semana.reduce((a, d) => a + d.total, 0).toFixed(2)}
          </span>
        </div>
        <div className="space-y-2">
          {data.semana.map((d, i) => {
            const fecha = new Date(d.fecha + 'T12:00:00')
            const diaIdx = fecha.getDay()
            const pct = maxSemana > 0 ? (d.total / maxSemana) * 100 : 0
            const esHoy = i === data.semana.length - 1
            return (
              <div key={d.fecha} className="flex items-center gap-3 text-sm">
                <span className={`w-8 text-xs font-medium ${esHoy ? 'text-[#b8f2b8]' : 'text-[#6b6460]'}`}>
                  {DIAS[diaIdx]}
                </span>
                <div className="flex-1 h-5 rounded-sm relative overflow-hidden" style={{ background: '#2a2726' }}>
                  <div
                    className={`h-full rounded-sm transition-all duration-500 ${esHoy ? 'animate-pulse' : ''}`}
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      background: esHoy ? '#b8f2b8' : '#3a5040',
                    }}
                  />
                </div>
                <span className={`w-24 text-right font-[family-name:var(--font-mono)] text-xs tabular-nums ${esHoy ? 'text-[#b8f2b8] font-semibold' : 'text-[#8a8380]'}`}>
                  ${d.total.toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg" style={{ background: '#222222' }}>
          <h3 className="text-xs font-semibold text-[#6b6460] uppercase tracking-widest mb-3">
            Bajo stock
            {data.productos_bajo_stock.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded" style={{ background: '#2d1515', color: '#ff6b6b' }}>
                {data.productos_bajo_stock.length}
              </span>
            )}
          </h3>
          {data.productos_bajo_stock.length === 0 ? (
            <p className="text-sm text-[#6b6460] py-4 text-center">Sin productos bajos de stock</p>
          ) : (
            <div className="space-y-1.5">
              {data.productos_bajo_stock.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-[#2a2726] last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#e8e3dd] truncate">{p.nombre}</p>
                    <p className="text-[10px] text-[#6b6460] font-[family-name:var(--font-mono)]">{p.codigo_barras}</p>
                  </div>
                  <span className="text-sm font-bold font-[family-name:var(--font-mono)] tabular-nums ml-3" style={{ color: p.stock_actual === 0 ? '#ff6b6b' : '#e8a040' }}>
                    {p.stock_actual}
                    <span className="text-[#6b6460] font-normal text-xs"> / {p.stock_minimo}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 rounded-lg" style={{ background: '#222222' }}>
          <h3 className="text-xs font-semibold text-[#6b6460] uppercase tracking-widest mb-3">Top 5 más vendidos</h3>
          {data.top_productos.length === 0 ? (
            <p className="text-sm text-[#6b6460] py-4 text-center">Sin datos de ventas</p>
          ) : (
            <div className="space-y-2">
              {data.top_productos.map((p, i) => {
                const maxV = Math.max(...data.top_productos.map((x) => x.total_vendido), 1)
                const pct = (p.total_vendido / maxV) * 100
                return (
                  <div key={p.producto_id} className="flex items-center gap-2">
                    <span className={`w-4 text-xs font-bold ${i === 0 ? 'text-[#b8f2b8]' : i < 3 ? 'text-[#e8e3dd]' : 'text-[#6b6460]'}`}>
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#e8e3dd] truncate leading-tight">{p.nombre}</p>
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
                    <span className="text-sm text-[#e8e3dd] truncate">{v.usuario_nombre}</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
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

function MetricCard({ label, value, prefix = '', suffix = '' }) {
  const display = typeof value === 'number' ? value.toFixed(2) : value
  return (
    <div className="p-4 rounded-lg" style={{ background: '#222222' }}>
      <p className="text-xs text-[#6b6460] uppercase tracking-wider mb-2">{label}</p>
      <div className="register-display inline-block">
        <span className="text-xl font-bold text-[#b8f2b8] font-[family-name:var(--font-mono)] tabular-nums tracking-tight">
          {prefix}{display}{suffix}
        </span>
      </div>
    </div>
  )
}
