import useCartStore from '../store/cartStore'

export default function CartItem({ item }) {
  const updateCantidad = useCartStore((s) => s.updateCantidad)
  const removeItem = useCartStore((s) => s.removeItem)

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-[#2a2726] last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[#e8e3dd] text-sm truncate">{item.nombre}</p>
        <p className="text-xs text-[#6b6460] font-[family-name:var(--font-mono)]">
          ${item.precio_venta.toFixed(2)} c/u
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => updateCantidad(item.id, item.cantidad - 1)}
          className="w-7 h-7 flex items-center justify-center rounded border border-[#3a3735] hover:bg-[#2a2726] text-[#8a8380] hover:text-[#e8e3dd] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
        <span className="w-8 text-center font-medium text-sm text-[#e8e3dd] font-[family-name:var(--font-mono)] tabular-nums">
          {item.cantidad}
        </span>
        <button
          onClick={() => updateCantidad(item.id, item.cantidad + 1)}
          className="w-7 h-7 flex items-center justify-center rounded border border-[#3a3735] hover:bg-[#2a2726] text-[#8a8380] hover:text-[#e8e3dd] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
      </div>

      <div className="text-right min-w-[80px]">
        <p className="font-semibold text-[#b8f2b8] text-sm font-[family-name:var(--font-mono)] tabular-nums">
          ${(item.precio_venta * item.cantidad).toFixed(2)}
        </p>
      </div>

      <button
        onClick={() => removeItem(item.id)}
        className="text-[#4a4644] hover:text-[#d64545] transition-colors opacity-0 group-hover:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  )
}
