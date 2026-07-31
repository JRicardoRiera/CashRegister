# ============================================================================
# config.py - Configuración de la aplicación (variables de entorno)
# ----------------------------------------------------------------------------
# Define la clase Settings que carga las variables de entorno de la
# aplicación usando pydantic-settings. Los valores se leen del archivo .env
# situado en la raíz del proyecto (un nivel por encima de la carpeta
# backend/). Ejemplo de contenido:
#   SUPABASE_URL=...
#   SUPABASE_ANON_KEY=...
#   SUPABASE_SERVICE_KEY=...
# ============================================================================

# pathlib: manejar rutas de archivos de forma multiplataforma.
from pathlib import Path
# pydantic-settings: carga automática de config en objetos tipados.
from pydantic_settings import BaseSettings


# ----------------------------------------------------------------------------
# class Settings(BaseSettings)
# Cada atributo con valor por defecto corresponde a una variable de entorno
# (el nombre se mapea en minúsculas con guiones bajos). Pydantic valida y
# convierte los tipos automáticamente.
# ----------------------------------------------------------------------------
class Settings(BaseSettings):
    # Credenciales de Supabase. Se cargan desde el .env. Si no están, quedan
    # vacías y fallará la conexión (permite arrancar sin configurar).
    supabase_url: str = ""
    supabase_anon_key: str = ""          # Clave pública del cliente.
    supabase_service_key: str = ""       # Clave de servicio (acceso total).

    # Configuración del servidor uvicorn.
    backend_port: int = 8000   # Puerto en el que escucha la API.
    backend_host: str = "0.0.0.0"  # Escucha en todas las interfaces.

    # Ajustes de Pydantic:
    # - env_file: ruta del .env. __file__ es este archivo; subimos tres
    #   niveles: backend/app -> backend -> raíz del proyecto.
    # - env_file_encoding: codificación del .env.
    # - extra: "ignore": ignorar variables del .env no definidas aquí.
    model_config = {
        "env_file": Path(__file__).resolve().parent.parent.parent / ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


# ----------------------------------------------------------------------------
# Instancia global de la configuración.
# Se importa una sola vez y se usa en el resto de módulos mediante
# "from app.config import settings".
# ----------------------------------------------------------------------------
settings = Settings()
