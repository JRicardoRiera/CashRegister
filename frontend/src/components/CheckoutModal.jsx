// ============================================================================
// CheckoutModal.jsx - Modal de cobro de la venta
// ----------------------------------------------------------------------------
// Se abre al pulsar "Cobrar" en el panel del carrito. Permite al cajero:
//   1. Elegir el método de pago: efectivo, tarjeta o transferencia.
//   2. En efectivo, introducir el monto recibido y ver el cambio a devolver.
//   3. Confirmar la venta, que se envía al backend (quien descuenta stock
//      y registra la venta).
// Tras el éxito, muestra una pantalla de confirmación con el folio, el total
// y la opción de ver el ticket imprimible.
// ============================================================================

// Hooks de React para estado y efectos.
import { useState, useEffect } from 'react'
// Estado global del carrito y selector del total a pagar.
import useCartStore, { selectTotal } from '../store/cartStore'
// Función que envía la venta al backend.
import { procesarVenta } from '../lib/api'
// Componente que dibuja el ticket imprimible.
import Ticket from './Ticket'

// Métodos de pago disponibles. "icon" indica qué SVG dibujar.
const METODOS = [
  { id: 'efectivo', label: 'Efectivo', icon: 'cash' },
  { id: 'tarjeta', label: 'Tarjeta', icon: 'card' },
  { id: 'transferencia', label: 'Transferencia', icon: 'transfer' },
]

// ---------------------------------------------------------------------------
// MetodoIcon({ type })
// Pequeño componente que devuelve el icono SVG del método de pago indicado.
// Se dibuja con trazo "currentColor" para heredar el color del texto padre.
// ---------------------------------------------------------------------------
function MetodoIcon({ type }) {
  // Icono de billetes para efectivo.
  if (type === 'cash') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    )
  }
  // Icono de tarjeta bancaria.
  if (type === 'card') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    )
  }
  // Icono de transferencia (tarjeta con franja magnética).
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <path d="M2 8h20" />
      <path d="M8 2v20" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// CheckIcon()
// Icono de "check" grande que se muestra al confirmar la venta con éxito.
// ---------------------------------------------------------------------------
function CheckIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b8f2b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

