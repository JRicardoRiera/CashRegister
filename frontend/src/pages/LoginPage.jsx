// ============================================================================
// LoginPage.jsx - Página de inicio de sesión
// ----------------------------------------------------------------------------
// Pantalla pública para que el usuario entre con su email y contraseña.
// La autenticación la realiza Supabase (signIn) y, si es correcta, se
// redirige a la página principal del POS. Incluye manejo de errores y un
// enlace a la página de registro.
// ============================================================================

import { useState } from 'react'
// useNavigate: navegar tras el login. Link: enlace de React Router.
import { useNavigate, Link } from 'react-router-dom'
// Función de autenticación de Supabase.
import { signIn } from '../lib/auth'

export default function LoginPage() {
  // Campos del formulario.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Mensaje de error a mostrar (vacío = sin errores).
  const [error, setError] = useState('')
  // Estado de carga para deshabilitar el botón mientras se procesa.
  const [loading, setLoading] = useState(false)
  // Hook para navegar a otras rutas.
  const navigate = useNavigate()

  // -------------------------------------------------------------------------
  // handleSubmit(e)
  // Se ejecuta al enviar el formulario. Llama a signIn de Supabase y, si
  // todo va bien, redirige al POS.
  // -------------------------------------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault() // Evita que el navegador recargue la página.
    setError('')       // Limpiamos errores anteriores.
    setLoading(true)   // Activamos el estado de carga.

    // Llamamos a Supabase con email y contraseña.
    const { error } = await signIn(email, password)
    if (error) {
      // Si hay error (credenciales incorrectas, etc.), lo mostramos.
      setError(error.message)
      setLoading(false)
      return
    }

    // Login correcto: vamos al POS.
    navigate('/')
  }

  return (
    // Fondo oscuro centrado a pantalla completa.
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#131212' }}>
      <div className="w-full max-w-sm">
        {/* Cabecera con el logotipo de la marca */}
        <div className="text-center mb-8">
          {/* Logotipo "CR" sobre fondo verde */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#b8f2b8' }}>
            <span className="font-bold text-xl font-[family-name:var(--font-mono)]" style={{ color: '#131212' }}>CR</span>
          </div>
          <h1 className="text-2xl font-bold text-[#e8e3dd]">CashRegister</h1>
          <p className="text-[#6b6460] mt-1.5 text-sm">Inicia sesión para continuar</p>
        </div>

        {/* Formulario de login */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" style={{ background: '#1a1817' }}>
          {/* Caja de error (solo visible si hay un error) */}
          {error && (
            <div className="text-sm px-4 py-3 font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
              {error}
            </div>
          )}

          {/* Campo de email */}
          <div>
            <label className="block text-xs font-medium text-[#6b6460] mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none transition-colors"
              style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }}
              placeholder="tu@correo.com"
              required // El navegador impide enviar sin email válido
            />
          </div>

          {/* Campo de contraseña */}
          <div>
            <label className="block text-xs font-medium text-[#6b6460] mb-1.5 uppercase tracking-wider">Contraseña</label>
            <input
              type="password" // type="password" oculta el texto tecleado
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none transition-colors"
              style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }}
              placeholder="••••••••"
              required
            />
          </div>

          {/* Botón de envío. Se deshabilita mientras carga. */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-bold text-sm transition-colors tracking-wide"
            style={{ background: '#b8f2b8', color: '#131212' }}
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>

          {/* Enlace a la página de registro */}
          <p className="text-center text-sm text-[#6b6460]">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-medium" style={{ color: '#b8f2b8' }}>Crear cuenta</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
