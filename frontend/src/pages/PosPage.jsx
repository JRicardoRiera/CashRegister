import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signOut } from '../lib/auth'
import { supabase } from '../lib/supabase'
import ProductSearch from '../components/ProductSearch'
import CartPanel from '../components/CartPanel'
import CheckoutModal from '../components/CheckoutModal'

export default function PosPage() {
  const navigate = useNavigate()
  const [showCheckout, setShowCheckout] = useState(false)
  const [rol, setRol] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase
        .from('perfiles')
        .select('rol')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) setRol(data.rol)
        })
    })
  }, [])

  const isAdmin = rol === 'administrador'

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-[#131212] border-b border-[#2a2726] px-4 py-2.5 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-[0_0_8px_rgba(184,242,184,0.25)]" style={{ background: '#b8f2b8', color: '#131212' }}>
            <span className="font-bold text-sm font-[family-name:var(--font-mono)]">CR</span>
          </div>
          <h1 className="font-medium text-[#e8e3dd] text-sm hidden sm:block font-[family-name:var(--font-mono)] tracking-wide mr-3">
            CashRegister
          </h1>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded border border-[#2a2726] text-[#6b6460]">
            <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-[#b8f2b8] shadow-[0_0_4px_rgba(184,242,184,0.5)]' : 'bg-[#6b6460]'}`} />
            {rol || '···'}
          </span>
          {isAdmin && (
            <Link to="/admin" className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border border-[#1f3a1f] text-[#b8f2b8] hover:bg-[#1f3a1f] transition-colors">
              Panel
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link to="/cajero/productos" className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] hover:text-[#e8e3dd] px-2.5 py-1.5 rounded-lg hover:bg-[#2a2726] transition-colors">
            Inventario
          </Link>
          <Link to="/cajero/mis-ventas" className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] hover:text-[#e8e3dd] px-2.5 py-1.5 rounded-lg hover:bg-[#2a2726] transition-colors">
            Mis Ventas
          </Link>
          <button
            onClick={handleLogout}
            className="text-[10px] font-semibold uppercase tracking-wider text-[#6b6460] hover:text-[#d64545] px-2.5 py-1.5 rounded-lg hover:bg-[#2a2726] transition-colors ml-1"
          >
            Salir
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0" style={{ background: '#f7f5f0' }}>
          <ProductSearch />
        </div>
        <div className="w-[380px] lg:w-[420px] flex flex-col shrink-0 border-l border-[#2a2726]" style={{ background: '#131212' }}>
          <CartPanel onCheckout={() => setShowCheckout(true)} />
        </div>
      </div>

      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
    </div>
  )
}
