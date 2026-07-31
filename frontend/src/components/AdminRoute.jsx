// ============================================================================
// AdminRoute.jsx - Guardia de ruta para administradores
// ----------------------------------------------------------------------------
// Igual que ProtectedRoute, pero además comprueba que el usuario autenticado
// tenga el rol "administrador". Se usa para proteger todas las rutas
// del panel de administración (/admin/*). Si el usuario no es admin, se le
// redirige a la página raíz (el POS del cajero).
// ============================================================================

import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getSession } from '../lib/auth'

// El componente recibe "children" (el panel de administración) como prop.
export default function AdminRoute({ children }) {
  // Guardamos en un único estado la carga y si el usuario es admin.
  const [state, setState] = useState({ loading: true, isAdmin: false })

  // Al montar, comprobamos sesión y rol una sola vez ([] = sin deps).
  useEffect(() => {
    // Función interna que hace la comprobación completa.
    async function check() {
      // 1) Pedimos la sesión a Supabase.
      const { session } = await getSession()
      // Si no hay sesión, no es admin: terminamos.
      if (!session) {
        setState({ loading: false, isAdmin: false })
        return
      }

      // 2) Hay sesión: preguntamos al backend quién es el usuario.
      //    El endpoint /api/v1/auth/me devuelve el perfil con el rol.
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/v1/auth/me`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        )
        const data = await res.json()
        // Es admin si su perfil dice "administrador".
        setState({ loading: false, isAdmin: data.profile?.rol === 'administrador' })
      } catch {
        // Si el backend falla, por seguridad NO concedemos acceso admin.
        setState({ loading: false, isAdmin: false })
      }
    }
    check()
  }, [])

  // Mientras comprobamos, mostramos un spinner con el fondo oscuro
  // característico de las pantallas de registro.
  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#131212' }}>
        {/* Spinner circular animado con el verde de la marca */}
        <div className="w-5 h-5 border-2 border-[#b8f2b8] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Si no es admin (o no hay sesión), lo enviamos al POS.
  if (!state.isAdmin) {
    return <Navigate to="/" replace />
  }

  // Es admin: renderizamos el panel de administración.
  return children
}
