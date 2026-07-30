import logging
from fastapi import HTTPException, status
from app.config import settings
from supabase import create_client

logger = logging.getLogger("cashregister")


_client = None


def get_client():
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    return _client


def from_table(table: str):
    return get_client().table(table)


def handle_supabase_error(e: Exception, detail: str = "Error en la operación"):
    msg = str(e)
    logger.error("%s: %s", detail, msg)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg or detail)


def get_producto_or_404(producto_id: int) -> dict:
    try:
        resp = from_table("productos").select("*").eq("id", producto_id).single().execute()
        return resp.data
    except Exception as e:
        if "PGRST116" in str(e):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
        handle_supabase_error(e, "Error al obtener producto")


def hay_perfiles() -> bool:
    try:
        resp = from_table("perfiles").select("id").limit(1).execute()
        return len(resp.data) > 0
    except Exception:
        return True
