from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.auth import get_current_user, get_current_profile
from app.services.supabase import get_client, from_table

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class SignupRequest(BaseModel):
    email: str
    password: str
    nombre_completo: str


class FixProfilesResponse(BaseModel):
    creados: int
    detalles: list[str]


@router.get("/me")
def read_current_user(
    user=Depends(get_current_user),
    profile=Depends(get_current_profile),
):
    return {
        "id": user.id,
        "email": user.email,
        "profile": profile,
    }


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest):
    client = get_client()

    try:
        resp = client.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
            "user_metadata": {"full_name": body.nombre_completo},
        })
    except Exception as e:
        msg = str(e)
        if "already registered" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    user_id = resp.user.id

    perfil_resp = (
        from_table("perfiles").select("id").eq("id", user_id).maybe_single().execute()
    )
    perfil_existente = perfil_resp.data if perfil_resp else None

    if not perfil_existente:
        rol = "administrador" if user_id and _es_primer_usuario() else "cajero"
        from_table("perfiles").insert({
            "id": user_id,
            "nombre_completo": body.nombre_completo,
            "email": body.email,
            "rol": rol,
        }).execute()

    return {"id": user_id, "email": body.email}


@router.post("/fix-profiles", response_model=FixProfilesResponse)
def fix_missing_profiles():
    client = get_client()
    creados = 0
    detalles = []

    try:
        users = client.auth.admin.list_users()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    perfiles_existentes = from_table("perfiles").select("id").execute()
    ids_existentes = {p["id"] for p in perfiles_existentes.data}

    for u in users:
        if u.id not in ids_existentes:
            nombre = (u.user_metadata or {}).get("full_name", u.email.split("@")[0])
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


def _es_primer_usuario() -> bool:
    resp = from_table("perfiles").select("id").limit(1).execute()
    return len(resp.data) == 0