// Componente principal. Recibe onClose para cerrar el modal.
export default function CheckoutModal({ onClose }) {
  // Total a pagar y acción de vaciar el carrito.
  const total = useCartStore(selectTotal)
  const clear = useCartStore((s) => s.clear)

  // Método de pago seleccionado (por defecto efectivo).
  const [metodo, setMetodo] = useState('efectivo')
  // Monto que entrega el cliente; por defecto el total exacto.
  const [montoRecibido, setMontoRecibido] = useState(total.toFixed(2))
  // Estado de carga durante el envío de la venta.
  const [loading, setLoading] = useState(false)
  // Mensaje de error (si la venta falla).
  const [error, setError] = useState(null)
  // Respuesta del backend tras procesar la venta (null si aún no hay).
  const [ventaResult, setVentaResult] = useState(null)
  // Controla si mostramos el ticket o la pantalla de confirmación.
  const [showTicket, setShowTicket] = useState(false)

  // Cambio a devolver: máximo de 0 y (monto recibido - total).
  // Math.max evita que el cambio sea negativo.
  const cambio = Math.max(0, parseFloat(montoRecibido || 0) - total)

  // Si el cliente elige efectivo y el monto introducido es menor que el
  // total, lo restablecemos al total (evita intentar cobrar de menos).
  useEffect(() => {
    if (metodo === 'efectivo' && Number(montoRecibido) < total) {
      setMontoRecibido(total.toFixed(2))
    }
  }, [total, metodo, montoRecibido])

  // -------------------------------------------------------------------------
  // handleCobrar()
  // Envía la venta al backend. Toma el estado del carrito directamente
  // (no la prop) para garantizar que usamos los datos más recientes.
  // -------------------------------------------------------------------------
  async function handleCobrar() {
    // Leemos el estado global del carrito en este instante.
    const state = useCartStore.getState()
    const currentTotal = selectTotal(state)
    const currentItems = state.items

    // Validación en efectivo: no podemos cobrar si el monto es insuficiente.
    if (metodo === 'efectivo' && parseFloat(montoRecibido) < currentTotal) {
      setError('El monto recibido es insuficiente')
      return
    }

    // Activamos el spinner y limpiamos errores previos.
    setLoading(true)
    setError(null)

    try {
      // Cuerpo de la petición que espera el backend.
      const body = {
        // Solo enviamos id y cantidad; el backend consulta el precio real.
        items: currentItems.map((i) => ({
          producto_id: i.id,
          cantidad: i.cantidad,
        })),
        metodo_pago: metodo,
        // En efectivo enviamos lo recibido; en tarjeta/transferencia se
        // cobra siempre el total exacto.
        monto_recibido: metodo === 'efectivo' ? parseFloat(montoRecibido) : currentTotal,
      }

      // Llamada al backend (crea la venta y descuenta el stock).
      const venta = await procesarVenta(body)
      // Guardamos el resultado para mostrar la pantalla de éxito.
      setVentaResult(venta)
      // Vaciamos el carrito: la venta ya está registrada.
      clear()
    } catch (err) {
      // Mostramos el mensaje de error (p. ej. stock insuficiente).
      setError(err.message)
    } finally {
      // Pase lo que pase, desactivamos el estado de carga.
      setLoading(false)
    }
  }

  // Si el usuario pulsó "Ver ticket", mostramos el ticket imprimible.
  if (showTicket && ventaResult) {
    return <Ticket venta={ventaResult} onClose={() => setShowTicket(false)} />
  }

  // Pantalla de éxito tras procesar la venta.
  if (ventaResult) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-xs text-center">
          <CheckIcon />
          <h2 className="text-2xl font-bold text-[#b8f2b8] mt-4 mb-1 font-[family-name:var(--font-mono)]">Venta completada</h2>
          {/* Folio de la venta tal como lo generó el backend */}
          <p className="text-[#6b6460] text-sm mb-1">Folio <span className="font-[family-name:var(--font-mono)] text-[#e8e3dd]">#{ventaResult.id}</span></p>
          {/* Total pagado, formateado a 2 decimales */}
          <p className="text-3xl font-bold text-[#b8f2b8] mb-6 font-[family-name:var(--font-mono)] tabular-nums">
            ${Number(ventaResult.total).toFixed(2)}
          </p>
          {/* Botón secundario: ver el ticket para imprimir */}
          <button onClick={() => setShowTicket(true)}
            className="w-full bg-[#2a2726] text-[#e8e3dd] py-3 rounded-lg font-bold hover:bg-[#3a3634] transition-colors mb-2 text-sm">
            Ver ticket
          </button>
          {/* Botón principal: cerrar y empezar una nueva venta */}
          <button onClick={onClose}
            className="w-full bg-[#b8f2b8] text-[#131212] py-3 rounded-lg font-bold hover:bg-[#a0e0a0] transition-colors">
            Nueva venta
          </button>
        </div>
      </div>
    )
  }

  // Vista principal: formulario de cobro.
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm" style={{ background: '#1a1817' }}>
        {/* Cabecera del modal con el botón de cerrar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2726]">
          <h2 className="font-semibold text-[#e8e3dd] text-sm uppercase tracking-wider">Cobrar</h2>
          <button onClick={onClose} className="text-[#6b6460] hover:text-[#e8e3dd] transition-colors">
            {/* Icono de "X" para cerrar */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Total a cobrar en grande */}
          <div className="text-center">
            <p className="text-xs text-[#6b6460] mb-1 uppercase tracking-wider">Total a cobrar</p>
            <div className="register-display inline-block">
              <p className="text-3xl font-bold text-[#b8f2b8] font-[family-name:var(--font-mono)] tabular-nums">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Selector de método de pago */}
          <div>
            <p className="text-xs font-medium text-[#6b6460] mb-2.5 uppercase tracking-wider">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {METODOS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMetodo(m.id)}
                  // El método seleccionado se resalta con borde y texto verdes
                  // y fondo verde oscuro; los demás quedan atenuados.
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

          {/* Campo de monto recibido, solo visible con pago en efectivo */}
          {metodo === 'efectivo' && (
            <div>
              <label className="text-xs font-medium text-[#6b6460] mb-2 block uppercase tracking-wider">
                Monto recibido
              </label>
              <div className="relative">
                {/* Símbolo de moneda superpuesto a la izquierda del input */}
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6b6460] text-lg font-bold font-[family-name:var(--font-mono)]">$</span>
                <input
                  type="number"
                  step="0.01"      // Permite céntimos
                  min={total}      // Evita cobrar menos del total
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 text-xl font-bold tabular-nums rounded-lg font-[family-name:var(--font-mono)] focus:outline-none"
                  style={{ background: '#0f0f0f', color: '#b8f2b8', border: '2px solid #2a2726' }}
                  autoFocus
                />
              </div>
              {/* Cambio a devolver; solo aparece si el monto supera el total */}
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

          {/* Mensaje de error si algo falla al cobrar */}
          {error && (
            <div className="text-sm px-4 py-3 rounded-lg font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
              {error}
            </div>
          )}
        </div>

        {/* Botón de confirmación del cobro */}
        <div className="px-5 py-4 border-t border-[#2a2726]">
          <button
            onClick={handleCobrar}
            disabled={loading}
            // Mientras carga se deshabilita y cambia el texto
            className="w-full bg-[#b8f2b8] hover:bg-[#a0e0a0] active:bg-[#88cc88] disabled:bg-[#2a3a2a] disabled:text-[#6b6460] text-[#131212] py-3 rounded-lg font-bold text-base transition-colors tracking-wide"
          >
            {loading ? 'Procesando...' : `Cobrar $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
