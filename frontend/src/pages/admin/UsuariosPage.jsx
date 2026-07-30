import { useState, useEffect, useCallback } from 'react'
import { usuariosApi } from '../../lib/adminApi'

function RolBadge({ rol }) {
  const isAdmin = rol === 'administrador'
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAdmin ? 'text-[#b8f2b8]' : 'text-[#6b6460]'}`}
      style={{ background: isAdmin ? '#1f3a1f' : '#2a2726' }}
    >
      {isAdmin ? 'Administrador' : 'Cajero'}
    </span>
  )
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    usuariosApi.list()
      .then(setUsuarios)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  async function handleToggleRol(user) {
    const nuevoRol = user.rol === 'administrador' ? 'cajero' : 'administrador'
    const label = nuevoRol === 'administrador' ? 'Administrador' : 'Cajero'
    if (!confirm(`¿Cambiar rol de ${user.nombre_completo} a "${label}"?`)) return
    setUpdating(user.id)
    setError(null)
    try {
      await usuariosApi.update(user.id, { rol: nuevoRol })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setUpdating(null)
    }
  }

  async function handleToggleActivo(user) {
    const accion = user.activo ? 'desactivar' : 'activar'
    if (!confirm(`¿${accion} a ${user.nombre_completo}?`)) return
    setUpdating(user.id)
    setError(null)
    try {
      await usuariosApi.update(user.id, { activo: !user.activo })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#b8f2b8] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[#e8e3dd]">Usuarios</h2>
          <p className="text-sm text-[#6b6460]">{usuarios.length} registros</p>
        </div>
      </div>

      {error && (
        <div className="text-sm px-4 py-3 rounded-lg mb-4 font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2726] text-[#6b6460] text-xs uppercase tracking-wider">
              <th className="text-left py-2 pr-2">Nombre</th>
              <th className="text-left py-2 pr-2">Email</th>
              <th className="text-left py-2 pr-2">Rol</th>
              <th className="text-left py-2 pr-2">Estado</th>
              <th className="text-left py-2 pr-2">Registro</th>
              <th className="text-right py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const isUpdating = updating === u.id
              return (
                <tr key={u.id} className="border-b border-[#2a2726] hover:bg-[#1a1817] text-[#e8e3dd]">
                  <td className="py-2 pr-2 font-medium">{u.nombre_completo}</td>
                  <td className="py-2 pr-2 text-sm">{u.email}</td>
                  <td className="py-2 pr-2">
                    <button
                      onClick={() => handleToggleRol(u)}
                      disabled={isUpdating}
                      className="hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      <RolBadge rol={u.rol} />
                    </button>
                  </td>
                  <td className="py-2 pr-2">
                    {u.activo ? (
                      <span className="text-xs text-[#b8f2b8] font-medium">Activo</span>
                    ) : (
                      <span className="text-xs text-[#ff6b6b] font-medium">Inactivo</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-xs text-[#6b6460]">
                    {new Date(u.creado_en).toLocaleDateString('es-MX')}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActivo(u)}
                      disabled={isUpdating}
                      className={`text-xs font-medium transition-colors disabled:opacity-50 ${
                        u.activo
                          ? 'text-[#ff6b6b] hover:text-[#ff4444]'
                          : 'text-[#b8f2b8] hover:text-[#a0e0a0]'
                      }`}
                    >
                      {isUpdating ? '···' : u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {usuarios.length === 0 && !loading && (
              <tr><td colSpan="6" className="text-center py-8 text-[#6b6460] text-sm">Sin usuarios registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
