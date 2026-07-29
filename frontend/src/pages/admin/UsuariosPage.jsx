import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${API}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
        })
        const me = await res.json()

        const { data: perfiles, error } = await supabase
          .from('perfiles')
          .select('*')
          .order('creado_en', { ascending: false })

        if (error) throw error
        setUsuarios(perfiles.filter((p) => p.id !== me.id))
      } catch (e) {
        setError(e.message)
      }
    }
    load()
  }, [])

  return (
    <div>
      <h2 className="text-lg font-bold text-[#e8e3dd] mb-6">Usuarios</h2>

      {error && (
        <div className="text-sm px-4 py-3 rounded-lg mb-4 font-medium" style={{ background: '#2d1515', color: '#ff6b6b' }}>
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2726] text-[#6b6460] text-xs uppercase tracking-wider">
              <th className="text-left py-2">Nombre</th>
              <th className="text-left py-2">Email</th>
              <th className="text-left py-2">Rol</th>
              <th className="text-left py-2">Registro</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-[#2a2726] hover:bg-[#1a1817] text-[#e8e3dd]">
                <td className="py-2 font-medium">{u.nombre_completo}</td>
                <td className="py-2 text-sm">{u.email}</td>
                <td className="py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.rol === 'administrador' ? 'text-[#b8f2b8]' : 'text-[#6b6460]'}`}
                    style={{ background: u.rol === 'administrador' ? '#1f3a1f' : '#2a2726' }}>
                    {u.rol}
                  </span>
                </td>
                <td className="py-2 text-xs text-[#6b6460]">{new Date(u.creado_en).toLocaleDateString('es-MX')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
