import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth_router, productos, categorias, ventas, admin

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("cashregister")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando Web Cash Register API")
    yield
    logger.info("Apagando Web Cash Register API")


app = FastAPI(
    title="Web Cash Register API",
    description="Backend REST API para sistema POS cloud minimalista",
    version="1.0.0",
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - start
    logger.info(
        "%s %s → %s (%.0fms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed * 1000,
    )
    return response


app.include_router(auth_router.router)
app.include_router(productos.router)
app.include_router(categorias.router)
app.include_router(ventas.router)
app.include_router(admin.router)


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
