// ============================================================================
// ProductosPage.jsx (admin) - Gestión de productos (CRUD)
// ----------------------------------------------------------------------------
// Pantalla del panel de administración para gestionar el catálogo:
//   - Listar y buscar productos.
//   - Crear, editar y "desactivar" productos (borrado lógico).
//   - Ajustar el stock manualmente (entrada de proveedor, salida por merma
//     o ajuste directo), con un modal que muestra el stock resultante.
// Los datos llegan del backend de FastAPI mediante productosApi/categoriasApi.
// ============================================================================

import { useState, useEffect } from 'react'
// APIs de administración de productos y categorías.
import { productosApi, categoriasApi } from '../../lib/adminApi'

// ---------------------------------------------------------------------------
// emptyForm()
// Devuelve el formulario vacío para crear un producto nuevo.
// Los campos numéricos se guardan como texto en el formulario (los inputs
// type="number" trabajan con strings) y se convierten al guardar.
// ---------------------------------------------------------------------------
function emptyForm() {
  return { codigo_barras: '', nombre: '', descripcion: '', categoria_id: '', precio_compra: '', precio_venta: '', stock_actual: '0', stock_minimo: '5' }
}

// ---------------------------------------------------------------------------
// StockBadge({ actual, minimo })
// Etiqueta de color con el estado del stock (rojo = sin existencias,
// ámbar = bajo mínimo, verde = correcto).
// ---------------------------------------------------------------------------
function StockBadge({ actual, minimo }) {
  let color, bg
  if (actual === 0) {
    color = '#ff6b6b'; bg = '#2d1515'
  } else if (actual <= minimo) {
    color = '#e8a040'; bg = '#2d2a15'
  } else {
    color = '#b8f2b8'; bg = '#1f3a1f'
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-[family-name:var(--font-mono)] tabular-nums" style={{ color, background: bg }}>
      {actual}
      <span className="ml-0.5 opacity-60">/{minimo}</span>
    </span>
  )
}

