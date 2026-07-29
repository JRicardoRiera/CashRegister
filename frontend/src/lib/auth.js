import { supabase } from './supabase'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export async function signUp(email, password, nombreCompleto) {
  try {
    const res = await fetch(`${API}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nombre_completo: nombreCompleto }),
    })
    if (!res.ok) {
      const err = await res.json()
      return { error: { message: err.detail || 'Error al crear cuenta' } }
    }
    return { data: await res.json(), error: null }
  } catch {
    return { error: { message: 'No se pudo conectar con el servidor' } }
  }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  return { session: data.session, error }
}

export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return null
  return session.user
}

export async function getPerfil() {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) return null
  return data
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}
