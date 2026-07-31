// ============================================================================
// UsuariosPage.jsx (admin) - Gestión de usuarios del sistema
// ----------------------------------------------------------------------------
// Lista todos los usuarios registrados con su nombre, email, rol, estado
// (activo/inactivo) y fecha de registro. Permite dos acciones:
//   - Cambiar el rol (cajero <-> administrador) pulsando sobre la etiqueta.
//   - Activar/desactivar el acceso del usuario.
// Ambas acciones piden confirmación y recargan la lista al terminar.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
// API de usuarios.
import { usuariosApi } from '../../lib/adminApi'

// ---------------------------------------------------------------------------
// RolBadge({ rol })
// Etiqueta de color que muestra el rol: verde para administrador,
// gris para cajero.
// ---------------------------------------------------------------------------
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
  // Lista de usuarios.
  const [usuarios, setUsuarios] = useState([])
  // Mensaje de error.
  const [error, setError] = useState(null)
  // Estado de carga inicial.
  const [loading, setLoading] = useState(true)
  // Id del usuario al que se le está aplicando un cambio (para bloquear
  // sus botones mientras la petición está en curso).
  const [updating, setUpdating] = useState(null)

  // -------------------------------------------------------------------------
  // load()
  // Carga la lista de usuarios. useCallback con [] garantiza que la función
  // mantiene la misma referencia entre renders (útil para useEffect).
  // -------------------------------------------------------------------------
  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    usuariosApi.list()
      .then(setUsuarios)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Cargamos al montar el componente.
  useEffect(load, [load])

  // -------------------------------------------------------------------------
  // handleToggleRol(user)
  // Cambia el rol del usuario: si es administrador pasa a cajero y al revés.
  // -------------------------------------------------------------------------
  async function handleToggleRol(user) {
    // Calculamos el rol nuevo (el opuesto al actual).
    const nuevoRol = user.rol === 'administrador' ? 'cajero' : 'administrador'
    const label = nuevoRol === 'administrador' ? 'Administrador' : 'Cajero'
    // Confirmación antes de modificar permisos.
    if (!confirm(`¿Cambiar rol de ${user.nombre_completo} a "${label}"?`)) return
    setUpdating(user.id) // Marcamos al usuario como "en actualización"
    setError(null)
    try {
      await usuariosApi.update(user.id, { rol: nuevoRol })
      load() // Recargamos con los datos actualizados
    } catch (e) {
      setError(e.message)
    } finally {
      setUpdating(null)
    }
  }

  // -------------------------------------------------------------------------
  // handleToggleActivo(user)
  // Activa o desactiva el acceso de un usuario al sistema.
  // -------------------------------------------------------------------------
  async function handleToggleActivo(user) {
    // Texto de la acción según el estado actual.
    const accion = user.activo ? 'desactivar' : 'activar'
    if (!confirm(`¿${accion} a ${user.nombre_completo}?`)) return
    setUpdating(user.id)
    setError(null)
    try {
      // Enviamos el valor contrario (toggle).
      await usuariosApi.update(user.id, { activo: !user.activo })
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setUpdating(null)
    }
  }

  // Mientras carga la lista, mostramos un spinner.
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-[#b8f2b8] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* Cabecera con el número de usuarios */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[#e8e3dd]">Usuarios</h2>
          <p className="text-sm text-[#6b6460]">{usuarios.length} registros</p>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="text-sm px-4 py-3 rounded-lg mb-4 font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      {/* Tabla de usuarios */}
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
              // Si este usuario está siendo actualizado, se bloquean sus botones.
              const isUpdating = updating === u.id
              return (
                <tr key={u.id} className="border-b border-[#2a2726] hover:bg-[#1a1817] text-[#e8e3dd]">
                  <td className="py-2 pr-2 font-medium">{u.nombre_completo}</td>
                  <td className="py-2 pr-2 text-sm">{u.email}</td>
                  {/* La etiqueta del rol es un botón: al pulsarla cambia el rol */}
                  <td className="py-2 pr-2">
                    <button
                      onClick={() => handleToggleRol(u)}
                      disabled={isUpdating}
                      className="hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      <RolBadge rol={u.rol} />
                    </button>
                  </td>
                  {/* Estado: activo (verde) o inactivo (rojo) */}
                  <td className="py-2 pr-2">
                    {u.activo ? (
                      <span className="text-xs text-[#b8f2b8] font-medium">Activo</span>
                    ) : (
                      <span className="text-xs text-[#ff6b6b] font-medium">Inactivo</span>
                    )}
                  </td>
                  {/* Fecha de registro formateada para México */}
                  <td className="py-2 pr-2 text-xs text-[#6b6460]">
                    {new Date(u.creado_en).toLocaleDateString('es-MX')}
                  </td>
                  {/* Botón de activar/desactivar; mientras actualiza muestra "···" */}
                  <td className="py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActivo(u)}
                      disabled={isUpdating}
                      className={`text-xs font-medium transition-colors disabled:opacity-50 ${
                        u.activo
                          ? 'text-[#ff6b6b] hover:text-[#ff4444]'   // Activo -> botón rojo
                          : 'text-[#b8f2b8] hover:text-[#a0e0a0]'   // Inactivo -> botón verde
                      }`}
                    >
                      {isUpdating ? '···' : u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {/* Mensaje si no hay usuarios */}
            {usuarios.length === 0 && !loading && (
              <tr><td colSpan="6" className="text-center py-8 text-[#6b6460] text-sm">Sin usuarios registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
