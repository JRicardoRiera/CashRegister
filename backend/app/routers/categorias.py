from fastapi import APIRouter, Depends, HTTPException, status
from app.models.categoria import CategoriaCreate, CategoriaUpdate, CategoriaResponse
from app.auth import get_current_profile, require_admin
from app.services.supabase import from_table, handle_supabase_error

router = APIRouter(prefix="/api/v1/categorias", tags=["categorias"])


@router.get("", response_model=list[CategoriaResponse])
def listar_categorias(profile=Depends(get_current_profile)):
    try:
        data = from_table("categorias").select("*").order("nombre").execute()
        return data.data
    except Exception as e:
        handle_supabase_error(e, "Error al listar categorías")


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


@router.put("/{categoria_id}", response_model=CategoriaResponse)
def actualizar_categoria(
    categoria_id: int,
    body: CategoriaUpdate,
    admin=Depends(require_admin),
):
    update_data = {k: v for k, v in body.model_dump(mode='json').items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay campos para actualizar")

    try:
        data = from_table("categorias").update(update_data).eq("id", categoria_id).execute()
        return data.data[0]
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Categoría no encontrada")


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
