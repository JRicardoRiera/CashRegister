// ============================================================================
// PosPage.jsx - Pantalla principal del Punto de Venta (POS)
// ----------------------------------------------------------------------------
// Es la pantalla a la que llega el usuario tras iniciar sesión. Está dividida
// en dos zonas:
//   - Izquierda: el catálogo/buscador de productos (ProductSearch).
//   - Derecha: el carrito de la compra (CartPanel), con el botón "Cobrar"
//     que abre el modal de pago (CheckoutModal).
// En la cabecera se muestra el logotipo, el rol del usuario, accesos rápidos
// (Inventario, Mis Ventas, Panel si es admin) y el botón de "Salir".
// ============================================================================

import { useState, useEffect } from 'react'
// useNavigate para el logout; Link para enlaces de navegación.
import { useNavigate, Link } from 'react-router-dom'
// Cierre de sesión.
import { signOut } from '../lib/auth'
// Cliente de Supabase (para consultar el rol del usuario).
import { supabase } from '../lib/supabase'
// Componentes que componen la pantalla.
import ProductSearch from '../components/ProductSearch'
import CartPanel from '../components/CartPanel'
import CheckoutModal from '../components/CheckoutModal'

export default function PosPage() {
  const navigate = useNavigate()
  // Controla si el modal de cobro está abierto.
  const [showCheckout, setShowCheckout] = useState(false)
  // Rol del usuario logueado (null hasta que se cargue).
  const [rol, setRol] = useState(null)

  // Al montar, leemos el rol del usuario desde la tabla "perfiles".
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Sin sesión no podemos consultar nada.
      if (!session) return
      supabase
        .from('perfiles')
        .select('rol')
        // El perfil se identifica con el mismo id que el usuario de auth.
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) setRol(data.rol)
        })
    })
  }, [])

  // ¿El usuario logueado es administrador? (para mostrar el acceso al Panel)
  const isAdmin = rol === 'administrador'

  // Cierra la sesión y redirige al login.
  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    // Contenedor a pantalla completa en columna.
    <div className="h-screen flex flex-col">
      {/* Cabecera superior */}
      <header className="bg-[#131212] border-b border-[#2a2726] px-4 py-2.5 flex items-center justify-between shrink-0 select-none">
        {/* Bloque izquierdo: logotipo, título, rol y acceso al panel */}
        <div className="flex items-center gap-2">
          {/* Logotipo "CR" con un leve resplandor verde */}
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(184,242,184,0.25)]" style={{ background: '#b8f2b8', color: '#131212' }}>
            <span className="font-bold text-sm font-[family-name:var(--font-mono)]">CR</span>
          </div>
          {/* Nombre de la aplicación (oculto en pantallas muy pequeñas) */}
          <h1 className="font-medium text-[#e8e3dd] text-sm hidden sm:block font-[family-name:var(--font-mono)] tracking-wide mr-3">
            CashRegister
          </h1>
          {/* Etiqueta con el rol del usuario; la bolita se ilumina en verde
              si es administrador */}
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded border border-[#2a2726] text-[#6b6460]">
            <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-[#b8f2b8] shadow-[0_0_4px_rgba(184,242,184,0.5)]' : 'bg-[#6b6460]'}`} />
            {rol || '···'}
          </span>
          {/* Enlace al panel de administración (solo si es admin) */}
          {isAdmin && (
            <Link to="/admin" className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border border-[#1f3a1f] text-[#b8f2b8] hover:bg-[#1f3a1f] transition-colors">
              Panel
            </Link>
          )}
        </div>

        {/* Bloque derecho: accesos rápidos y salida */}
        <div className="flex items-center gap-1">
          <Link to="/cajero/productos" className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] hover:text-[#e8e3dd] px-2.5 py-1.5 rounded-lg hover:bg-[#2a2726] transition-colors">
            Inventario
          </Link>
          <Link to="/cajero/mis-ventas" className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] hover:text-[#e8e3dd] px-2.5 py-1.5 rounded-lg hover:bg-[#2a2726] transition-colors">
            Mis Ventas
          </Link>
          {/* Botón de cierre de sesión */}
          <button
            onClick={handleLogout}
            className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] hover:text-[#d64545] px-2.5 py-1.5 rounded-lg hover:bg-[#2a2726] transition-colors ml-1"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Cuerpo: catálogo a la izquierda y carrito a la derecha */}
      <div className="flex-1 flex overflow-hidden">
        {/* Zona del catálogo (fondo claro) */}
        <div className="flex-1 flex flex-col min-w-0" style={{ background: '#f7f5f0' }}>
          <ProductSearch />
        </div>
        {/* Zona del carrito (fondo oscuro, ancho fijo). min-w-0 y shrink-0
            evitan que se comprima en pantallas estrechas. */}
        <div className="w-[380px] lg:w-[420px] flex flex-col shrink-0 border-l border-[#2a2726]" style={{ background: '#131212' }}>
          <CartPanel onCheckout={() => setShowCheckout(true)} />
        </div>
      </div>

      {/* Modal de cobro; se monta solo cuando se pulsa "Cobrar" */}
      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
    </div>
  )
}
