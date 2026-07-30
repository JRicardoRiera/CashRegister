import { useState, useEffect, useCallback } from 'react'
import { ventasApi } from '../../lib/adminApi'
import Ticket from '../../components/Ticket'

function today() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}
function weekAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}
function monthAgo() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

const RAPIDOS = [
  { label: 'Hoy', desde: today, hasta: today },
  { label: '7 días', desde: weekAgo, hasta: today },
  { label: '30 días', desde: monthAgo, hasta: today },
]

export default function VentasPage() {
  const [ventas, setVentas] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)
  const [ticketVenta, setTicketVenta] = useState(null)
  const [ticketLoading, setTicketLoading] = useState(false)
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const load = useCallback(() => {
    ventasApi.list(desde || undefined, hasta || undefined).then(setVentas).catch((e) => setError(e.message))
  }, [desde, hasta])

  useEffect(load, [load])

  function setRango(d, h) {
    setDesde(d)
    setHasta(h)
  }

  function activo(d, h) {
    return desde === d && hasta === h
  }

  async function openTicket(id) {
    setTicketLoading(true)
    try {
      const venta = await ventasApi.get(id)
      setTicketVenta(venta)
    } catch (e) {
      setError(e.message)
    } finally {
      setTicketLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-[#e8e3dd]">Historial de Ventas</h2>
        <span className="text-sm text-[#6b6460] font-[family-name:var(--font-mono)]">{ventas.length} registros</span>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {RAPIDOS.map((r) => (
          <button key={r.label} onClick={() => setRango(r.desde(), r.hasta())}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activo(r.desde(), r.hasta()) ? 'border-[#b8f2b8] text-[#b8f2b8]' : 'border-[#2a2726] text-[#6b6460] hover:border-[#4a4644]'
            }`}
            style={activo(r.desde(), r.hasta()) ? { background: '#1f3a1f' } : {}}
          >
            {r.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-2">
          <input type="date" value={desde} onChange={(e) => setRango(e.target.value, hasta)}
            className="px-2 py-1.5 text-xs rounded-lg focus:outline-none"
            style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
          <span className="text-[#6b6460] text-xs">→</span>
          <input type="date" value={hasta} onChange={(e) => setRango(desde, e.target.value)}
            className="px-2 py-1.5 text-xs rounded-lg focus:outline-none"
            style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
        </div>
        {(desde || hasta) && (
          <button onClick={() => setRango('', '')} className="text-[#6b6460] hover:text-[#e8e3dd] text-xs ml-1">
            Limpiar
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm px-4 py-3 rounded-lg mb-4 font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2726] text-[#6b6460] text-xs uppercase tracking-wider">
              <th className="text-left py-2">Folio</th>
              <th className="text-left py-2">Fecha</th>
              <th className="text-left py-2">Cajero</th>
              <th className="text-right py-2">Total</th>
              <th className="text-left py-2">Pago</th>
              <th className="text-right py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id} className="border-b border-[#2a2726] hover:bg-[#1a1817] text-[#e8e3dd]">
                <td className="py-2 font-[family-name:var(--font-mono)] text-xs">#{v.id}</td>
                <td className="py-2 text-xs">{new Date(v.fecha_hora).toLocaleString('es-MX')}</td>
                <td className="py-2 text-sm">{v.usuario_nombre}</td>
                <td className="py-2 text-right font-[family-name:var(--font-mono)] font-semibold text-[#b8f2b8]">${Number(v.total).toFixed(2)}</td>
                <td className="py-2"><span className="capitalize text-xs px-2 py-0.5 rounded-full" style={{ background: '#1f3a1f', color: '#b8f2b8' }}>{v.metodo_pago}</span></td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button onClick={() => openTicket(v.id)} className="text-[#e8a040] hover:text-[#f0b850] mr-2 text-xs">Ticket</button>
                  <button onClick={() => setSelected(selected?.id === v.id ? null : v)} className="text-[#6b6460] hover:text-[#e8e3dd] text-xs">
                    {selected?.id === v.id ? 'Cerrar' : 'Detalle'}
                  </button>
                </td>
              </tr>
            ))}
            {ventas.length === 0 && (
              <tr><td colSpan="6" className="text-center py-8 text-[#6b6460] text-sm">Sin ventas registradas</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="mt-4 p-4 rounded-lg" style={{ background: '#1a1817' }}>
          <h3 className="text-sm font-bold text-[#e8e3dd] mb-3">Detalle #{selected.id}</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2a2726] text-[#6b6460]">
                <th className="text-left py-1">Producto</th>
                <th className="text-right py-1">Cant</th>
                <th className="text-right py-1">Precio</th>
                <th className="text-right py-1">Importe</th>
              </tr>
            </thead>
            <tbody>
              {selected.detalles?.map((d, i) => (
                <tr key={i} className="text-[#e8e3dd]">
                  <td className="py-1">{d.producto_nombre}</td>
                  <td className="py-1 text-right font-[family-name:var(--font-mono)]">{d.cantidad}</td>
                  <td className="py-1 text-right font-[family-name:var(--font-mono)]">${Number(d.precio_unitario).toFixed(2)}</td>
                  <td className="py-1 text-right font-[family-name:var(--font-mono)]">${(d.cantidad * Number(d.precio_unitario)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-[#2a2726] mt-2 pt-2 text-xs text-[#6b6460] space-y-0.5">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-[family-name:var(--font-mono)]">${Number(selected.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>IVA (15%)</span><span className="font-[family-name:var(--font-mono)]">${Number(selected.impuestos).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-[#b8f2b8]"><span>Total</span><span className="font-[family-name:var(--font-mono)]">${Number(selected.total).toFixed(2)}</span></div>
          </div>
        </div>
      )}

      {ticketLoading && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="w-5 h-5 border-2 border-[#b8f2b8] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {ticketVenta && <Ticket venta={ticketVenta} onClose={() => setTicketVenta(null)} />}
    </div>
  )
}
