# ============================================================================
# main.py - Punto de entrada de la API (FastAPI)
# ----------------------------------------------------------------------------
# Crea y configura la aplicación FastAPI "Web Cash Register API". Es el
# archivo que ejecuta uvicorn al arrancar el backend:
#   uvicorn app.main:app --reload
# Se encarga de:
#   - Configurar el registro de logs (logging).
#   - Crear la aplicación FastAPI con su metadata y su "lifespan".
#   - Añadir el middleware de CORS (para que el frontend pueda llamarla).
#   - Añadir un middleware propio que registra cada petición HTTP.
#   - Incluir todos los routers de la API (auth, productos, categorias,
#     ventas y admin).
#   - Definir el endpoint de salud /api/v1/health.
# ============================================================================

# Módulos estándar de Python.
import logging      # Sistema de registro de mensajes (logs).
import time         # Medir tiempos de respuesta.
from contextlib import asynccontextmanager  # Para el ciclo de vida de la app.

# FastAPI y su modelo de petición HTTP.
from fastapi import FastAPI, Request
# Middleware de CORS: permite que el navegador llame desde otro origen.
from fastapi.middleware.cors import CORSMiddleware

# Importamos los routers de la aplicación (cada uno con sus endpoints).
from app.routers import auth_router, productos, categorias, ventas, admin

# ----------------------------------------------------------------------------
# Configuración del logging.
# - level=INFO: registramos mensajes informativos y de error.
# - format: plantilla con fecha, nombre del módulo, nivel y mensaje.
# ----------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
# Logger propio de la aplicación, para etiquetar todos nuestros mensajes.
logger = logging.getLogger("cashregister")


# ----------------------------------------------------------------------------
# lifespan(app)
# Ciclo de vida de la aplicación: se ejecuta al arrancar y al apagar el
# servidor. El código "yield" separa la fase de arranque (antes) de la de
# apagado (después). Aquí solo lo usamos para registrar esos momentos.
# ----------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Se ejecuta al iniciar el servidor.
    logger.info("Iniciando Web Cash Register API")
    yield
    # Se ejecuta al apagar el servidor.
    logger.info("Apagando Web Cash Register API")


# ----------------------------------------------------------------------------
# Instancia de la aplicación FastAPI.
# - docs_url="/docs": FastAPI genera automáticamente la documentación
#   interactiva (Swagger UI) en http://127.0.0.1:8000/docs.
# - lifespan: conectamos el ciclo de vida definido arriba.
# ----------------------------------------------------------------------------
app = FastAPI(
    title="Web Cash Register API",
    description="Backend REST API para sistema POS cloud minimalista",
    version="1.0.0",
    docs_url="/docs",
    lifespan=lifespan,
)

# ----------------------------------------------------------------------------
# Middleware de CORS (Cross-Origin Resource Sharing).
# En desarrollo el frontend (Vite) corre en http://localhost:5173 y el
# backend en http://127.0.0.1:8000, que son orígenes distintos. Sin CORS,
# el navegador bloquearía las peticiones entre ellos. En este proyecto se
# permiten todos los orígenes para simplificar el desarrollo.
# ----------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Permitir cualquier origen.
    allow_credentials=True,   # Permitir credenciales (cookies, tokens).
    allow_methods=["*"],      # Permitir todos los métodos HTTP.
    allow_headers=["*"],      # Permitir todas las cabeceras.
)


# ----------------------------------------------------------------------------
# Middleware personalizado: log_requests
# Registra en el log cada petición con su método, ruta, código de respuesta
# y tiempo de ejecución en milisegundos. "call_next" invoca el resto de la
# cadena de middleware/ruta y devuelve la respuesta.
# ----------------------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()            # Marca de tiempo inicial.
    response = await call_next(request)    # Procesa la petición.
    elapsed = time.perf_counter() - start  # Tiempo transcurrido.
    logger.info(
        "%s %s → %s (%.0fms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed * 1000,
    )
    return response


# ----------------------------------------------------------------------------
# Registro de los routers. Cada include_router añade los endpoints de ese
# router a la aplicación bajo el prefijo que tenga definido (por ejemplo
# /api/v1/productos).
# ----------------------------------------------------------------------------
app.include_router(auth_router.router)
app.include_router(productos.router)
app.include_router(categorias.router)
app.include_router(ventas.router)
app.include_router(admin.router)


# ----------------------------------------------------------------------------
# Endpoint de salud (health check).
# Sirve para comprobar que la API está viva. Es útil para pruebas simples
# y para orquestadores de despliegue.
# ----------------------------------------------------------------------------
@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
