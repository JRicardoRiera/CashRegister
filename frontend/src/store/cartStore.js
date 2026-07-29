import { create } from 'zustand'

const IVA = 0.16

const useCartStore = create((set, get) => ({
  items: [],

  addItem(producto) {
    set((state) => {
      const existing = state.items.find((i) => i.id === producto.id)
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
          ),
        }
      }
      return {
        items: [
          ...state.items,
          {
            id: producto.id,
            codigo_barras: producto.codigo_barras,
            nombre: producto.nombre,
            precio_venta: Number(producto.precio_venta),
            stock_actual: producto.stock_actual,
            cantidad: 1,
          },
        ],
      }
    })
  },

  updateCantidad(id, cantidad) {
    if (cantidad <= 0) {
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      return
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, cantidad: Math.min(cantidad, i.stock_actual) } : i
      ),
    }))
  },

  removeItem(id) {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
  },

  clear() {
    set({ items: [] })
  },

  get subtotal() {
    return get().items.reduce((acc, i) => acc + i.precio_venta * i.cantidad, 0)
  },

  get impuestos() {
    return get().subtotal * IVA
  },

  get total() {
    return get().subtotal + get().impuestos
  },

  get count() {
    return get().items.reduce((acc, i) => acc + i.cantidad, 0)
  },
}))

export default useCartStore
