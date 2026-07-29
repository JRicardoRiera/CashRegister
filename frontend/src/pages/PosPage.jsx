import { useNavigate } from 'react-router-dom'
import { signOut } from '../lib/auth'

export default function PosPage() {
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Web Cash Register</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 mb-2">Módulo POS</p>
          <p className="text-gray-500">Aquí irá la caja registradora (Fase 3)</p>
        </div>
      </main>
    </div>
  )
}
