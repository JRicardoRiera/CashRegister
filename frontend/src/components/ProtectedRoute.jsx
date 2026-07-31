// ============================================================================
// ProtectedRoute.jsx - Guardia de ruta para usuarios autenticados
// ----------------------------------------------------------------------------
// Este componente envuelve a cualquier página que requiera estar logueado.
// Mientras comprueba la sesión muestra un spinner de carga; si no hay sesión
// redirige al login; y si la hay, renderiza el contenido (los "children").
// Se usa en App.jsx alrededor de las rutas del POS y del panel de admin.
// ============================================================================

// useEffect para ejecutar la comprobación al montar, useState para el estado.
import { useEffect, useState } from 'react'
// Navigate redirige programáticamente a otra ruta.
import { Navigate } from 'react-router-dom'
// getSession devuelve la sesión actual de Supabase.
import { getSession } from '../lib/auth'

// El componente recibe "children" (las páginas que protege) como prop.
export default function ProtectedRoute({ children }) {
  // loading: indica si todavía estamos comprobando la sesión.
  const [loading, setLoading] = useState(true)
  // session: la sesión activa (null si no hay).
  const [session, setSession] = useState(null)

  // Al montar el componente, pedimos la sesión una sola vez ([] = sin deps).
  useEffect(() => {
    // getSession devuelve { session, error }; extraemos la sesión.
    getSession().then(({ session }) => {
      setSession(session)
      setLoading(false)
    })
  }, [])

  // Mientras carga, mostramos un spinner centrado en pantalla.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {/* Spinner circular animado hecho solo con Tailwind */}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Si no hay sesión, redirigimos al login.
  // "replace" evita que el botón "atrás" devuelva al usuario a la ruta
  // protegida a la que no tenía acceso.
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Hay sesión: renderizamos el contenido protegido.
  return children
}
