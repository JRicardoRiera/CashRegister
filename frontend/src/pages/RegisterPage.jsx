// ============================================================================
// RegisterPage.jsx - Página de registro de nuevos usuarios
// ----------------------------------------------------------------------------
// Pantalla pública para crear una cuenta. Pide nombre completo, email y
// contraseña (con confirmación). La creación del usuario la hace el backend
// de FastAPI (signUp), que a su vez crea el perfil con rol "cajero" por
// defecto. Tras el éxito muestra una pantalla de confirmación con el botón
// para ir al login.
// ============================================================================

import { useState } from 'react'
// useNavigate: navegar tras registrarse. Link: enlaces de React Router.
import { useNavigate, Link } from 'react-router-dom'
// Función que registra al usuario vía el backend.
import { signUp } from '../lib/auth'

export default function RegisterPage() {
  // Campos del formulario.
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // Error a mostrar (vacío = sin errores).
  const [error, setError] = useState('')
  // Marca si el registro terminó correctamente (cambia la pantalla).
  const [success, setSuccess] = useState(false)
  // Estado de carga del botón.
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // -------------------------------------------------------------------------
  // handleSubmit(e)
  // Valida el formulario en el cliente y llama al backend para crear la
  // cuenta. No inicia sesión automáticamente: redirige al login.
  // -------------------------------------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault() // Evita la recarga de la página.
    setError('')       // Limpiamos errores previos.

    // Validación 1: las contraseñas deben coincidir.
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    // Validación 2: longitud mínima de la contraseña.
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    // Llamamos al backend para crear la cuenta (email, password, nombre).
    const { error } = await signUp(email, password, nombre)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Registro correcto: mostramos la pantalla de éxito.
    setSuccess(true)
  }

  // Pantalla de éxito (después de registrarse).
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#131212' }}>
        <div className="w-full max-w-sm p-6 text-center" style={{ background: '#1a1817' }}>
          {/* Icono de check verde */}
          <svg className="w-12 h-12 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="#b8f2b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h2 className="text-xl font-bold text-[#e8e3dd] mb-2">Cuenta creada</h2>
          <p className="text-[#6b6460] text-sm mb-6">
            Ahora puedes iniciar sesión con tu correo y contraseña.
          </p>
          {/* Botón que lleva al login */}
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 rounded-lg font-bold text-sm transition-colors tracking-wide"
            style={{ background: '#b8f2b8', color: '#131212' }}
          >
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    )
  }

  // Formulario de registro.
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#131212' }}>
      <div className="w-full max-w-sm">
        {/* Cabecera con el logotipo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#b8f2b8' }}>
            <span className="font-bold text-xl font-[family-name:var(--font-mono)]" style={{ color: '#131212' }}>CR</span>
          </div>
          <h1 className="text-2xl font-bold text-[#e8e3dd]">Crear cuenta</h1>
          <p className="text-[#6b6460] mt-1.5 text-sm">Regístrate para usar CashRegister</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" style={{ background: '#1a1817' }}>
          {/* Caja de error */}
          {error && (
            <div className="text-sm px-4 py-3 font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
              {error}
            </div>
          )}

          {/* Nombre completo */}
          <div>
            <label className="block text-xs font-medium text-[#6b6460] mb-1.5 uppercase tracking-wider">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none transition-colors"
              style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }}
              placeholder="Tu nombre"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-[#6b6460] mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none transition-colors"
              style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }}
              placeholder="tu@correo.com"
              required
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs font-medium text-[#6b6460] mb-1.5 uppercase tracking-wider">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none transition-colors"
              style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          {/* Confirmación de contraseña */}
          <div>
            <label className="block text-xs font-medium text-[#6b6460] mb-1.5 uppercase tracking-wider">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none transition-colors"
              style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }}
              placeholder="Repite la contraseña"
              required
            />
          </div>

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-bold text-sm transition-colors tracking-wide"
            style={{ background: '#b8f2b8', color: '#131212' }}
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          {/* Enlace al login */}
          <p className="text-center text-sm text-[#6b6460]">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium" style={{ color: '#b8f2b8' }}>Iniciar sesión</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
