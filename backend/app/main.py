from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth_router, productos, categorias, ventas, admin

app = FastAPI(
    title="Web Cash Register API",
    description="Backend REST API para sistema POS cloud minimalista",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(productos.router)
app.include_router(categorias.router)
app.include_router(ventas.router)
app.include_router(admin.router)


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}
