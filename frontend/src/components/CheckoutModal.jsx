import { useState } from 'react'
import useCartStore from '../store/cartStore'
import { procesarVenta } from '../lib/api'
import Ticket from './Ticket'

const METODOS = [
  { id: 'efectivo', label: 'Efectivo', icon: 'cash' },
  { id: 'tarjeta', label: 'Tarjeta', icon: 'card' },
  { id: 'transferencia', label: 'Transferencia', icon: 'transfer' },
]

function MetodoIcon({ type }) {
  if (type === 'cash') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    )
  }
  if (type === 'card') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M2 8h20" />
      <path d="M8 2v20" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b8f2b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

export default function CheckoutModal({ onClose }) {
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total)
  const clear = useCartStore((s) => s.clear)

  const [metodo, setMetodo] = useState('efectivo')
  const [montoRecibido, setMontoRecibido] = useState(total.toFixed(2))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ventaResult, setVentaResult] = useState(null)
  const [showTicket, setShowTicket] = useState(false)

  const cambio = Math.max(0, parseFloat(montoRecibido || 0) - total)

  async function handleCobrar() {
    if (metodo === 'efectivo' && parseFloat(montoRecibido) < total) {
      setError('El monto recibido es insuficiente')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const body = {
        items: items.map((i) => ({
          producto_id: i.id,
          cantidad: i.cantidad,
        })),
        metodo_pago: metodo,
        monto_recibido: metodo === 'efectivo' ? parseFloat(montoRecibido) : total,
      }

      const venta = await procesarVenta(body)
      setVentaResult(venta)
      clear()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (showTicket && ventaResult) {
    return <Ticket venta={ventaResult} onClose={() => setShowTicket(false)} />
  }

  if (ventaResult) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-xs text-center">
          <CheckIcon />
          <h2 className="text-2xl font-bold text-[#b8f2b8] mt-4 mb-1 font-[family-name:var(--font-mono)]">Venta completada</h2>
          <p className="text-[#6b6460] text-sm mb-1">Folio <span className="font-[family-name:var(--font-mono)] text-[#e8e3dd]">#{ventaResult.id}</span></p>
          <p className="text-3xl font-bold text-[#b8f2b8] mb-6 font-[family-name:var(--font-mono)] tabular-nums">
            ${Number(ventaResult.total).toFixed(2)}
          </p>
          <button onClick={() => setShowTicket(true)}
            className="w-full bg-[#2a2726] text-[#e8e3dd] py-3 rounded-lg font-bold hover:bg-[#3a3634] transition-colors mb-2 text-sm">
            Ver ticket
          </button>
          <button onClick={onClose}
            className="w-full bg-[#b8f2b8] text-[#131212] py-3 rounded-lg font-bold hover:bg-[#a0e0a0] transition-colors">
            Nueva venta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm" style={{ background: '#1a1817' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2726]">
          <h2 className="font-semibold text-[#e8e3dd] text-sm uppercase tracking-wider">Cobrar</h2>
          <button onClick={onClose} className="text-[#6b6460] hover:text-[#e8e3dd] transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div className="text-center">
            <p className="text-xs text-[#6b6460] mb-1 uppercase tracking-wider">Total a cobrar</p>
            <div className="register-display inline-block">
              <p className="text-3xl font-bold text-[#b8f2b8] font-[family-name:var(--font-mono)] tabular-nums">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[#6b6460] mb-2.5 uppercase tracking-wider">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMetodo(m.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border-2 transition-all ${
                    metodo === m.id
                      ? 'border-[#b8f2b8] text-[#b8f2b8]'
                      : 'border-[#2a2726] text-[#6b6460] hover:border-[#4a4644]'
                  }`}
                  style={metodo === m.id ? { background: '#1f3a1f' } : {}}
                >
                  <MetodoIcon type={m.icon} />
                  <span className="text-[11px] font-semibold">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {metodo === 'efectivo' && (
            <div>
              <label className="text-xs font-medium text-[#6b6460] mb-2 block uppercase tracking-wider">
                Monto recibido
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6460] text-lg font-bold font-[family-name:var(--font-mono)]">$</span>
                <input
                  type="number"
                  step="0.01"
                  min={total}
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 text-xl font-bold tabular-nums rounded-lg font-[family-name:var(--font-mono)] focus:outline-none"
                  style={{ background: '#0f0f0f', color: '#b8f2b8', border: '2px solid #2a2726' }}
                  autoFocus
                />
              </div>
              {cambio > 0 && (
                <div className="mt-3 flex justify-between items-center px-4 py-3 rounded-lg" style={{ background: '#1f3a1f' }}>
                  <span className="text-sm font-medium text-[#b8f2b8]">Cambio</span>
                  <span className="text-xl font-bold text-[#b8f2b8] font-[family-name:var(--font-mono)] tabular-nums">
                    ${cambio.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-sm px-4 py-3 rounded-lg font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[#2a2726]">
          <button
            onClick={handleCobrar}
            disabled={loading}
            className="w-full bg-[#b8f2b8] hover:bg-[#a0e0a0] active:bg-[#88cc88] disabled:bg-[#2a3a2a] disabled:text-[#6b6460] text-[#131212] py-3 rounded-lg font-bold text-base transition-colors tracking-wide"
          >
            {loading ? 'Procesando...' : `Cobrar $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
