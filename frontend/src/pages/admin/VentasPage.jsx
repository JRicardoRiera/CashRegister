import { useState, useEffect } from 'react'
import { ventasApi } from '../../lib/adminApi'
import Ticket from '../../components/Ticket'

export default function VentasPage() {
  const [ventas, setVentas] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState(null)
  const [ticketVenta, setTicketVenta] = useState(null)
  const [ticketLoading, setTicketLoading] = useState(false)

  function load() {
    ventasApi.list().then(setVentas).catch((e) => setError(e.message))
  }

  useEffect(load, [])

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
      <h2 className="text-lg font-bold text-[#e8e3dd] mb-1">Historial de Ventas</h2>
      <p className="text-sm text-[#6b6460] mb-6">{ventas.length} registros</p>

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
            <div className="flex justify-between"><span>IVA (16%)</span><span className="font-[family-name:var(--font-mono)]">${Number(selected.impuestos).toFixed(2)}</span></div>
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
