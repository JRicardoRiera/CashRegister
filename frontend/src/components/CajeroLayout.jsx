import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut, getSession } from '../lib/auth'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const NAV = [
  { path: '/', label: 'Caja', icon: 'pos' },
  { path: '/cajero/productos', label: 'Inventario', icon: 'box' },
  { path: '/cajero/mis-ventas', label: 'Mis Ventas', icon: 'receipt' },
]

function NavIcon({ type }) {
  if (type === 'pos') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
  if (type === 'box') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
  if (type === 'receipt') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="8" y1="15" x2="12" y2="15" />
    </svg>
  )
  return null
}

export default function CajeroLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [esAdmin, setEsAdmin] = useState(false)

  useEffect(() => {
    getSession().then(async (session) => {
      if (!session?.access_token) return
      try {
        const res = await fetch(`${API}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setEsAdmin(data.profile?.rol === 'administrador')
        }
      } catch {}
    })
  }, [])

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const esCaja = location.pathname === '/'

  return (
    <div className="h-screen flex flex-col" style={{ background: '#131212' }}>
      <nav className="flex items-center justify-between px-4 py-2 border-b border-[#2a2726] shrink-0 select-none">
        <div className="flex items-center gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2" style={{ background: '#b8f2b8' }}>
            <span className="font-bold text-xs font-[family-name:var(--font-mono)]" style={{ color: '#131212' }}>CR</span>
          </div>
          {NAV.map((item) => {
            const activo = item.path === '/' ? esCaja : location.pathname.startsWith(item.path)
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activo
                    ? 'text-[#b8f2b8]'
                    : 'text-[#6b6460] hover:text-[#e8e3dd] hover:bg-[#2a2726]'
                }`}
                style={activo ? { background: '#1f3a1f' } : {}}
              >
                <NavIcon type={item.icon} />
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          {esAdmin && (
            <button onClick={() => navigate('/admin')}
              className="text-xs text-[#e8a040] hover:text-[#f0b850] font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Admin
            </button>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-[#6b6460] hover:text-[#d64545] font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Salir
          </button>
        </div>
      </nav>

      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
