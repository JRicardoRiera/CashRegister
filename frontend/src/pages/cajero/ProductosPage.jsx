// ============================================================================
// ProductosPage.jsx (cajero) - Consulta de inventario para el cajero
// ----------------------------------------------------------------------------
// Pantalla de solo lectura donde el cajero puede ver todo el catálogo de
// productos: código de barras, nombre, categoría, precio y estado del stock
// (con un indicador de color según si hay existencias suficientes).
// Incluye búsqueda por texto y filtro por categoría.
// ============================================================================

import { useState, useEffect } from 'react'
// Marco de navegación de las pantallas del cajero.
import CajeroLayout from '../../components/CajeroLayout'
// APIs para listar productos y categorías (mismo backend que el admin).
import { productosApi, categoriasApi } from '../../lib/adminApi'

// ---------------------------------------------------------------------------
// StockBadge({ actual, minimo })
// Etiqueta de color que indica el estado del stock de un producto:
//   - Rojo: sin existencias (actual = 0).
//   - Ámbar: por debajo del mínimo recomendado.
//   - Verde: stock correcto.
// ---------------------------------------------------------------------------
function StockBadge({ actual, minimo }) {
  let color, bg
  // Decidimos el color según la cantidad disponible.
  if (actual === 0) {
    color = '#ff6b6b'; bg = '#2d1515'       // Sin stock
  } else if (actual <= minimo) {
    color = '#e8a040'; bg = '#2d2a15'       // Bajo mínimo
  } else {
    color = '#b8f2b8'; bg = '#1f3a1f'       // Stock OK
  }
  return (
    // Muestra "actual / minimo" (el /minimo con opacidad reducida).
    <span className="px-2 py-0.5 rounded-full text-xs font-[family-name:var(--font-mono)] tabular-nums" style={{ color, background: bg }}>
      {actual}<span className="ml-0.5 opacity-60">/{minimo}</span>
    </span>
  )
}

// Componente principal de la página.
export default function ProductosPage() {
  // Lista completa de productos (ya filtrada por texto en el backend).
  const [productos, setProductos] = useState([])
  // Categorías para el desplegable de filtro.
  const [categorias, setCategorias] = useState([])
  // Texto de búsqueda.
  const [query, setQuery] = useState('')
  // Categoría seleccionada en el filtro ('' = todas).
  const [catFilter, setCatFilter] = useState('')

  // Cargamos productos y categorías cada vez que cambia el texto buscado.
  // El backend ya filtra por texto (query); el filtro por categoría se hace
  // aquí en el cliente sobre el resultado.
  useEffect(() => {
    productosApi.list(query).then((data) => setProductos(data.items || data))
    categoriasApi.list().then(setCategorias)
  }, [query])

  // Aplicamos el filtro por categoría en el cliente.
  // parseInt(catFilter) convierte el valor del <select> (string) a número
  // porque categoria_id es un número en la base de datos.
  const filtrados = catFilter
    ? productos.filter((p) => p.categoria_id === parseInt(catFilter))
    : productos

  return (
    <CajeroLayout>
      <div className="h-full overflow-y-auto" style={{ background: '#131212' }}>
        <div className="max-w-5xl mx-auto p-6">
          {/* Cabecera: título y número de productos visibles */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#e8e3dd]">Inventario</h2>
            <span className="text-sm text-[#6b6460] font-[family-name:var(--font-mono)]">{filtrados.length} productos</span>
          </div>

          {/* Barra de búsqueda + filtro de categoría */}
          <div className="flex gap-2 mb-4">
            {/* Input de búsqueda: dispara el useEffect al cambiar query */}
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos..."
              className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
              style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
            {/* Selector de categoría; value guarda el id como texto */}
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg focus:outline-none"
              style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }}>
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {/* Tabla de productos */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2726] text-[#6b6460] text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-2">Código</th>
                  <th className="text-left py-2 pr-2">Nombre</th>
                  <th className="text-left py-2 pr-2">Categoría</th>
                  <th className="text-right py-2 pr-2">Precio</th>
                  <th className="text-right py-2">Stock</th>
                </tr>
              </thead>
              <tbody>
                {/* Una fila por producto; si no hay categoría se muestra "-" */}
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-b border-[#2a2726] text-[#e8e3dd]">
                    <td className="py-2 pr-2 font-[family-name:var(--font-mono)] text-xs">{p.codigo_barras}</td>
                    <td className="py-2 pr-2 font-medium">{p.nombre}</td>
                    <td className="py-2 pr-2 text-[#6b6460]">{p.categoria_nombre || '-'}</td>
                    <td className="py-2 pr-2 text-right font-[family-name:var(--font-mono)]">${Number(p.precio_venta).toFixed(2)}</td>
                    <td className="py-2 text-right"><StockBadge actual={p.stock_actual} minimo={p.stock_minimo} /></td>
                  </tr>
                ))}
                {/* Mensaje si no hay productos que mostrar.
                    colSpan="5" hace que la celda ocupe las 5 columnas. */}
                {filtrados.length === 0 && (
                  <tr><td colSpan="5" className="text-center py-8 text-[#6b6460] text-sm">Sin productos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CajeroLayout>
  )
}
