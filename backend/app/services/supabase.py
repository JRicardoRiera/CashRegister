# ============================================================================
# services/supabase.py - Capa de acceso a Supabase
# ----------------------------------------------------------------------------
# Centraliza la creación del cliente de Supabase (que usa la service key) y
# las operaciones comunes contra la base de datos:
#   - get_client(): devuelve el cliente único (patrón singleton).
#   - from_table(): acceso cómodo a una tabla para construir consultas.
#   - handle_supabase_error(): convierte excepciones en errores HTTP 400.
#   - get_producto_or_404(): obtiene un producto o lanza 404.
#   - hay_perfiles(): comprueba si ya existen perfiles (para decidir el rol
#     del primer usuario registrado).
# NOTA: la service key tiene permisos de administrador y omite las RLS, por
# lo que esta capa solo debe usarse en el backend, nunca en el navegador.
# ============================================================================

import logging   # Sistema de registro de mensajes.
from fastapi import HTTPException, status  # Errores HTTP controlados.
from app.config import settings            # Credenciales de Supabase.
from supabase import create_client         # Cliente oficial de Supabase.

# Logger propio de la aplicación.
logger = logging.getLogger("cashregister")

# Variable global que guarda la instancia del cliente (singleton).
_client = None


# ----------------------------------------------------------------------------
# get_client()
# Devuelve el cliente de Supabase. Si aún no existe, lo crea con la URL y la
# service key del .env y lo guarda para reutilizarlo (no crear una conexión
# en cada petición).
# ----------------------------------------------------------------------------
def get_client():
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client


# ----------------------------------------------------------------------------
# from_table(table)
# Atajo para empezar a construir una consulta sobre una tabla, p.ej.:
#   from_table("productos").select("*").eq("id", 1).execute()
# ----------------------------------------------------------------------------
def from_table(table: str):
    return get_client().table(table)


# ----------------------------------------------------------------------------
# handle_supabase_error(e, detail)
# Convierte una excepción de Supabase en una HTTPException 400 para que el
# cliente reciba un error de API correcto en vez de un 500. Registra además
# el error en el log para diagnóstico.
# ----------------------------------------------------------------------------
def handle_supabase_error(e: Exception, detail: str = "Error en la operación"):
    msg = str(e)
    logger.error("%s: %s", detail, msg)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg or detail)


# ----------------------------------------------------------------------------
# get_producto_or_404(producto_id)
# Busca un producto por id. Si no existe, PostgREST devuelve el error
# PGRST116 ("The result contains 0 rows"); lo detectamos y respondemos 404.
# Cualquier otro error se transforma en 400.
# ----------------------------------------------------------------------------
def get_producto_or_404(producto_id: int) -> dict:
    try:
        resp = from_table("productos").select("*").eq("id", producto_id).single().execute()
        return resp.data
    except Exception as e:
        if "PGRST116" in str(e):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
        handle_supabase_error(e, "Error al obtener producto")


# ----------------------------------------------------------------------------
# hay_perfiles()
# Comprueba si existe al menos un perfil en la tabla "perfiles". Se usa en el
# registro automático: el primer usuario registrado se crea como
# "administrador" y el resto como "cajero". En caso de error al consultar,
# devolvemos True (suponemos que hay perfiles) para no crear administradores
# por accidente.
# ----------------------------------------------------------------------------
def hay_perfiles() -> bool:
    try:
        resp = from_table("perfiles").select("id").limit(1).execute()
        return len(resp.data) > 0
    except Exception:
        return True
