// ============================================================================
// CajeroLayout.jsx - Marco de navegación del cajero
// ----------------------------------------------------------------------------
// Es la barra superior (cabecera) que envuelve las pantallas del cajero:
// Caja (POS), Inventario y Mis Ventas. Incluye el logotipo, la navegación
// con indicación de la pestaña activa, un acceso al panel de administración
// (solo visible si el usuario es administrador) y el botón de "Salir".
// ----------------------------------------------------------------------------
// Nota: aunque el nombre pueda confundir, este componente no está registrado
// en el enrutador principal (App.jsx); se importa dentro de las páginas del
// cajero (PosPage, ProductosPage y MisVentasPage) para envolver su contenido.
// ============================================================================

import { useState, useEffect } from 'react'
// useNavigate: navegar entre rutas. useLocation: saber dónde estamos.
import { useNavigate, useLocation } from 'react-router-dom'
// signOut cierra la sesión; getSession devuelve la sesión actual.
import { signOut, getSession } from '../lib/auth'

// URL base de la API del backend (para consultar el rol del usuario).
const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// Elementos de la barra de navegación. "icon" indica qué SVG dibujar.
const NAV = [
  { path: '/', label: 'Caja', icon: 'pos' },
  { path: '/cajero/productos', label: 'Inventario', icon: 'box' },
  { path: '/cajero/mis-ventas', label: 'Mis Ventas', icon: 'receipt' },
]

// ---------------------------------------------------------------------------
// NavIcon({ type })
// Devuelve el icono SVG de la pestaña de navegación indicada.
// ---------------------------------------------------------------------------
function NavIcon({ type }) {
  // Icono de terminal de caja registradora (para la pestaña "Caja").
  if (type === 'pos') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
  // Icono de caja/cubo (para la pestaña "Inventario").
  if (type === 'box') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
  // Icono de ticket/recibo (para la pestaña "Mis Ventas").
  if (type === 'receipt') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="8" y1="15" x2="12" y2="15" />
    </svg>
  )
  return null
}

// Componente principal. Recibe "children" (el contenido de la página).
export default function CajeroLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  // Indica si el usuario actual es administrador (para mostrar el acceso).
  const [esAdmin, setEsAdmin] = useState(false)

  // Al montar, consultamos el rol del usuario para decidir si mostramos
  // el enlace al panel de administración.
  useEffect(() => {
    getSession().then(async (session) => {
      if (!session?.access_token) return
      try {
        const res = await fetch(`${API}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          // El backend responde con "profile.rol".
          setEsAdmin(data.profile?.rol === 'administrador')
        }
      } catch {}
    })
  }, [])

  // Cierra la sesión en Supabase y redirige al login.
  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  // ¿Estamos en la pantalla de caja? (ruta raíz "/")
  const esCaja = location.pathname === '/'

  return (
    // Contenedor a pantalla completa con fondo oscuro.
    <div className="h-screen flex flex-col" style={{ background: '#131212' }}>
      {/* Barra de navegación superior */}
      <nav className="flex items-center justify-between px-4 py-2 border-b border-[#2a2726] shrink-0 select-none">
        {/* Bloque izquierdo: logotipo + pestañas */}
        <div className="flex items-center gap-1">
          {/* Logotipo de la marca "CR" sobre fondo verde */}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center mr-2" style={{ background: '#b8f2b8' }}>
            <span className="font-bold text-xs font-[family-name:var(--font-mono)]" style={{ color: '#131212' }}>CR</span>
          </div>
          {/* Pestañas de navegación */}
          {NAV.map((item) => {
            // La pestaña raíz se marca activa solo con la ruta exacta "/";
            // el resto se marca si la ruta actual empieza por la suya.
            const activo = item.path === '/' ? esCaja : location.pathname.startsWith(item.path)
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activo
                    ? 'text-[#b8f2b8]'                       // Activa: verde
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

        {/* Bloque derecho: acceso admin + botón salir */}
        <div className="flex items-center gap-2">
          {/* Acceso al panel de administración (solo para admins).
              Color ámbar para diferenciarlo de las pestañas normales. */}
          {esAdmin && (
            <button onClick={() => navigate('/admin')}
              className="text-xs text-[#e8a040] hover:text-[#f0b850] font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Admin
            </button>
          )}
          {/* Botón de cierre de sesión */}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-[#6b6460] hover:text-[#d64545] font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {/* Icono de salida (flecha que sale de una puerta) */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Salir
          </button>
        </div>
      </nav>

      {/* Contenido de la página que envuelve este layout */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
