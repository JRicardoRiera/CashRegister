// ============================================================================
// MisVentasPage.jsx (cajero) - Historial de ventas del cajero
// ----------------------------------------------------------------------------
// Muestra las ventas del mes actual en una tabla con folio, fecha, total,
// método de pago y acciones. Al pulsar "Ticket" carga el detalle completo de
// la venta y abre el componente Ticket para imprimir; al pulsar "Detalle"
// despliega el desglose (líneas y totales) en la misma página.
// ============================================================================

import { useState, useEffect } from 'react'
import CajeroLayout from '../../components/CajeroLayout'
import { ventasApi } from '../../lib/adminApi'
import Ticket from '../../components/Ticket'

export default function MisVentasPage() {
  // Lista de ventas del mes.
  const [ventas, setVentas] = useState([])
  // Venta seleccionada para mostrar su detalle expandido.
  const [selected, setSelected] = useState(null)
  // Mensaje de error (si la carga falla).
  const [error, setError] = useState(null)
  // Venta cargada para imprimir (abre el Ticket).
  const [ticketVenta, setTicketVenta] = useState(null)
  // Indica si se está descargando el detalle de un ticket.
  const [ticketLoading, setTicketLoading] = useState(false)

  // Al montar, cargamos las ventas del mes en curso.
  useEffect(() => {
    const hoy = new Date()
    // Primer día del mes actual. toISOString().slice(0,10) devuelve "AAAA-MM-DD"
    // con la zona horaria UTC, formato que espera el backend como fecha.
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10)
    // Pedimos las ventas desde el día 1 del mes; los errores se muestran.
    ventasApi.list(inicio).then(setVentas).catch((e) => setError(e.message))
  }, [])

  // -------------------------------------------------------------------------
  // openTicket(id)
  // Descarga el detalle completo de una venta y abre el ticket imprimible.
  // -------------------------------------------------------------------------
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
    <CajeroLayout>
      <div className="h-full overflow-y-auto" style={{ background: '#131212' }}>
        <div className="max-w-5xl mx-auto p-6">
          {/* Cabecera con el número de registros del mes */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#e8e3dd]">Mis Ventas</h2>
            <span className="text-sm text-[#6b6460] font-[family-name:var(--font-mono)]">{ventas.length} registros (este mes)</span>
          </div>

          {/* Mensaje de error, si lo hay */}
          {error && (
            <div className="text-sm px-4 py-3 rounded-lg mb-4 font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
              {error}
            </div>
          )}

          {/* Tabla de ventas */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2726] text-[#6b6460] text-xs uppercase tracking-wider">
                  <th className="text-left py-2">Folio</th>
                  <th className="text-left py-2">Fecha</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-left py-2">Pago</th>
                  <th className="text-right py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id} className="border-b border-[#2a2726] hover:bg-[#1a1817] text-[#e8e3dd]">
                    {/* Folio de la venta */}
                    <td className="py-2 font-[family-name:var(--font-mono)] text-xs">#{v.id}</td>
                    {/* Fecha formateada para México (dd/mm/aaaa hh:mm) */}
                    <td className="py-2 text-xs">{new Date(v.fecha_hora).toLocaleString('es-MX')}</td>
                    {/* Total de la venta en verde */}
                    <td className="py-2 text-right font-[family-name:var(--font-mono)] font-semibold text-[#b8f2b8]">${Number(v.total).toFixed(2)}</td>
                    {/* Método de pago como etiqueta; capitalize pone mayúscula inicial */}
                    <td className="py-2"><span className="capitalize text-xs px-2 py-0.5 rounded-full" style={{ background: '#1f3a1f', color: '#b8f2b8' }}>{v.metodo_pago}</span></td>
                    {/* Botones de acción: ticket (ámbar) y detalle expandible */}
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={() => openTicket(v.id)} className="text-[#e8a040] hover:text-[#f0b850] mr-2 text-xs">Ticket</button>
                      {/* Si ya está seleccionada, el botón pasa a "Cerrar" */}
                      <button onClick={() => setSelected(selected?.id === v.id ? null : v)} className="text-[#6b6460] hover:text-[#e8e3dd] text-xs">
                        {selected?.id === v.id ? 'Cerrar' : 'Detalle'}
                      </button>
                    </td>
                  </tr>
                ))}
                {/* Mensaje si no hay ventas en el mes */}
                {ventas.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-8 text-[#6b6460] text-sm">Sin ventas este mes</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Panel de detalle expandido de la venta seleccionada */}
          {selected && (
            <div className="mt-4 p-4 rounded-lg" style={{ background: '#1a1817' }}>
              <h3 className="text-sm font-bold text-[#e8e3dd] mb-3">Detalle #{selected.id}</h3>
              {/* Líneas de la venta */}
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
                  {/* Cada línea: producto, cantidad, precio e importe */}
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
              {/* Resumen: subtotal, IVA y total */}
              <div className="border-t border-[#2a2726] mt-2 pt-2 text-xs text-[#6b6460] space-y-0.5">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-[family-name:var(--font-mono)]">${Number(selected.subtotal).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>IVA (15%)</span><span className="font-[family-name:var(--font-mono)]">${Number(selected.impuestos).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-[#b8f2b8]"><span>Total</span><span className="font-[family-name:var(--font-mono)]">${Number(selected.total).toFixed(2)}</span></div>
              </div>
            </div>
          )}

          {/* Spinner de carga del ticket (capa superpuesta) */}
          {ticketLoading && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
              <div className="w-5 h-5 border-2 border-[#b8f2b8] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Ticket imprimible, montado solo cuando hay venta cargada */}
          {ticketVenta && <Ticket venta={ticketVenta} onClose={() => setTicketVenta(null)} />}
        </div>
      </div>
    </CajeroLayout>
  )
}
