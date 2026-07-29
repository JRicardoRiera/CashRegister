import useCartStore from '../store/cartStore'
import CartItem from './CartItem'

export default function CartPanel({ onCheckout }) {
  const items = useCartStore((s) => s.items)
  const clear = useCartStore((s) => s.clear)
  const subtotal = useCartStore((s) => s.subtotal)
  const impuestos = useCartStore((s) => s.impuestos)
  const total = useCartStore((s) => s.total)
  const count = useCartStore((s) => s.count)

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-[#2a2726] px-4 py-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b6460" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span className="font-medium text-[#e8e3dd] text-sm">Carrito</span>
          {count > 0 && (
            <span className="bg-[#b8f2b8] text-[#131212] text-xs font-bold px-1.5 py-0.5 rounded font-[family-name:var(--font-mono)] min-w-[20px] text-center">
              {count}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button onClick={clear} className="text-xs text-[#6b6460] hover:text-[#d64545] transition-colors flex items-center gap-1 font-medium">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Limpiar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto register-scroll px-4 py-1">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-10 h-10 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="#3a3735" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <p className="text-sm text-[#6b6460] font-medium">Carrito vacío</p>
            <p className="text-xs text-[#4a4644] mt-1">Agrega productos desde el catálogo</p>
          </div>
        ) : (
          items.map((item) => <CartItem key={item.id} item={item} />)
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t border-[#2a2726] px-4 py-4 space-y-2 bg-[#1a1817]">
          <div className="flex justify-between text-sm text-[#6b6460]">
            <span>Subtotal</span>
            <span className="font-[family-name:var(--font-mono)] tabular-nums">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#6b6460]">
            <span>IVA (16%)</span>
            <span className="font-[family-name:var(--font-mono)] tabular-nums">${impuestos.toFixed(2)}</span>
          </div>
          <div className="register-display flex justify-between items-center mt-3 mb-1">
            <span className="text-sm font-semibold text-[#b8f2b8] uppercase tracking-widest text-xs">Total</span>
            <span className="text-xl font-bold text-[#b8f2b8] font-[family-name:var(--font-mono)] tabular-nums tracking-tight animate-[register-pulse_2s_ease-in-out_infinite]">
              ${total.toFixed(2)}
            </span>
          </div>
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
