import { useState, useEffect } from 'react'
import { categoriasApi } from '../../lib/adminApi'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([])
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState(null)

  function load() {
    categoriasApi.list().then(setCategorias).catch((e) => setError(e.message))
  }

  useEffect(load, [])

  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    try {
      if (editId) {
        await categoriasApi.update(editId, { nombre, descripcion })
      } else {
        await categoriasApi.create({ nombre, descripcion })
      }
      setNombre('')
      setDescripcion('')
      setEditId(null)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  function openEdit(c) {
    setNombre(c.nombre)
    setDescripcion(c.descripcion || '')
    setEditId(c.id)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta categoría?')) return
    try {
      await categoriasApi.remove(id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-[#e8e3dd] mb-6">Categorías</h2>

      {error && (
        <div className="text-sm px-4 py-3 rounded-lg mb-4 font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="flex gap-2 mb-6">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" required
          className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
          style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción (opcional)"
          className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
          style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
        <button type="submit" className="px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap" style={{ background: '#b8f2b8', color: '#131212' }}>
          {editId ? 'Actualizar' : 'Crear'}
        </button>
        {editId && (
          <button type="button" onClick={() => { setNombre(''); setDescripcion(''); setEditId(null) }} className="px-4 py-2 rounded-lg font-bold text-sm" style={{ background: '#2a2726', color: '#e8e3dd' }}>
            Cancelar
          </button>
        )}
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2726] text-[#6b6460] text-xs uppercase tracking-wider">
              <th className="text-left py-2">Nombre</th>
              <th className="text-left py-2">Descripción</th>
              <th className="text-right py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id} className="border-b border-[#2a2726] hover:bg-[#1a1817] text-[#e8e3dd]">
                <td className="py-2 font-medium">{c.nombre}</td>
                <td className="py-2 text-[#6b6460]">{c.descripcion || '-'}</td>
                <td className="py-2 text-right">
                  <button onClick={() => openEdit(c)} className="text-[#6b6460] hover:text-[#e8e3dd] mr-2 text-xs">Editar</button>
                  <button onClick={() => handleDelete(c.id)} className="text-[#6b6460] hover:text-[#ff6b6b] text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
            {categorias.length === 0 && (
              <tr><td colSpan="3" className="text-center py-8 text-[#6b6460] text-sm">Sin categorías</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
