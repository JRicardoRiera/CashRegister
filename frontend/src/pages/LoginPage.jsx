import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signIn } from '../lib/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#131212' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#b8f2b8' }}>
            <span className="font-bold text-xl font-[family-name:var(--font-mono)]" style={{ color: '#131212' }}>CR</span>
          </div>
          <h1 className="text-2xl font-bold text-[#e8e3dd]">CashRegister</h1>
          <p className="text-[#6b6460] mt-1.5 text-sm">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" style={{ background: '#1a1817' }}>
          {error && (
            <div className="text-sm px-4 py-3 font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
              {error}
            </div>
          )}

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

          <div>
            <label className="block text-xs font-medium text-[#6b6460] mb-1.5 uppercase tracking-wider">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg focus:outline-none transition-colors"
              style={{ background: '#0f0f0f', color: '#e8e3dd', border: '2px solid #2a2726' }}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-bold text-sm transition-colors tracking-wide"
            style={{ background: '#b8f2b8', color: '#131212' }}
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>

          <p className="text-center text-sm text-[#6b6460]">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-medium" style={{ color: '#b8f2b8' }}>Crear cuenta</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
