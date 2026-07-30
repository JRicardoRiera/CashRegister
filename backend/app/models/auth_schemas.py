from pydantic import BaseModel
from typing import Optional


class PerfilResponse(BaseModel):
    id: str
    nombre_completo: str
    email: str
    rol: str
    creado_en: Optional[str] = None


class MeResponse(BaseModel):
    id: str
    email: str
    profile: PerfilResponse


class SignupResponse(BaseModel):
    id: str
    email: str


class SignupRequest(BaseModel):
    email: str
    password: str
    nombre_completo: str


class FixProfilesResponse(BaseModel):
    creados: int
    detalles: list[str]
