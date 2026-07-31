// ============================================================================
// auth.js - Funciones de autenticación
// ----------------------------------------------------------------------------
// Aquí se agrupan todas las operaciones relacionadas con la autenticación:
// registro, inicio de sesión, cierre de sesión, obtención de la sesión actual
// y lectura del perfil del usuario. Estas funciones son consumidas por las
// páginas de Login y Registro, y por los componentes que protegen las rutas.
// ============================================================================

// Importamos el cliente de Supabase creado en lib/supabase.js.
import { supabase } from './supabase'

// URL base de la API de FastAPI. Podemos sobrescribirla con la variable
// VITE_API_URL del archivo .env; si no existe, usamos la dirección local
// por defecto del backend en desarrollo.
const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// ---------------------------------------------------------------------------
// signUp(email, password, nombreCompleto)
// Registra un nuevo usuario llamando al backend de FastAPI.
// Hemos delegado el registro al backend (en vez de a Supabase directamente)
// porque necesitamos crear también el perfil del usuario en la tabla
// "perfiles" con su rol por defecto.
// ---------------------------------------------------------------------------
export async function signUp(email, password, nombreCompleto) {
  try {
    // Llamada HTTP POST al endpoint /api/v1/auth/signup del backend.
    const res = await fetch(`${API}/api/v1/auth/signup`, {
      method: 'POST',
      // Indicamos que enviamos datos en formato JSON.
      headers: { 'Content-Type': 'application/json' },
      // El backend espera el nombre completo en snake_case (nombre_completo).
      body: JSON.stringify({ email, password, nombre_completo: nombreCompleto }),
    })
    // Si la respuesta no es correcta (código 4xx o 5xx)...
    if (!res.ok) {
      // Intentamos leer el detalle del error que devuelve FastAPI.
      // FastAPI devuelve el campo "detail" tanto para errores simples
      // (string) como para errores de validación (array de objetos).
      const err = await res.json()
      // Devolvemos un objeto de error uniforme que las páginas pueden usar.
      return { error: { message: err.detail || 'Error al crear cuenta' } }
    }
    // Éxito: devolvemos los datos del usuario creado y error = null.
    return { data: await res.json(), error: null }
  } catch {
    // Si falla la red (backend apagado, sin conexión...) capturamos la
    // excepción y devolvemos un mensaje amigable para el usuario.
    return { error: { message: 'No se pudo conectar con el servidor' } }
  }
}

// ---------------------------------------------------------------------------
// signIn(email, password)
// Inicia sesión con email y contraseña a través de Supabase Auth.
// En este caso NO pasamos por el backend: Supabase se encarga de validar
// las credenciales y de emitir el JWT que identificará al usuario.
// ---------------------------------------------------------------------------
export async function signIn(email, password) {
  // signInWithPassword devuelve data (que contiene la sesión y el usuario)
  // y error (null si todo fue bien).
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

// ---------------------------------------------------------------------------
// signOut()
// Cierra la sesión del usuario en Supabase, invalidando el JWT local.
// ---------------------------------------------------------------------------
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// ---------------------------------------------------------------------------
// getSession()
// Obtiene la sesión actual. Puede ser útil al cargar la aplicación para
// saber si el usuario ya estaba logueado.
// ---------------------------------------------------------------------------
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  return { session: data.session, error }
}

// ---------------------------------------------------------------------------
// getCurrentUser()
// Devuelve el objeto "user" de la sesión (id, email, etc.) o null si no hay
// sesión activa. Es la forma rápida de saber quién está logueado.
// ---------------------------------------------------------------------------
export async function getCurrentUser() {
  // getSession devuelve { data: { session }, error }.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  // Sin sesión no hay usuario: devolvemos null.
  if (!session) return null
  return session.user
}

// ---------------------------------------------------------------------------
// getPerfil()
// Lee el perfil del usuario desde la tabla "perfiles" de la base de datos.
// La tabla perfiles guarda datos como el nombre completo y el rol
// (administrador / cajero). Se relaciona con el usuario de auth por su UUID.
// ---------------------------------------------------------------------------
export async function getPerfil() {
  // Necesitamos el usuario actual para saber qué perfil buscar.
  const user = await getCurrentUser()
  // Si no hay usuario logueado, no hay perfil que leer.
  if (!user) return null

  // Consulta: SELECT * FROM perfiles WHERE id = user.id (solo una fila).
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    // El id del perfil coincide con el id del usuario en auth.users.
    .eq('id', user.id)
    // Esperamos exactamente una fila; si hay más de una, .single() falla.
    .single()

  // Si hay error (por ejemplo el perfil no existe) devolvemos null.
  if (error) return null
  return data
}

// ---------------------------------------------------------------------------
// onAuthChange(callback)
// Registra un "listener" que se ejecuta cada vez que cambia el estado de
// autenticación (login, logout, refresco de token...). Nos permite mantener
// la interfaz sincronizada con la sesión de forma reactiva.
// Devuelve el objeto suscripción, que podemos usar para darla de baja.
// ---------------------------------------------------------------------------
export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}
