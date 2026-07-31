# ============================================================================
# routers/auth_router.py - Endpoints de autenticación y gestión de perfiles
# ----------------------------------------------------------------------------
# Prefijo: /api/v1/auth
#   - GET  /me           -> Datos del usuario autenticado y su perfil.
#   - POST /signup       -> Crea un usuario nuevo (email + contraseña).
#   - POST /fix-profiles -> Crea los perfiles que falten para usuarios ya
#                           existentes en Supabase Auth (utilidad de arreglo).
# ============================================================================

from fastapi import APIRouter, Depends, HTTPException, status

# Dependencias de autenticación.
from app.auth import get_current_user, get_current_profile
# Acceso a Supabase.
from app.services.supabase import get_client, from_table, hay_perfiles
# Modelos Pydantic de validación de entrada/salida.
from app.models.auth_schemas import (
    MeResponse,
    PerfilResponse,
    SignupRequest,
    SignupResponse,
    FixProfilesResponse,
)

# Router de la API con su prefijo y etiqueta (para la doc. de Swagger).
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ----------------------------------------------------------------------------
# GET /me
# Devuelve la información del usuario logueado: su id, email y su perfil
# (nombre, rol, etc.). Requiere token válido (Depends).
# ----------------------------------------------------------------------------
@router.get("/me", response_model=MeResponse)
def read_current_user(
    user=Depends(get_current_user),       # Usuario autenticado (Supabase).
    profile=Depends(get_current_profile), # Su perfil en la tabla "perfiles".
):
    return MeResponse(
        id=user.id,
        email=user.email,
        profile=PerfilResponse(
            id=profile["id"],
            nombre_completo=profile["nombre_completo"],
            email=profile["email"],
            rol=profile["rol"],
            creado_en=str(profile.get("creado_en", "")),
        ),
    )


# ----------------------------------------------------------------------------
# POST /signup
# Registro de usuarios desde el propio sistema (sin pasar por la UI de
# Supabase). Usa admin.create_user para crearlo con el email confirmado.
# Después crea su perfil en la tabla "perfiles": el primer usuario del
# sistema se registra como administrador; el resto, como cajero.
# ----------------------------------------------------------------------------
@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest):
    client = get_client()

    # 1) Crear el usuario en Supabase Auth.
    try:
        resp = client.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,  # Confirma el email automáticamente.
            "user_metadata": {"full_name": body.nombre_completo},
        })
    except Exception as e:
        msg = str(e)
        # El correo puede estar repetido.
        if "already registered" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    user_id = resp.user.id

    # 2) Comprobar si el perfil ya existe (p.ej. creado por un trigger).
    perfil_resp = (
        from_table("perfiles").select("id").eq("id", user_id).maybe_single().execute()
    )
    perfil_existente = perfil_resp.data if perfil_resp else None

    # 3) Si no existe, lo creamos manualmente con el rol correspondiente.
    if not perfil_existente:
        rol = "administrador" if not hay_perfiles() else "cajero"
        from_table("perfiles").insert({
            "id": user_id,
            "nombre_completo": body.nombre_completo,
            "email": body.email,
            "rol": rol,
        }).execute()

    return SignupResponse(id=user_id, email=body.email)


# ----------------------------------------------------------------------------
# POST /fix-profiles
# Herramienta de reparación: recorre todos los usuarios de Supabase Auth y
# crea los perfiles que falten en la tabla "perfiles" (por si algún registro
# se hizo antes de que existiera la tabla o el trigger).
# ----------------------------------------------------------------------------
@router.post("/fix-profiles", response_model=FixProfilesResponse)
def fix_missing_profiles():
    client = get_client()
    creados = 0
    detalles = []  # Registro de lo que se hizo con cada usuario.

    # 1) Listar todos los usuarios de Auth.
    try:
        users = client.auth.admin.list_users()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # 2) Obtener los ids de perfiles que ya existen.
    perfiles_existentes = from_table("perfiles").select("id").execute()
    ids_existentes = {p["id"] for p in perfiles_existentes.data}

    # 3) Para cada usuario sin perfil, creárselo.
    for u in users:
        if u.id not in ids_existentes:
            # Nombre desde metadatos OAuth o derivado del email.
            nombre = (u.user_metadata or {}).get("full_name", u.email.split("@")[0])
            # Primer perfil creado -> administrador; resto -> cajero.
            rol = "administrador" if not ids_existentes else "cajero"
            try:
                from_table("perfiles").insert({
                    "id": u.id,
                    "nombre_completo": nombre,
                    "email": u.email,
                    "rol": rol,
                }).execute()
                creados += 1
                detalles.append(f"Perfil creado para {u.email}")
            except Exception as e:
                detalles.append(f"Error con {u.email}: {e}")

    return FixProfilesResponse(creados=creados, detalles=detalles)
