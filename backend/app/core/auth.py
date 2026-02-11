import os
from fastapi import HTTPException, Request
from clerk_backend_api import Clerk
import jwt
import requests
from functools import lru_cache


@lru_cache(maxsize=1)
def get_clerk_jwks():
    """Fetch Clerk JWKS for JWT verification (cached)"""
    clerk_frontend_api = os.getenv("CLERK_FRONTEND_API", "clerk.animation-generator.com")
    jwks_url = f"https://{clerk_frontend_api}/.well-known/jwks.json"
    response = requests.get(jwks_url)
    response.raise_for_status()
    return response.json()


def _is_dev_mode() -> bool:
    return os.getenv("DEV_MODE", "false").lower() == "true"


def _get_bearer_token(request: Request) -> str | None:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth:
        return None
    parts = auth.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def verify_clerk_jwt(request: Request) -> str:
    """Resolve the current user_id from the request.

    Dev mode:
      - Accept `x-user-id` (or default to `dev-user-123`).

    Prod mode:
      - Require `Authorization: Bearer <Clerk JWT>`.
      - Verify token using Clerk JWKS.
      - Return Clerk `sub` as user_id.
    """

    if _is_dev_mode():
        return request.headers.get("x-user-id", "dev-user-123")

    token = _get_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized - Missing Bearer token")

    secret_key = os.getenv("CLERK_SECRET_KEY")
    if not secret_key:
        raise HTTPException(status_code=500, detail="Server misconfigured - CLERK_SECRET_KEY missing")

    try:
        secret_key = os.getenv("CLERK_SECRET_KEY")
        if not secret_key:
            raise HTTPException(status_code=500, detail="Server misconfigured - CLERK_SECRET_KEY missing")
        
        # Decode JWT using PyJWT with Clerk's JWKS
        jwks = get_clerk_jwks()
        unverified_header = jwt.get_unverified_header(token)
        
        # Find the signing key
        signing_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == unverified_header.get("kid"):
                signing_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                break
        
        if not signing_key:
            raise HTTPException(status_code=401, detail="Unable to find signing key")
        
        # Verify and decode the token
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            options={"verify_exp": True}
        )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Unauthorized - Invalid token (no sub)")
        return str(user_id)
    except HTTPException:
        raise
    except Exception as e:
        # Avoid leaking internals; keep message short.
        raise HTTPException(status_code=401, detail=f"Unauthorized - Invalid token: {e}")
