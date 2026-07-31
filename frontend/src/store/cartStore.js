// ============================================================================
// cartStore.js - Estado global del carrito de la compra (Zustand)
// ----------------------------------------------------------------------------
// En esta aplicación el carrito es "estado compartido": lo usan la pantalla
// del POS, el panel lateral del carrito y el modal de pago. Por eso lo
// gestionamos con Zustand, que nos permite tener un estado global accesible
// desde cualquier componente sin pasar props de componente en componente
// (algo que con React Context sería más verboso).
//
// La tienda guarda un array de "items". Cada item tiene la forma:
//   { id, codigo_barras, nombre, precio_venta, stock_actual, cantidad }
// Además del estado, la tienda expone acciones (addItem, updateCantidad,
// removeItem, clear) y selectores para calcular totales.
// ============================================================================

// Importamos "create" de Zustand, que es la función que crea la tienda.
import { create } from 'zustand'

// Tipo de IVA aplicado en España (15%). Se usa para calcular impuestos y
// el total final. Está como constante para poder cambiarlo en un solo sitio.
const IVA = 0.15

// Creamos la tienda. "set" actualiza el estado y "get" permite leer el
// estado actual dentro de una acción.
const useCartStore = create((set, get) => ({
  // Estado inicial: el carrito empieza vacío.
  items: [],

  // -------------------------------------------------------------------------
  // addItem(producto)
  // Añade un producto al carrito. Si el producto ya está, incrementa su
  // cantidad en 1. Valida que no superemos el stock disponible.
  // -------------------------------------------------------------------------
  addItem(producto) {
    // Leemos los items actuales del carrito.
    const current = get().items
    // Buscamos si el producto ya está en el carrito.
    const existing = current.find((i) => i.id === producto.id)
    // Cantidad que ya tenemos de ese producto en el carrito.
    const qtyInCart = existing ? existing.cantidad : 0
    // Si añadir 1 más superaría el stock, lo ignoramos (no se añade).
    // Esto evita que el cajero venda más unidades de las que hay.
    if (qtyInCart >= producto.stock_actual) return

    set((state) => {
      // Volvemos a buscar el producto dentro del estado actual.
      const found = state.items.find((i) => i.id === producto.id)
      // Si ya existía, actualizamos solo ese item incrementando su cantidad.
      if (found) {
        return {
          items: state.items.map((i) =>
            i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
          ),
        }
      }
      // Si es la primera vez, lo añadimos como nuevo item del carrito.
      // Convertimos el precio a número para evitar errores con strings
      // que vengan de la base de datos.
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

  // -------------------------------------------------------------------------
  // updateCantidad(id, cantidad)
  // Actualiza la cantidad de un item del carrito.
  // Si la cantidad llega a 0 o menos, el item se elimina del carrito.
  // Si se pide más del stock, se limita automáticamente al stock disponible.
  // -------------------------------------------------------------------------
  updateCantidad(id, cantidad) {
    // Cantidad no positiva => quitamos el producto del carrito.
    if (cantidad <= 0) {
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
      return
    }
    set((state) => ({
      items: state.items.map((i) =>
        // Aplicamos el cambio solo al item con el id indicado.
        i.id === id
          // Math.min evita vender más unidades de las que hay en stock.
          ? { ...i, cantidad: Math.min(cantidad, i.stock_actual) }
          : i
      ),
    }))
  },

  // -------------------------------------------------------------------------
  // removeItem(id)
  // Elimina un item concreto del carrito.
  // -------------------------------------------------------------------------
  removeItem(id) {
    // "filter" devuelve un nuevo array sin el item cuyo id coincide.
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }))
  },

  // -------------------------------------------------------------------------
  // clear()
  // Vacía el carrito por completo. Se llama tras confirmar una venta.
  // -------------------------------------------------------------------------
  clear() {
    set({ items: [] })
  },
}))

// ---------------------------------------------------------------------------
// Selectores
// Los selectores son funciones que reciben la tienda y devuelven un valor
// calculado. Al usarlos en los componentes con useCartStore(selector), solo
// provocamos re-renderizado cuando cambia el valor que nos interesa.
// ---------------------------------------------------------------------------

// Devuelve la lista de items del carrito.
export const selectItems = (s) => s.items

// Suma de (precio x cantidad) de todos los items (sin IVA).
// "reduce" recorre el array acumulando el resultado en "acc".
export const selectSubtotal = (s) =>
  s.items.reduce((acc, i) => acc + i.precio_venta * i.cantidad, 0)

// Importe del IVA: el subtotal por el tipo de IVA (15%).
export const selectImpuestos = (s) => selectSubtotal(s) * IVA

// Total final: subtotal más IVA. Equivale a subtotal * (1 + IVA).
export const selectTotal = (s) => selectSubtotal(s) * (1 + IVA)

// Número total de unidades (suma de las cantidades), útil para mostrar
// un contador en el icono del carrito.
export const selectCount = (s) =>
  s.items.reduce((acc, i) => acc + i.cantidad, 0)

// Exportamos la tienda por defecto para poder usar el hook en los componentes.
export default useCartStore
