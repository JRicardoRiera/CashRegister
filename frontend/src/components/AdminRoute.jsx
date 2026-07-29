import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getSession } from '../lib/auth'

export default function AdminRoute({ children }) {
  const [state, setState] = useState({ loading: true, isAdmin: false })

  useEffect(() => {
    async function check() {
      const { session } = await getSession()
      if (!session) {
        setState({ loading: false, isAdmin: false })
        return
      }

      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/v1/auth/me`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        )
        const data = await res.json()
        setState({ loading: false, isAdmin: data.profile?.rol === 'administrador' })
      } catch {
        setState({ loading: false, isAdmin: false })
      }
    }
    check()
  }, [])

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#131212' }}>
        <div className="w-5 h-5 border-2 border-[#b8f2b8] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!state.isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
