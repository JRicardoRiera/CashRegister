import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signOut } from '../lib/auth'
import ProductSearch from '../components/ProductSearch'
import CartPanel from '../components/CartPanel'
import CheckoutModal from '../components/CheckoutModal'

export default function PosPage() {
  const navigate = useNavigate()
  const [showCheckout, setShowCheckout] = useState(false)

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-[#131212] border-b border-[#2a2726] px-4 py-2.5 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#b8f2b8', color: '#131212' }}>
            <span className="font-bold text-sm font-[family-name:var(--font-mono)]">CR</span>
          </div>
          <h1 className="font-medium text-[#e8e3dd] text-sm hidden sm:block font-[family-name:var(--font-mono)] tracking-wide mr-4">
            CashRegister POS
          </h1>
          <Link to="/cajero/productos" className="text-xs text-[#6b6460] hover:text-[#e8e3dd] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-[#2a2726] transition-colors">
            Inventario
          </Link>
          <Link to="/cajero/mis-ventas" className="text-xs text-[#6b6460] hover:text-[#e8e3dd] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-[#2a2726] transition-colors">
            Mis Ventas
          </Link>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-[#6b6460] hover:text-[#d64545] transition-colors flex items-center gap-1.5 font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="hidden sm:inline">Salir</span>
        </button>
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
