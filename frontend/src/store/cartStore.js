import { create } from 'zustand'

const IVA = 0.15

const useCartStore = create((set, get) => ({
  items: [],

  addItem(producto) {
    const current = get().items
    const existing = current.find((i) => i.id === producto.id)
    const qtyInCart = existing ? existing.cantidad : 0
    if (qtyInCart >= producto.stock_actual) return

    set((state) => {
      const found = state.items.find((i) => i.id === producto.id)
      if (found) {
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
        i.id === id
          ? { ...i, cantidad: Math.min(cantidad, i.stock_actual) }
          : i
      ),
    }))
  },

  removeItem(id) {
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
  },

  clear() {
    set({ items: [] })
  },
}))

export const selectItems = (s) => s.items

export const selectSubtotal = (s) =>
  s.items.reduce((acc, i) => acc + i.precio_venta * i.cantidad, 0)

export const selectImpuestos = (s) => selectSubtotal(s) * IVA

export const selectTotal = (s) => selectSubtotal(s) * (1 + IVA)

export const selectCount = (s) =>
  s.items.reduce((acc, i) => acc + i.cantidad, 0)

export default useCartStore
