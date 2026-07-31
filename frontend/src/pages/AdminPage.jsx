// ============================================================================
// AdminPage.jsx - Panel de administración (marco y sub-rutas)
// ----------------------------------------------------------------------------
// Es el "esqueleto" del panel de administración: una barra lateral izquierda
// con el logotipo y la navegación (Dashboard, Productos, Categorías, Ventas,
// Usuarios), botones para volver al POS y para salir, y la zona central que
// renderiza la sub-página activa mediante rutas anidadas de React Router.
//
// La URL de esta página es /admin/* (ver App.jsx) y está protegida por
// ProtectedRoute + AdminRoute, por lo que solo un administrador autenticado
// puede verla.
// ============================================================================

import { useNavigate, Routes, Route } from 'react-router-dom'
// Sub-páginas del panel de administración.
import DashboardPage from './admin/DashboardPage'
import ProductosPage from './admin/ProductosPage'
import CategoriasPage from './admin/CategoriasPage'
import VentasPage from './admin/VentasPage'
import UsuariosPage from './admin/UsuariosPage'
// Cierre de sesión.
import { signOut } from '../lib/auth'

// Elementos de la barra lateral. "icon" indica qué SVG dibujar.
const NAV = [
  { path: '/admin', label: 'Dashboard', icon: 'grid' },
  { path: '/admin/productos', label: 'Productos', icon: 'box' },
  { path: '/admin/categorias', label: 'Categorías', icon: 'tag' },
  { path: '/admin/ventas', label: 'Ventas', icon: 'receipt' },
  { path: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
]

// ---------------------------------------------------------------------------
// NavIcon({ type })
// Devuelve el icono SVG correspondiente a cada elemento de navegación.
// ---------------------------------------------------------------------------
function NavIcon({ type }) {
  // Icono de caja (Productos).
  if (type === 'box') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
  // Icono de etiqueta (Categorías).
  if (type === 'tag') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
  // Icono de recibo (Ventas).
  if (type === 'receipt') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
      <line x1="8" y1="7" x2="16" y2="7" /><line x1="8" y1="11" x2="14" y2="11" /><line x1="8" y1="15" x2="12" y2="15" />
    </svg>
  )
  // Icono de cuadrícula (Dashboard).
  if (type === 'grid') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  )
  // Icono de usuarios (Usuarios).
  if (type === 'users') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
  return null
}

// Componente principal del panel.
export default function AdminPage() {
  const navigate = useNavigate()

  // Cierra la sesión y redirige al login.
  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    // Contenedor a pantalla completa con barra lateral (flex en fila).
    <div className="h-screen flex" style={{ background: '#131212' }}>
      {/* Barra lateral de navegación */}
      <nav className="w-56 flex flex-col border-r border-[#2a2726] shrink-0" style={{ background: '#1a1817' }}>
        {/* Cabecera de la barra: logotipo + nombre "Admin" */}
        <div className="px-4 py-4 border-b border-[#2a2726]">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#b8f2b8' }}>
              <span className="font-bold text-xs font-[family-name:var(--font-mono)]" style={{ color: '#131212' }}>CR</span>
            </div>
            <span className="text-sm font-semibold text-[#e8e3dd]">Admin</span>
          </button>
        </div>

        {/* Botones de navegación a las sub-páginas */}
        <div className="flex-1 py-3 space-y-0.5">
          {NAV.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#6b6460] hover:text-[#e8e3dd] hover:bg-[#2a2726] transition-colors text-left"
            >
              <NavIcon type={item.icon} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Zona inferior: volver al POS y salir */}
        <div className="border-t border-[#2a2726] p-4">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#6b6460] hover:text-[#e8e3dd] transition-colors mb-2"
          >
            {/* Icono de casa */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            POS
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#6b6460] hover:text-[#d64545] transition-colors"
          >
            {/* Icono de salida */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Salir
          </button>
        </div>
      </nav>

      {/* Zona central con la sub-página activa */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {/* Rutas anidadas: al estar AdminPage montada en /admin/*, estas
              rutas relativas se resuelven respecto a /admin. El "index" se
              muestra en /admin, el resto en /admin/productos, etc. */}
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="ventas" element={<VentasPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
