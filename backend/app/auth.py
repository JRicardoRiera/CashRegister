import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.supabase import get_client, from_table, hay_perfiles

logger = logging.getLogger("cashregister")
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    try:
        user = get_client().auth.get_user(token)
        return user.user
    except Exception as e:
        logger.error("Token inválido: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )


def get_current_profile(user=Depends(get_current_user)):
    def _get_profile():
        resp = (
            from_table("perfiles")
            .select("*")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        return resp.data if resp else None

    profile = _get_profile()
    if profile:
        return profile

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

    profile = _get_profile()
    if profile:
        return profile

    logger.warning("Perfil no encontrado para usuario %s", user.email)
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Perfil no encontrado. Contacta al administrador.",
    )


def require_admin(profile=Depends(get_current_profile)):
    if profile["rol"] != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador",
        )
    return profile
