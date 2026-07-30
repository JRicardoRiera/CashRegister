import { supabase } from './supabase'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  }
}

async function request(method, path, body = null) {
  const headers = await authHeaders()
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Error ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const productosApi = {
  list: (q) => request('GET', `/api/v1/productos?per_page=100${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  get: (id) => request('GET', `/api/v1/productos/${id}`),
  create: (data) => request('POST', '/api/v1/productos', data),
  update: (id, data) => request('PUT', `/api/v1/productos/${id}`, data),
  remove: (id) => request('DELETE', `/api/v1/productos/${id}`),
  ajustarStock: (id, data) => request('POST', `/api/v1/productos/${id}/ajustar-stock`, data),
}

export const categoriasApi = {
  list: () => request('GET', '/api/v1/categorias'),
  create: (data) => request('POST', '/api/v1/categorias', data),
  update: (id, data) => request('PUT', `/api/v1/categorias/${id}`, data),
  remove: (id) => request('DELETE', `/api/v1/categorias/${id}`),
}

export const ventasApi = {
  list: (desde, hasta) => {
    let path = '/api/v1/ventas'
    const params = []
    if (desde) params.push(`desde=${encodeURIComponent(desde)}`)
    if (hasta) params.push(`hasta=${encodeURIComponent(hasta)}`)
    if (params.length) path += `?${params.join('&')}`
    return request('GET', path)
  },
  get: (id) => request('GET', `/api/v1/ventas/${id}`),
}

export const usuariosApi = {
  list: () => request('GET', '/api/v1/admin/usuarios'),
  get: (id) => request('GET', `/api/v1/admin/usuarios/${id}`),
  update: (id, data) => request('PUT', `/api/v1/admin/usuarios/${id}`, data),
}

export const dashboardApi = {
  get: () => request('GET', '/api/v1/admin/dashboard'),
}
