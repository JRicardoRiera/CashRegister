# ============================================================================
# models/auth_schemas.py - Modelos Pydantic de autenticación y usuarios
# ----------------------------------------------------------------------------
# Define los esquemas de validación (entrada) y de respuesta (salida) para
# los endpoints de /auth y /admin/usuarios. Pydantic valida los datos que
# llegan por el cuerpo de la petición y estructura los que se devuelven.
# ============================================================================

from pydantic import BaseModel  # Clase base de los modelos.
from typing import Optional      # Para campos opcionales.


# ----------------------------------------------------------------------------
# PerfilResponse
# Datos del perfil de un usuario que se devuelven al cliente.
# ----------------------------------------------------------------------------
class PerfilResponse(BaseModel):
    id: str                        # UUID del usuario (mismo que en Auth).
    nombre_completo: str           # Nombre visible.
    email: str                     # Correo electrónico.
    rol: str                       # 'administrador' | 'cajero'.
    creado_en: Optional[str] = None  # Fecha de registro (puede no venir).


# ----------------------------------------------------------------------------
# MeResponse
# Respuesta del endpoint GET /auth/me: usuario + su perfil anidado.
# ----------------------------------------------------------------------------
class MeResponse(BaseModel):
    id: str
    email: str
    profile: PerfilResponse


# ----------------------------------------------------------------------------
# SignupResponse
# Respuesta del POST /auth/signup: confirma el usuario creado.
# ----------------------------------------------------------------------------
class SignupResponse(BaseModel):
    id: str
    email: str


# ----------------------------------------------------------------------------
# SignupRequest
# Cuerpo del POST /auth/signup: datos mínimos para registrarse.
# ----------------------------------------------------------------------------
class SignupRequest(BaseModel):
    email: str
    password: str
    nombre_completo: str


# ----------------------------------------------------------------------------
# FixProfilesResponse
# Respuesta del POST /auth/fix-profiles: cuántos perfiles se crearon y el
# detalle de cada operación.
# ----------------------------------------------------------------------------
class FixProfilesResponse(BaseModel):
    creados: int
    detalles: list[str]


# ----------------------------------------------------------------------------
# UsuarioUpdate
# Cuerpo del PUT /admin/usuarios/{id}. Todos los campos son opcionales:
# solo se actualiza lo que el cliente envíe.
# ----------------------------------------------------------------------------
class UsuarioUpdate(BaseModel):
    nombre_completo: Optional[str] = None
    rol: Optional[str] = None        # 'administrador' | 'cajero'.
    activo: Optional[bool] = None    # Acceso habilitado o no.


# ----------------------------------------------------------------------------
# UsuarioAdminResponse
# Perfil completo de un usuario, tal y como lo ven los administradores
# (incluye el estado activo y las fechas de auditoría).
# ----------------------------------------------------------------------------
class UsuarioAdminResponse(BaseModel):
    id: str
    nombre_completo: str
    email: str
    rol: str
    activo: bool
    creado_en: Optional[str] = None
    actualizado_en: Optional[str] = None
