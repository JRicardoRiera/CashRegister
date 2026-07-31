// ============================================================================
// CartPanel.jsx - Panel lateral del carrito de la compra
// ----------------------------------------------------------------------------
// Muestra el contenido del carrito (estado global de Zustand) en el lateral
// derecho del POS: el icono con el número de artículos, la lista de items,
// el desglose de subtotal/IVA/total y el botón "Cobrar" que abre el modal
// de pago. Si el carrito está vacío muestra un mensaje de aviso.
// ============================================================================

// Importamos la tienda y los selectores que calculan los totales.
// Usamos selectores para que el componente solo se re-renderice cuando
// cambia el valor concreto que le interesa (p. ej. el total).
import useCartStore, { selectSubtotal, selectImpuestos, selectTotal, selectCount } from '../store/cartStore'
// Cada línea del carrito se renderiza con el componente CartItem.
import CartItem from './CartItem'

// El componente recibe la prop onCheckout (función que abre el modal de pago).
export default function CartPanel({ onCheckout }) {
  // Estado y acciones seleccionadas de la tienda global.
  const items = useCartStore((s) => s.items)        // Lista de productos
  const clear = useCartStore((s) => s.clear)        // Vaciar el carrito
  const subtotal = useCartStore(selectSubtotal)     // Suma sin impuestos
  const impuestos = useCartStore(selectImpuestos)   // Importe del IVA (15%)
  const total = useCartStore(selectTotal)           // Total final
  const count = useCartStore(selectCount)           // Nº total de unidades

  return (
    // El panel ocupa todo el alto y se organiza en columna (flex).
    <div className="h-full flex flex-col">
      {/* Cabecera del panel: icono + título + contador + botón limpiar */}
      <div className="border-b border-[#2a2726] px-4 py-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          {/* Icono de carrito de la compra (SVG en línea) */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b6460" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span className="font-medium text-[#e8e3dd] text-sm">Carrito</span>
          {/* Contador de unidades; solo visible si hay algún artículo */}
          {count > 0 && (
            <span className="bg-[#b8f2b8] text-[#131212] text-xs font-bold px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)] min-w-[20px] text-center">
              {count}
            </span>
          )}
        </div>
        {/* Botón "Limpiar" que vacía el carrito; solo si hay items */}
        {items.length > 0 && (
          <button onClick={clear} className="text-xs text-[#6b6460] hover:text-[#d64545] transition-colors flex items-center gap-1 font-medium">
            {/* Icono de papelera */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Limpiar
          </button>
        )}
      </div>

      {/* Zona de scroll con la lista de productos del carrito */}
      <div className="flex-1 overflow-y-auto register-scroll px-4 py-1">
        {items.length === 0 ? (
          /* Estado vacío: mensaje centrado con icono de carrito */
          <div className="text-center py-16">
            <svg className="w-10 h-10 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="#3a3735" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <p className="text-sm text-[#6b6460] font-medium">Carrito vacío</p>
            <p className="text-xs text-[#4a4644] mt-1">Agrega productos desde el catálogo</p>
          </div>
        ) : (
          /* Renderizamos un CartItem por cada producto del carrito.
             "key" ayuda a React a identificar cada item en la lista. */
          items.map((item) => <CartItem key={item.id} item={item} />)
        )}
      </div>

      {/* Pie con totales y botón de cobro; solo se muestra si hay items */}
      {items.length > 0 && (
        <div className="border-t border-[#2a2726] px-4 py-4 space-y-2 bg-[#1a1817]">
          {/* Línea de subtotal (sin impuestos) */}
          <div className="flex justify-between text-sm text-[#6b6460]">
            <span>Subtotal</span>
            {/* toFixed(2) formatea el número con 2 decimales (moneda) */}
            <span className="font-[family-name:var(--font-mono)] tabular-nums">${subtotal.toFixed(2)}</span>
          </div>
          {/* Línea del IVA */}
          <div className="flex justify-between text-sm text-[#6b6460]">
            <span>IVA (15%)</span>
            <span className="font-[family-name:var(--font-mono)] tabular-nums">${impuestos.toFixed(2)}</span>
          </div>
          {/* Recuadro destacado con el total (estilo "pantalla" de la caja) */}
          <div className="register-display flex justify-between items-center mt-3 mb-1">
            <span className="text-sm font-semibold text-[#b8f2b8] uppercase tracking-widest text-xs">Total</span>
            {/* La animación register-pulse hace "respirar" el total */}
            <span className="text-xl font-bold text-[#b8f2b8] font-[family-name:var(--font-mono)] tabular-nums tracking-tight animate-[register-pulse_2s_ease-in-out_infinite]">
              ${total.toFixed(2)}
            </span>
          </div>
          {/* Botón principal: abre el modal de cobro */}
          <button
            onClick={onCheckout}
            className="w-full bg-[#b8f2b8] hover:bg-[#a0e0a0] active:bg-[#88cc88] text-[#131212] py-3 rounded-lg font-bold text-base transition-colors tracking-wide"
          >
            Cobrar
          </button>
        </div>
      )}
    </div>
  )
}
