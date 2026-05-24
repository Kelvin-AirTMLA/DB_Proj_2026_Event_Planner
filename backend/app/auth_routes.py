from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from psycopg.errors import UniqueViolation
from pydantic import BaseModel, EmailStr, Field

from app.db import get_cursor
from app.deps import AuthPrincipal, get_current_principal
from app.security import create_access_token, hash_password, verify_password
from app.serialize import serialize_row

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterGuestBody(BaseModel):
    email: EmailStr
    username: str = Field(min_length=2, max_length=50)
    full_name: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    password: str = Field(min_length=8, max_length=200)


class RegisterOrganizerBody(BaseModel):
    email: EmailStr
    username: str = Field(min_length=2, max_length=50)
    organizer_name: str = Field(min_length=1, max_length=200)
    phone: str | None = Field(default=None, max_length=50)
    password: str = Field(min_length=8, max_length=200)


class LoginEmailBody(BaseModel):
    email: EmailStr
    password: str


class LoginUsernameBody(BaseModel):
    username: str
    password: str


def _issue_guest_token(user_id: int) -> dict[str, Any]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT user_id, username, full_name, email
            FROM users WHERE user_id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="User not found after login")
    profile = serialize_row(dict(row))
    return {
        "access_token": create_access_token(user_id, "guest"),
        "token_type": "bearer",
        "role": "guest",
        "user": profile,
    }


def _issue_organizer_token(organizer_id: int) -> dict[str, Any]:
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT organizer_id, username, organizer_name, email
            FROM organizers WHERE organizer_id = %s
            """,
            (organizer_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="Organizer not found after login")
    profile = serialize_row(dict(row))
    return {
        "access_token": create_access_token(organizer_id, "organizer"),
        "token_type": "bearer",
        "role": "organizer",
        "organizer": profile,
    }


@router.post("/register")
def register_guest(body: RegisterGuestBody) -> dict[str, Any]:
    pw_hash = hash_password(body.password)
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (username, full_name, email, password_hash, phone)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING user_id
                """,
                (
                    body.username.strip(),
                    body.full_name.strip(),
                    str(body.email).strip(),
                    pw_hash,
                    body.phone,
                ),
            )
            ins = cur.fetchone()
    except UniqueViolation:
        raise HTTPException(status_code=409, detail="Username already taken") from None
    if not ins:
        raise HTTPException(status_code=500, detail="Registration failed")
    return _issue_guest_token(int(ins["user_id"]))


@router.post("/register/organizer")
def register_organizer(body: RegisterOrganizerBody) -> dict[str, Any]:
    pw_hash = hash_password(body.password)
    try:
        with get_cursor() as cur:
            cur.execute(
                """
                INSERT INTO organizers (username, organizer_name, email, password_hash, phone)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING organizer_id
                """,
                (
                    body.username.strip(),
                    body.organizer_name.strip(),
                    str(body.email).strip(),
                    pw_hash,
                    body.phone,
                ),
            )
            ins = cur.fetchone()
    except UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="Username or email already in use",
        ) from None
    if not ins:
        raise HTTPException(status_code=500, detail="Registration failed")
    return _issue_organizer_token(int(ins["organizer_id"]))


@router.post("/login")
def login_guest_email(body: LoginEmailBody) -> dict[str, Any]:
    email_n = str(body.email).strip().lower()
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT user_id, password_hash
            FROM users
            WHERE lower(trim(email)) = %s AND password_hash IS NOT NULL
            """,
            (email_n,),
        )
        rows = cur.fetchall()
    if len(rows) == 0:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if len(rows) > 1:
        raise HTTPException(
            status_code=400,
            detail="Multiple guest accounts with this email. Use POST /api/auth/login/username.",
        )
    row = dict(rows[0])
    if not verify_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _issue_guest_token(int(row["user_id"]))


@router.post("/login/username")
def login_guest_username(body: LoginUsernameBody) -> dict[str, Any]:
    un = body.username.strip().lower()
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT user_id, password_hash
            FROM users
            WHERE lower(username) = %s AND password_hash IS NOT NULL
            """,
            (un,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    rd = dict(row)
    if not verify_password(body.password, rd["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return _issue_guest_token(int(rd["user_id"]))


@router.post("/login/organizer")
def login_organizer_email(body: LoginEmailBody) -> dict[str, Any]:
    email_n = str(body.email).strip().lower()
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT organizer_id, password_hash
            FROM organizers
            WHERE lower(trim(email)) = %s AND password_hash IS NOT NULL
            """,
            (email_n,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    rd = dict(row)
    if not verify_password(body.password, rd["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _issue_organizer_token(int(rd["organizer_id"]))


@router.post("/login/organizer/username")
def login_organizer_username(body: LoginUsernameBody) -> dict[str, Any]:
    un = body.username.strip().lower()
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT organizer_id, password_hash
            FROM organizers
            WHERE lower(username) = %s AND password_hash IS NOT NULL
            """,
            (un,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    rd = dict(row)
    if not verify_password(body.password, rd["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return _issue_organizer_token(int(rd["organizer_id"]))


@router.get("/me")
def me(
    principal: Annotated[AuthPrincipal, Depends(get_current_principal)],
) -> dict[str, Any]:
    if principal.role == "guest":
        with get_cursor() as cur:
            cur.execute(
                """
                SELECT user_id, username, full_name, email, phone, created_at
                FROM users WHERE user_id = %s
                """,
                (principal.subject_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="User no longer exists")
        return {"role": "guest", "user": serialize_row(dict(row))}
    with get_cursor() as cur:
        cur.execute(
            """
            SELECT organizer_id, username, organizer_name, email, phone, created_at
            FROM organizers WHERE organizer_id = %s
            """,
            (principal.subject_id,),
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Organizer no longer exists")
    return {"role": "organizer", "organizer": serialize_row(dict(row))}
