from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from authenticate.models import User
load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET is not set in environment. Ensure .env contains JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)

def create_access_token(subject: object):
    """Create a JWT access token.

    `subject` may be either a string (the `sub` value) or a dict payload.
    When a dict is provided, we merge in an `exp` claim if missing.
    """
    expire_dt = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = int(expire_dt.timestamp())

    if isinstance(subject, dict):
        payload = subject.copy()
        payload.setdefault("exp", expire)
        if "sub" not in payload:
            raise ValueError("payload dict must include a 'sub' claim")
    else:
        payload = {"sub": str(subject), "exp": expire}

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError as e:
        msg = str(e).lower()
        if "expire" in msg or "expired" in msg:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_user(token: str, db: Session) -> User:
    """Validate JWT `token`, extract `sub` (email), query DB for User, raise 401 if invalid/not found."""
    email = decode_access_token(token)

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user
    