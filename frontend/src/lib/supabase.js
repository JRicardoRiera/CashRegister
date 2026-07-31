// ============================================================================
// supabase.js - Cliente de Supabase
// ----------------------------------------------------------------------------
// Este archivo es el punto único de creación del cliente de Supabase para toda
// la aplicación. Supabase se encarga de dos cosas esenciales en este proyecto:
//   1. La autenticación de usuarios (login, registro, sesiones OAuth).
//   2. El acceso a la base de datos PostgreSQL que vive en la nube.
// Al centralizar el cliente aquí, cualquier otro módulo solo tiene que
// importar { supabase } en lugar de volver a configurarlo cada vez.
// ============================================================================

// Importamos la función createClient del SDK oficial de Supabase para
// JavaScript. Este SDK ya viene instalado en el package.json del proyecto.
import { createClient } from '@supabase/supabase-js'

// Leemos la URL del proyecto Supabase desde las variables de entorno de Vite.
// Las variables que empiezan por VITE_ son accesibles en el navegador y se
// definen en el archivo frontend/.env. Nunca se debe meter aquí una clave
// secreta de servicio (service role), solo la anónima.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

// Clave pública (anon key) del proyecto Supabase. Esta clave es segura de
// exponer en el cliente porque las políticas de seguridad reales se aplican
// en la base de datos mediante RLS (Row Level Security).
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Creamos y exportamos el cliente de Supabase. Con él podremos llamar a
// supabase.auth.* (autenticación) y supabase.from('tabla').* (consultas).
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
