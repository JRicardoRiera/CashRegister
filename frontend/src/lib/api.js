import { supabase } from './supabase'

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  }
}

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export async function buscarProductos(q) {
  const headers = await authHeaders()
  const res = await fetch(`${API}/api/v1/productos?q=${encodeURIComponent(q)}&per_page=50`, { headers })
  if (!res.ok) throw new Error('Error al buscar productos')
  const data = await res.json()
  return data.items || data
}

export async function listarProductos(page = 1, perPage = 20, q = '') {
  const headers = await authHeaders()
  let url = `${API}/api/v1/productos?page=${page}&per_page=${perPage}`
  if (q) url += `&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error('Error al listar productos')
  return res.json()
}

export async function procesarVenta(body) {
  const headers = await authHeaders()
  const res = await fetch(`${API}/api/v1/ventas`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.detail || 'Error al procesar venta')
  }
  return res.json()
}
