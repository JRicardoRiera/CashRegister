// ============================================================================
// adminApi.js - Cliente HTTP para funciones de administración
// ----------------------------------------------------------------------------
// Agrupa todas las llamadas a la API que realiza el panel de administración:
// gestión de productos, categorías, ventas, usuarios y el dashboard con las
// estadísticas del negocio. Centraliza la lógica de peticiones en una única
// función genérica "request" y expone objetos con nombres legibles.
// ============================================================================

// Importamos el cliente de Supabase para obtener el JWT de la sesión.
import { supabase } from './supabase'

// URL base de la API de FastAPI (configurable vía .env).
const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// ---------------------------------------------------------------------------
// authHeaders()
// Prepara las cabeceras HTTP con el token de autorización de la sesión.
// El backend valida este JWT y comprueba que el usuario tenga rol
// "administrador" para los endpoints de /api/v1/admin.
// ---------------------------------------------------------------------------
async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  }
}

// ---------------------------------------------------------------------------
// request(method, path, body)
// Función genérica que ejecuta cualquier petición HTTP contra el backend.
// Es la base sobre la que se construyen todas las demás llamadas.
//   - method: 'GET', 'POST', 'PUT' o 'DELETE'.
//   - path: ruta de la API, p. ej. "/api/v1/productos".
//   - body: datos a enviar (se ignora en peticiones GET o DELETE sin cuerpo).
// ---------------------------------------------------------------------------
async function request(method, path, body = null) {
  const headers = await authHeaders()
  // Construimos las opciones de la petición con método y cabeceras.
  const opts = { method, headers }
  // Solo añadimos cuerpo cuando lo hay (evita errores en GET/DELETE).
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API}${path}`, opts)
  // Si la respuesta es un error (4xx o 5xx)...
  if (!res.ok) {
    // Intentamos leer el detalle; si no es JSON, usamos un objeto vacío.
    const err = await res.json().catch(() => ({}))
    // Lanzamos excepción con el mensaje que envía FastAPI (campo detail)
    // o, si no existe, con el código de estado HTTP.
    throw new Error(err.detail || `Error ${res.status}`)
  }
  // HTTP 204 = "sin contenido": devolvemos null (p. ej. tras un DELETE).
  if (res.status === 204) return null
  // En el resto de casos devolvemos el JSON de la respuesta.
  return res.json()
}

// ---------------------------------------------------------------------------
// productosApi
// Operaciones CRUD sobre productos.
// Incluye "ajustarStock", que permite corregir manualmente el stock de un
// producto sin pasar por una venta (p. ej. al hacer un inventario).
// ---------------------------------------------------------------------------
export const productosApi = {
  // Lista los productos; si se pasa "q", filtra por texto de búsqueda.
  list: (q) => request('GET', `/api/v1/productos?per_page=100${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  // Devuelve un producto concreto por su id.
  get: (id) => request('GET', `/api/v1/productos/${id}`),
  // Crea un producto nuevo.
  create: (data) => request('POST', '/api/v1/productos', data),
  // Actualiza un producto existente.
  update: (id, data) => request('PUT', `/api/v1/productos/${id}`, data),
  // Elimina un producto (el backend decidirá si es borrado físico o lógico).
  remove: (id) => request('DELETE', `/api/v1/productos/${id}`),
  // Ajusta el stock de un producto (inventario manual).
  ajustarStock: (id, data) => request('POST', `/api/v1/productos/${id}/ajustar-stock`, data),
}

// ---------------------------------------------------------------------------
// categoriasApi
// Operaciones CRUD sobre categorías de productos.
// ---------------------------------------------------------------------------
export const categoriasApi = {
  list: () => request('GET', '/api/v1/categorias'),
  create: (data) => request('POST', '/api/v1/categorias', data),
  update: (id, data) => request('PUT', `/api/v1/categorias/${id}`, data),
  remove: (id) => request('DELETE', `/api/v1/categorias/${id}`),
}

// ---------------------------------------------------------------------------
// ventasApi
// Consulta de ventas. Permite filtrar por rango de fechas (desde/hasta),
// lo que se usa en la pantalla de ventas del panel de administración.
// ---------------------------------------------------------------------------
export const ventasApi = {
  // Lista ventas con filtros opcionales de fecha.
  list: (desde, hasta) => {
    let path = '/api/v1/ventas'
    // Acumulamos los parámetros que el usuario haya indicado.
    const params = []
    if (desde) params.push(`desde=${encodeURIComponent(desde)}`)
    if (hasta) params.push(`hasta=${encodeURIComponent(hasta)}`)
    // Solo añadimos el signo "?" si hay parámetros que enviar.
    if (params.length) path += `?${params.join('&')}`
    return request('GET', path)
  },
  // Devuelve el detalle de una venta concreta (con sus líneas).
  get: (id) => request('GET', `/api/v1/ventas/${id}`),
}

// ---------------------------------------------------------------------------
// usuariosApi
// Gestión de usuarios desde el panel de administración (cambiar rol, etc.).
// ---------------------------------------------------------------------------
export const usuariosApi = {
  list: () => request('GET', '/api/v1/admin/usuarios'),
  get: (id) => request('GET', `/api/v1/admin/usuarios/${id}`),
  update: (id, data) => request('PUT', `/api/v1/admin/usuarios/${id}`, data),
}

// ---------------------------------------------------------------------------
// dashboardApi
// Estadísticas resumidas del negocio para la pantalla de inicio del admin.
// ---------------------------------------------------------------------------
export const dashboardApi = {
  get: () => request('GET', '/api/v1/admin/dashboard'),
}
