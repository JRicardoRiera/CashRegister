from fastapi import HTTPException, status
from app.config import settings
from supabase import create_client


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
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg or detail)
