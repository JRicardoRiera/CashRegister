# ============================================================================
# auth.py - Autenticación y autorización (dependencias de FastAPI)
# ----------------------------------------------------------------------------
# Contiene las dependencias que protegen los endpoints:
#   - get_current_user(): valida el token JWT del cliente (cabecera
#     Authorization: Bearer <token>) contra Supabase Auth.
#   - get_current_profile(): a partir del usuario, devuelve su perfil de la
#     tabla "perfiles" (y lo crea automáticamente si no existe).
#   - require_admin(): solo permite pasar a usuarios con rol administrador.
# Estas funciones se usan como "Depends(...)" en las rutas, p.ej.:
#   @router.get("/...")
#   def ver(user = Depends(get_current_profile)): ...
# ============================================================================

import logging  # Sistema de registro de mensajes.

from fastapi import Depends, HTTPException, status
# HTTPBearer: extrae automáticamente la cabecera de autorización Bearer.
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Helpers de Supabase: cliente, acceso a tablas y comprobación de perfiles.
from app.services.supabase import get_client, from_table, hay_perfiles

# Logger propio de la aplicación.
logger = logging.getLogger("cashregister")

# Esquema de seguridad: lee la cabecera "Authorization: Bearer <token>".
security = HTTPBearer()


# ----------------------------------------------------------------------------
# get_current_user(credentials)
# Obtiene el usuario autenticado a partir del token JWT que envía el cliente.
# Si el token es inválido o ha expirado, Supabase lanza una excepción y
# respondemos 401 Unauthorized.
# ----------------------------------------------------------------------------
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    try:
        # get_user(token) verifica el token contra Supabase Auth y devuelve
        # los datos del usuario (id, email, metadatos, ...).
        user = get_client().auth.get_user(token)
        return user.user
    except Exception as e:
        logger.error("Token inválido: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )


# ----------------------------------------------------------------------------
# get_current_profile(user)
# Devuelve el perfil (fila de la tabla "perfiles") del usuario autenticado.
# Si el usuario no tiene perfil (p.ej. se registró hace un momento y el
# trigger no lo creó), se lo creamos aquí automáticamente con el nombre de
# los metadatos o el email. El rol se decide con hay_perfiles(): el primer
# usuario que entra es administrador; el resto, cajero.
# ----------------------------------------------------------------------------
def get_current_profile(user=Depends(get_current_user)):
    # Consulta interna: busca el perfil por el id del usuario (los id de
    # perfiles son UUID iguales a los id de auth.users).
    def _get_profile():
        resp = (
            from_table("perfiles")
            .select("*")
            .eq("id", user.id)
            .maybe_single()   # Devuelve None si no hay fila (no lanza error).
            .execute()
        )
        return resp.data if resp else None

    # Si ya existe, lo devolvemos directamente.
    profile = _get_profile()
    if profile:
        return profile

    # No existe: creamos el perfil automáticamente.
    # El nombre sale de los metadatos del proveedor OAuth o del email.
    nombre = (user.user_metadata or {}).get("full_name", user.email.split("@")[0])
    try:
        from_table("perfiles").insert({
            "id": user.id,
            "nombre_completo": nombre,
            "email": user.email,
            "rol": "administrador" if not hay_perfiles() else "cajero",
        }).execute()
    except Exception as e:
        logger.error("Error al crear perfil auto para %s: %s", user.email, e)

    # Reintentamos la lectura tras insertar.
    profile = _get_profile()
    if profile:
        return profile

    # Si aún no hay perfil (p.ej. no se pudo insertar), respondemos 404.
    logger.warning("Perfil no encontrado para usuario %s", user.email)
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Perfil no encontrado. Contacta al administrador.",
    )


# ----------------------------------------------------------------------------
# require_admin(profile)
# Autorización: solo deja pasar a perfiles con rol "administrador". Se usa en
# los endpoints del panel de administración. Devuelve 403 si no lo es.
# ----------------------------------------------------------------------------
def require_admin(profile=Depends(get_current_profile)):
    if profile["rol"] != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return profile
