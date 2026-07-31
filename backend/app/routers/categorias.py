# ============================================================================
# routers/categorias.py - Endpoints de gestión de categorías
# ----------------------------------------------------------------------------
# Prefijo: /api/v1/categorias
#   - GET    ""                  -> Lista de categorías.
#   - GET    /{categoria_id}     -> Categoría por id.
#   - POST   ""                  -> Crear categoría (solo administrador).
#   - PUT    /{categoria_id}     -> Actualizar (solo administrador).
#   - DELETE /{categoria_id}     -> Borrar (solo administrador).
# La lectura requiere usuario autenticado; las escrituras, administrador.
# ============================================================================

from fastapi import APIRouter, Depends, HTTPException, status

# Modelos Pydantic de validación.
from app.models.categoria import CategoriaCreate, CategoriaUpdate, CategoriaResponse
# Dependencias de autenticación/autorización.
from app.auth import get_current_profile, require_admin
# Helpers de Supabase.
from app.services.supabase import from_table, handle_supabase_error

# Router con prefijo y etiqueta.
router = APIRouter(prefix="/api/v1/categorias", tags=["categorias"])


# ----------------------------------------------------------------------------
# GET /api/v1/categorias
# Lista todas las categorías ordenadas alfabéticamente por nombre.
# ----------------------------------------------------------------------------
@router.get("", response_model=list[CategoriaResponse])
def listar_categorias(profile=Depends(get_current_profile)):
    try:
        data = from_table("categorias").select("*").order("nombre").execute()
        return data.data
    except Exception as e:
        handle_supabase_error(e, "Error al listar categorías")


# ----------------------------------------------------------------------------
# GET /api/v1/categorias/{categoria_id}
# Devuelve una categoría concreta. Si no existe, .single() lanza una
# excepción y respondemos 404.
# ----------------------------------------------------------------------------
@router.get("/{categoria_id}", response_model=CategoriaResponse)
def obtener_categoria(
    categoria_id: int,
    profile=Depends(get_current_profile),
):
    try:
        data = from_table("categorias").select("*").eq("id", categoria_id).single().execute()
        return data.data
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")


# ----------------------------------------------------------------------------
# POST /api/v1/categorias
# Crea una categoría nueva (solo administradores).
# ----------------------------------------------------------------------------
@router.post("", response_model=CategoriaResponse, status_code=status.HTTP_201_CREATED)
def crear_categoria(
    body: CategoriaCreate,
    admin=Depends(require_admin),
):
    try:
        data = from_table("categorias").insert(body.model_dump(mode='json')).execute()
        return data.data[0]
    except Exception as e:
        handle_supabase_error(e, "Error al crear categoría")


# ----------------------------------------------------------------------------
# PUT /api/v1/categorias/{categoria_id}
# Actualiza los campos que vengan rellenos. Si la categoría no existe, el
# update de PostgREST afecta a 0 filas y .execute() no devuelve data,
# así que respondemos 404.
# ----------------------------------------------------------------------------
@router.put("/{categoria_id}", response_model=CategoriaResponse)
def actualizar_categoria(
    categoria_id: int,
    body: CategoriaUpdate,
    admin=Depends(require_admin),
):
    # Filtramos los campos con valor None (los que no se enviaron).
    update_data = {k: v for k, v in body.model_dump(mode='json').items() if v is not None}

    # Sin campos no hay nada que actualizar.
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay campos para actualizar")

    try:
        data = from_table("categorias").update(update_data).eq("id", categoria_id).execute()
        return data.data[0]
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")


# ----------------------------------------------------------------------------
# DELETE /api/v1/categorias/{categoria_id}
# Borra la categoría. Si tiene productos asociados, la base de datos lanza
# un error de foreign key; lo capturamos y respondemos 409 (conflicto) en
# lugar de un error genérico.
# ----------------------------------------------------------------------------
@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_categoria(
    categoria_id: int,
    admin=Depends(require_admin),
):
    try:
        from_table("categorias").delete().eq("id", categoria_id).execute()
    except Exception as e:
        if "foreign key" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Categoría tiene productos asociados")
        handle_supabase_error(e, "Error al eliminar categoría")