export default function ProductosPage() {
  // Lista de productos y categorías.
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  // Texto de búsqueda (refiltra en el backend).
  const [query, setQuery] = useState('')
  // Valores del formulario de creación/edición.
  const [form, setForm] = useState(emptyForm())
  // Id del producto en edición (null = modo creación).
  const [editingId, setEditingId] = useState(null)
  // Muestra/oculta el formulario.
  const [showForm, setShowForm] = useState(false)
  // Mensaje de error.
  const [error, setError] = useState(null)
  // Producto sobre el que se está ajustando stock (null = modal cerrado).
  const [ajusteTarget, setAjusteTarget] = useState(null)
  // Datos del formulario de ajuste de stock.
  const [ajusteForm, setAjusteForm] = useState({ tipo: 'entrada', cantidad: '1', motivo: '' })
  // Estado de carga mientras se aplica el ajuste.
  const [ajusteLoading, setAjusteLoading] = useState(false)

  // -------------------------------------------------------------------------
  // load()
  // Carga productos (filtrados por query) y categorías en paralelo.
  // Promise.all lanza ambas peticiones a la vez y espera las dos.
  // -------------------------------------------------------------------------
  function load() {
    Promise.all([
      productosApi.list(query),
      categoriasApi.list(),
    ]).then(([prods, cats]) => {
      setProductos(prods.items || prods)
      setCategorias(cats)
    }).catch((e) => setError(e.message))
  }

  // Recargamos cuando cambia el texto de búsqueda.
  useEffect(load, [query])

  // -------------------------------------------------------------------------
  // openEdit(p)
  // Rellena el formulario con los datos de un producto y entra en modo
  // edición (editingId = p.id). Los números se pasan a string para que
  // los inputs type="number" los muestren correctamente.
  // -------------------------------------------------------------------------
  function openEdit(p) {
    setForm({
      codigo_barras: p.codigo_barras || '',
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      categoria_id: p.categoria_id ?? '',
      precio_compra: String(p.precio_compra ?? ''),
      precio_venta: String(p.precio_venta ?? ''),
      stock_actual: String(p.stock_actual ?? ''),
      stock_minimo: String(p.stock_minimo ?? ''),
    })
    setEditingId(p.id)
    setShowForm(true)
  }

  // -------------------------------------------------------------------------
  // handleSave(e)
  // Guarda un producto: crea si editingId es null, actualiza si no.
  // Antes de enviar, convierte los campos numéricos del formulario (string)
  // a números, aplicando valores por defecto seguros (0 o 5).
  // -------------------------------------------------------------------------
  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    // Preparamos el payload con los tipos correctos para el backend.
    const payload = {
      ...form,
      precio_compra: parseFloat(form.precio_compra) || 0,
      precio_venta: parseFloat(form.precio_venta) || 0,
      stock_actual: parseInt(form.stock_actual) || 0,
      stock_minimo: parseInt(form.stock_minimo) || 5,
      // categoria_id vacío = null (producto sin categoría)
      categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
    }
    try {
      if (editingId) {
        // Modo edición: PUT a /productos/{id}
        await productosApi.update(editingId, payload)
      } else {
        // Modo creación: POST a /productos
        await productosApi.create(payload)
      }
      // Cerramos el formulario y lo reiniciamos.
      setShowForm(false)
      setForm(emptyForm())
      setEditingId(null)
      // Recargamos la tabla con los datos frescos.
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  // -------------------------------------------------------------------------
  // openAjuste(p)
  // Abre el modal de ajuste de stock para un producto, con los valores por
  // defecto: tipo "entrada", cantidad 1 y motivo vacío.
  // -------------------------------------------------------------------------
  function openAjuste(p) {
    setAjusteTarget(p)
    setAjusteForm({ tipo: 'entrada', cantidad: '1', motivo: '' })
  }

  // -------------------------------------------------------------------------
  // handleAjustar(e)
  // Envía el ajuste de stock al backend y recarga la tabla.
  // -------------------------------------------------------------------------
  async function handleAjustar(e) {
    e.preventDefault()
    setAjusteLoading(true)
    setError(null)
    try {
      await productosApi.ajustarStock(ajusteTarget.id, {
        tipo: ajusteForm.tipo,
        cantidad: parseInt(ajusteForm.cantidad),
        motivo: ajusteForm.motivo,
      })
      setAjusteTarget(null) // Cerramos el modal
      load()                // Refrescamos la lista
    } catch (e) {
      setError(e.message)
    } finally {
      setAjusteLoading(false)
    }
  }

  // -------------------------------------------------------------------------
  // handleDelete(id)
  // "Desactiva" un producto (borrado lógico, no físico). Confirma antes
  // con el diálogo nativo del navegador (confirm).
  // -------------------------------------------------------------------------
  async function handleDelete(id) {
    if (!confirm('¿Desactivar este producto?')) return
    try {
      await productosApi.remove(id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  // Stock resultante tras el ajuste, calculado en vivo para mostrarlo:
  //   - 'entrada': stock actual + cantidad
  //   - 'salida':  stock actual - cantidad
  //   - 'ajuste':  directamente la cantidad indicada (nuevo stock exacto)
  const stockResultante = ajusteTarget
    ? ajusteForm.tipo === 'entrada'
      ? ajusteTarget.stock_actual + parseInt(ajusteForm.cantidad || 0)
      : ajusteForm.tipo === 'salida'
        ? ajusteTarget.stock_actual - parseInt(ajusteForm.cantidad || 0)
        : parseInt(ajusteForm.cantidad || 0)
    : 0

  return (
    <div>
      {/* Cabecera: título y botón "+ Nuevo" */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[#e8e3dd]">Productos</h2>
          <p className="text-sm text-[#6b6460]">{productos.length} registros</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm()); setEditingId(null); setShowForm(true) }}
          className="px-4 py-2 rounded-lg font-bold text-sm"
          style={{ background: '#b8f2b8', color: '#131212' }}
        >
          + Nuevo
        </button>
      </div>

      {/* Buscador: al escribir, cambia query y se recarga la lista */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar productos..."
        className="w-full px-3 py-2 text-sm rounded-lg mb-4 focus:outline-none"
        style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }}
      />

      {/* Mensaje de error */}
      {error && (
        <div className="text-sm px-4 py-3 rounded-lg mb-4 font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      {/* Formulario de creación/edición (visible solo cuando showForm) */}
      {showForm && (
        <form onSubmit={handleSave} className="p-4 rounded-lg mb-6 space-y-3" style={{ background: '#1a1817' }}>
          <div className="grid grid-cols-2 gap-3">
            {/* Código de barras (obligatorio) */}
            <div>
              <label className="block text-xs text-[#6b6460] mb-1">Código de barras</label>
              <input value={form.codigo_barras} onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })} required
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
            </div>
            {/* Nombre (obligatorio) */}
            <div>
              <label className="block text-xs text-[#6b6460] mb-1">Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
            </div>
            {/* Categoría (desplegable con las categorías existentes) */}
            <div>
              <label className="block text-xs text-[#6b6460] mb-1">Categoría</label>
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            {/* Descripción (opcional) */}
            <div>
              <label className="block text-xs text-[#6b6460] mb-1">Descripción</label>
              <input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
            </div>
            {/* Precio de compra */}
            <div>
              <label className="block text-xs text-[#6b6460] mb-1">Precio compra</label>
              <input type="number" step="0.01" value={form.precio_compra} onChange={(e) => setForm({ ...form, precio_compra: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
            </div>
            {/* Precio de venta */}
            <div>
              <label className="block text-xs text-[#6b6460] mb-1">Precio venta</label>
              <input type="number" step="0.01" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
            </div>
            {/* Stock actual */}
            <div>
              <label className="block text-xs text-[#6b6460] mb-1">Stock actual</label>
              <input type="number" value={form.stock_actual} onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
            </div>
            {/* Stock mínimo (para la alerta de bajo stock) */}
            <div>
              <label className="block text-xs text-[#6b6460] mb-1">Stock mínimo</label>
              <input type="number" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
            </div>
          </div>
          {/* Botones del formulario: guardar (crear/actualizar) y cancelar */}
          <div className="flex gap-2 pt-2">
            <button type="submit" className="px-4 py-2 rounded-lg font-bold text-sm" style={{ background: '#b8f2b8', color: '#131212' }}>
              {editingId ? 'Actualizar' : 'Crear'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg font-bold text-sm" style={{ background: '#2a2726', color: '#e8e3dd' }}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabla de productos */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2726] text-[#6b6460] text-xs uppercase tracking-wider">
              <th className="text-left py-2 pr-2">Código</th>
              <th className="text-left py-2 pr-2">Nombre</th>
              <th className="text-left py-2 pr-2">Categoría</th>
              <th className="text-right py-2 pr-2">P. Venta</th>
              <th className="text-right py-2 pr-2">Stock</th>
              <th className="text-right py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id} className="border-b border-[#2a2726] hover:bg-[#1a1817] text-[#e8e3dd]">
                <td className="py-2 pr-2 font-[family-name:var(--font-mono)] text-xs">{p.codigo_barras}</td>
                <td className="py-2 pr-2 font-medium">{p.nombre}</td>
                <td className="py-2 pr-2 text-[#6b6460]">{p.categoria_nombre || '-'}</td>
                <td className="py-2 pr-2 text-right font-[family-name:var(--font-mono)]">${Number(p.precio_venta).toFixed(2)}</td>
                <td className="py-2 pr-2 text-right"><StockBadge actual={p.stock_actual} minimo={p.stock_minimo} /></td>
                <td className="py-2 text-right whitespace-nowrap">
                  {/* Acciones por producto: editar, ajustar stock, desactivar */}
                  <button onClick={() => openEdit(p)} className="text-[#6b6460] hover:text-[#e8e3dd] mr-1.5 text-xs">Editar</button>
                  <button onClick={() => openAjuste(p)} className="text-[#e8a040] hover:text-[#f0b850] mr-1.5 text-xs">Stock</button>
                  <button onClick={() => handleDelete(p.id)} className="text-[#6b6460] hover:text-[#ff6b6b] text-xs">Desactivar</button>
                </td>
              </tr>
            ))}
            {/* Mensaje si la lista está vacía */}
            {productos.length === 0 && (
              <tr><td colSpan="6" className="text-center py-8 text-[#6b6460] text-sm">Sin productos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de ajuste de stock */}
      {ajusteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm" style={{ background: '#1a1817' }}>
            {/* Cabecera del modal con botón de cerrar */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2726]">
              <h2 className="font-semibold text-[#e8e3dd] text-sm uppercase tracking-wider">Ajustar stock</h2>
              <button onClick={() => setAjusteTarget(null)} className="text-[#6b6460] hover:text-[#e8e3dd] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Producto afectado con su badge de stock */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#e8e3dd] font-medium">{ajusteTarget.nombre}</span>
                <StockBadge actual={ajusteTarget.stock_actual} minimo={ajusteTarget.stock_minimo} />
              </div>

              <form onSubmit={handleAjustar} className="space-y-4">
                {/* Selector del tipo de ajuste: entrada, salida o ajuste */}
                <div>
                  <label className="text-xs font-medium text-[#6b6460] mb-1.5 block uppercase tracking-wider">Tipo</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'entrada', label: 'Entrada' },
                      { id: 'salida', label: 'Salida' },
                      { id: 'ajuste', label: 'Ajuste' },
                    ].map((t) => (
                      <button key={t.id} type="button" onClick={() => setAjusteForm({ ...ajusteForm, tipo: t.id })}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all ${
                          ajusteForm.tipo === t.id
                            ? 'border-[#b8f2b8] text-[#b8f2b8]'
                            : 'border-[#2a2726] text-[#6b6460] hover:border-[#4a4644]'
                        }`}
                        style={ajusteForm.tipo === t.id ? { background: '#1f3a1f' } : {}}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cantidad del movimiento */}
                <div>
                  <label className="text-xs font-medium text-[#6b6460] mb-1.5 block uppercase tracking-wider">Cantidad</label>
                  <input type="number" min="1" required value={ajusteForm.cantidad}
                    onChange={(e) => setAjusteForm({ ...ajusteForm, cantidad: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none font-[family-name:var(--font-mono)]"
                    style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
                </div>

                {/* Motivo del movimiento (para auditoría) */}
                <div>
                  <label className="text-xs font-medium text-[#6b6460] mb-1.5 block uppercase tracking-wider">Motivo</label>
                  <input type="text" required value={ajusteForm.motivo}
                    onChange={(e) => setAjusteForm({ ...ajusteForm, motivo: e.target.value })}
                    placeholder="Ej: entrada de proveedor, merma, etc."
                    className="w-full px-3 py-2 text-sm rounded-lg focus:outline-none"
                    style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
                </div>

                {/* Previsualización del stock resultante; en rojo si es negativo */}
                <div className="flex justify-between items-center px-4 py-3 rounded-lg text-sm" style={{ background: '#222222' }}>
                  <span className="text-[#6b6460]">
                    {ajusteForm.tipo === 'entrada' ? 'Stock resultante' : ajusteForm.tipo === 'salida' ? 'Stock resultante' : 'Nuevo stock'}
                  </span>
                  <span className={`font-bold font-[family-name:var(--font-mono)] tabular-nums ${stockResultante < 0 ? 'text-[#ff6b6b]' : 'text-[#b8f2b8]'}`}>
                    {stockResultante}
                  </span>
                </div>

                {/* Botones del modal */}
                <div className="flex gap-2 pt-2">
                  {/* El botón se deshabilita mientras se aplica o si el stock
                      resultante fuera negativo (no permitimos stock negativo) */}
                  <button type="submit" disabled={ajusteLoading || stockResultante < 0}
                    className="flex-1 bg-[#b8f2b8] hover:bg-[#a0e0a0] disabled:bg-[#2a3a2a] disabled:text-[#6b6460] text-[#131212] py-3 rounded-lg font-bold text-sm transition-colors">
                    {ajusteLoading ? 'Ajustando...' : 'Aplicar ajuste'}
                  </button>
                  <button type="button" onClick={() => setAjusteTarget(null)}
                    className="px-4 py-3 rounded-lg font-bold text-sm" style={{ background: '#2a2726', color: '#e8e3dd' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
