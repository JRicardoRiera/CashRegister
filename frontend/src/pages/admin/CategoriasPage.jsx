// ============================================================================
// CategoriasPage.jsx (admin) - Gestión de categorías
// ----------------------------------------------------------------------------
// Permite crear, editar y eliminar las categorías que agrupan los productos
// del catálogo. El formulario está integrado en la parte superior de la
// página (no es un modal): sirve para crear y, al pulsar "Editar" en una
// fila, se rellena para actualizar. Eliminar pide confirmación con el
// diálogo nativo del navegador.
// ============================================================================

import { useState, useEffect } from 'react'
// API de categorías.
import { categoriasApi } from '../../lib/adminApi'

export default function CategoriasPage() {
  // Lista de categorías.
  const [categorias, setCategorias] = useState([])
  // Campos del formulario.
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  // Id de la categoría en edición (null = modo creación).
  const [editId, setEditId] = useState(null)
  // Mensaje de error.
  const [error, setError] = useState(null)

  // Carga la lista de categorías.
  function load() {
    categoriasApi.list().then(setCategorias).catch((e) => setError(e.message))
  }

  // Cargamos al montar el componente ([] = sin dependencias).
  useEffect(load, [])

  // -------------------------------------------------------------------------
  // handleSave(e)
  // Crea una categoría nueva o actualiza la que está en edición.
  // -------------------------------------------------------------------------
  async function handleSave(e) {
    e.preventDefault()
    setError(null)
    try {
      if (editId) {
        // Modo edición: PUT a /categorias/{id}
        await categoriasApi.update(editId, { nombre, descripcion })
      } else {
        // Modo creación: POST a /categorias
        await categoriasApi.create({ nombre, descripcion })
      }
      // Limpiamos el formulario y salimos del modo edición.
      setNombre('')
      setDescripcion('')
      setEditId(null)
      // Refrescamos la tabla.
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  // -------------------------------------------------------------------------
  // openEdit(c)
  // Rellena el formulario con los datos de la categoría y entra en modo
  // edición.
  // -------------------------------------------------------------------------
  function openEdit(c) {
    setNombre(c.nombre)
    setDescripcion(c.descripcion || '')
    setEditId(c.id)
  }

  // -------------------------------------------------------------------------
  // handleDelete(id)
  // Elimina la categoría tras confirmar con el usuario.
  // -------------------------------------------------------------------------
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
      {/* Título de la página */}
      <h2 className="text-lg font-bold text-[#e8e3dd] mb-6">Categorías</h2>

      {/* Mensaje de error */}
      {error && (
        <div className="text-sm px-4 py-3 rounded-lg mb-4 font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      {/* Formulario de creación/edición */}
      <form onSubmit={handleSave} className="flex gap-2 mb-6">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" required
          className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
          style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
        <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción (opcional)"
          className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
          style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }} />
        {/* Botón principal: cambia de "Crear" a "Actualizar" en modo edición */}
        <button type="submit" className="px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap" style={{ background: '#b8f2b8', color: '#131212' }}>
          {editId ? 'Actualizar' : 'Crear'}
        </button>
        {/* Botón de cancelar, visible solo mientras se edita */}
        {editId && (
          <button type="button" onClick={() => { setNombre(''); setDescripcion(''); setEditId(null) }} className="px-4 py-2 rounded-lg font-bold text-sm" style={{ background: '#2a2726', color: '#e8e3dd' }}>
            Cancelar
          </button>
        )}
      </form>

      {/* Tabla de categorías */}
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
                {/* Si no hay descripción se muestra un guion */}
                <td className="py-2 text-[#6b6460]">{c.descripcion || '-'}</td>
                <td className="py-2 text-right">
                  <button onClick={() => openEdit(c)} className="text-[#6b6460] hover:text-[#e8e3dd] mr-2 text-xs">Editar</button>
                  <button onClick={() => handleDelete(c.id)} className="text-[#6b6460] hover:text-[#ff6b6b] text-xs">Eliminar</button>
                </td>
              </tr>
            ))}
            {/* Mensaje si no hay categorías */}
            {categorias.length === 0 && (
              <tr><td colSpan="3" className="text-center py-8 text-[#6b6460] text-sm">Sin categorías</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
