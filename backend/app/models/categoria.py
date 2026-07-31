# ============================================================================
# models/categoria.py - Modelos Pydantic de categorías
# ----------------------------------------------------------------------------
# Esquemas de validación y respuesta para el módulo de categorías:
#   - CategoriaBase: campos comunes.
#   - CategoriaCreate: para crear.
#   - CategoriaUpdate: todos opcionales (patch parcial).
#   - CategoriaResponse: categoría con id y fecha.
# ============================================================================

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ----------------------------------------------------------------------------
# CategoriaBase
# Campos comunes de una categoría con sus validaciones de longitud.
# ----------------------------------------------------------------------------
class CategoriaBase(BaseModel):
    nombre: str = Field(..., max_length=100)   # Nombre, obligatorio.
    descripcion: Optional[str] = None          # Opcional.


# ----------------------------------------------------------------------------
# CategoriaCreate
# Para el POST /categorias: hereda los campos de CategoriaBase.
# ----------------------------------------------------------------------------
class CategoriaCreate(CategoriaBase):
    pass


# ----------------------------------------------------------------------------
# CategoriaUpdate
# Para el PUT /categorias/{id}: todos opcionales (se actualiza solo lo
# enviado; los campos None se filtran en el router).
# ----------------------------------------------------------------------------
class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = None


# ----------------------------------------------------------------------------
# CategoriaResponse
# Categoría completa: campos base + identificador y fecha de creación.
# ----------------------------------------------------------------------------
class CategoriaResponse(CategoriaBase):
    id: int
    creado_en: datetime
