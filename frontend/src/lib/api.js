// ============================================================================
// api.js - Cliente HTTP para el POS (Punto de Venta)
// ----------------------------------------------------------------------------
// Contiene las funciones que usa la pantalla del cajero para comunicarse con
// el backend de FastAPI: búsqueda de productos, listado de productos y
// procesamiento de ventas. Todas las llamadas llevan el JWT de Supabase en
// la cabecera Authorization para que el backend pueda autenticarlas.
// ============================================================================

// Importamos el cliente de Supabase para obtener la sesión y su token.
import { supabase } from './supabase'

// ---------------------------------------------------------------------------
// authHeaders()
// Construye las cabeceras HTTP comunes a todas las peticiones.
// Incluye el token JWT de la sesión actual; si no hay sesión, se manda un
// token vacío (el backend rechazará la petición con un 401).
// ---------------------------------------------------------------------------
async function authHeaders() {
  // Obtenemos la sesión activa de Supabase.
  const { data: { session } } = await supabase.auth.getSession()
  return {
    // Indicamos que el cuerpo de la petición es JSON.
    'Content-Type': 'application/json',
    // Esquema de autorización estándar: "Bearer <token>".
    // El backend validará este JWT para saber quién hace la petición.
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  }
}

// URL base de la API de FastAPI (configurable vía .env).
const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// ---------------------------------------------------------------------------
// buscarProductos(q)
// Busca productos por nombre o código según el texto "q".
// Se usa en el buscador del POS. Limita a 50 resultados por página para no
// saturar la interfaz con datos innecesarios.
// ---------------------------------------------------------------------------
export async function buscarProductos(q) {
  const headers = await authHeaders()
  // encodeURIComponent escapa caracteres especiales (espacios, tildes...) que
  // no pueden ir tal cual en una URL.
  const res = await fetch(`${API}/api/v1/productos?q=${encodeURIComponent(q)}&per_page=50`, { headers })
  // Si el backend devuelve un error, lanzamos una excepción con mensaje.
  if (!res.ok) throw new Error('Error al buscar productos')
  const data = await res.json()
  // El backend devuelve un objeto paginado con la propiedad "items";
  // si por algún motivo viene sin paginar, devolvemos el objeto completo.
  return data.items || data
}

// ---------------------------------------------------------------------------
// listarProductos(page, perPage, q)
// Lista productos con paginación. Se usa en las pantallas de administración
// de productos. Permite filtrar por texto (q) y controlar página y tamaño.
// Devuelve la respuesta completa (items + total + paginación).
// ---------------------------------------------------------------------------
export async function listarProductos(page = 1, perPage = 20, q = '') {
  const headers = await authHeaders()
  // Construimos la URL con los parámetros de paginación.
  let url = `${API}/api/v1/productos?page=${page}&per_page=${perPage}`
  // Si hay búsqueda, la añadimos como parámetro extra.
  if (q) url += `&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error('Error al listar productos')
  return res.json()
}

// ---------------------------------------------------------------------------
// procesarVenta(body)
// Envía una venta al backend (método POST /api/v1/ventas).
// "body" es el carrito completo: los productos con sus cantidades, la forma
// de pago, los totales, etc. El backend es quien descuenta el stock y crea
// los registros de venta en la base de datos.
// ---------------------------------------------------------------------------
export async function procesarVenta(body) {
  const headers = await authHeaders()
  const res = await fetch(`${API}/api/v1/ventas`, {
    method: 'POST',
    headers,
    // Convertimos el objeto del carrito a JSON.
    body: JSON.stringify(body),
  })
  // Si el backend rechaza la venta (stock insuficiente, validación...)...
  if (!res.ok) {
    // Leemos el error; si el cuerpo no es JSON, usamos un objeto vacío.
    const err = await res.json().catch(() => ({}))
    // FastAPI devuelve "detail" como string (error simple) o como array
    // de errores de validación (cada uno con su campo "msg").
    const msg = Array.isArray(err.detail)
      ? err.detail.map((d) => d.msg).join('; ')
      : err.detail || 'Error al procesar venta'
    throw new Error(msg)
  }
  return res.json()
}
