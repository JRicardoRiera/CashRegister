import { useState, useEffect } from 'react'
import CajeroLayout from '../../components/CajeroLayout'
import { productosApi, categoriasApi } from '../../lib/adminApi'

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
      {actual}<span className="ml-0.5 opacity-60">/{minimo}</span>
    </span>
  )
}

export default function ProductosPage() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [query, setQuery] = useState('')
  const [catFilter, setCatFilter] = useState('')

  useEffect(() => {
    productosApi.list(query).then((data) => setProductos(data.items || data))
    categoriasApi.list().then(setCategorias)
  }, [query])

  const filtrados = catFilter
    ? productos.filter((p) => p.categoria_id === parseInt(catFilter))
    : productos

  return (
    <CajeroLayout>
      <div className="h-full overflow-y-auto" style={{ background: '#131212' }}>
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#e8e3dd]">Inventario</h2>
            <span className="text-sm text-[#6b6460] font-[family-name:var(--font-mono)]">{filtrados.length} productos</span>
          </div>

          <div className="flex gap-2 mb-4">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar productos..."
              className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
              style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg focus:outline-none"
              style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }}>
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

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
                {filtrados.map((p) => (
                  <tr key={p.id} className="border-b border-[#2a2726] text-[#e8e3dd]">
                    <td className="py-2 pr-2 font-[family-name:var(--font-mono)] text-xs">{p.codigo_barras}</td>
                    <td className="py-2 pr-2 font-medium">{p.nombre}</td>
                    <td className="py-2 pr-2 text-[#6b6460]">{p.categoria_nombre || '-'}</td>
                    <td className="py-2 pr-2 text-right font-[family-name:var(--font-mono)]">${Number(p.precio_venta).toFixed(2)}</td>
                    <td className="py-2 text-right"><StockBadge actual={p.stock_actual} minimo={p.stock_minimo} /></td>
                  </tr>
                ))}
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
