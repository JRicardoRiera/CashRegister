from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class CategoriaBase(BaseModel):
    nombre: str = Field(..., max_length=100)
    descripcion: Optional[str] = None


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = None


class CategoriaResponse(CategoriaBase):
    id: int
    creado_en: datetime
