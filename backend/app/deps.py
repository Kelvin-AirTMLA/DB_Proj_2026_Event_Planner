from dataclasses import dataclass
from typing import Annotated, Literal

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.security import decode_access_token

_bearer = HTTPBearer(auto_error=False)

Role = Literal["guest", "organizer"]


@dataclass(frozen=True)
class AuthPrincipal:
    role: Role
    subject_id: int


def _principal_from_credentials(
    credentials: HTTPAuthorizationCredentials | None,
) -> AuthPrincipal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(credentials.credentials)
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired") from None
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token") from None
    sub = payload.get("sub")
    role = payload.get("role")
    if sub is None or not str(sub).isdigit():
        raise HTTPException(status_code=401, detail="Invalid token payload")
    if role not in ("guest", "organizer"):
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return AuthPrincipal(role=role, subject_id=int(sub))


def get_current_principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> AuthPrincipal:
    return _principal_from_credentials(credentials)


def get_current_guest_id(
    principal: Annotated[AuthPrincipal, Depends(get_current_principal)],
) -> int:
    if principal.role != "guest":
        raise HTTPException(status_code=403, detail="Guest account required")
    return principal.subject_id


def get_current_organizer_id(
    principal: Annotated[AuthPrincipal, Depends(get_current_principal)],
) -> int:
    if principal.role != "organizer":
        raise HTTPException(status_code=403, detail="Organizer account required")
    return principal.subject_id
