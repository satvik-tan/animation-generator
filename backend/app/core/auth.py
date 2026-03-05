import os
import logging
from datetime import datetime
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions

from app.db.session import get_db
from app.models.job import User

logger = logging.getLogger(__name__)

# Lazy singleton — created once on first use
_clerk_client: Clerk | None = None


def _get_clerk_client() -> Clerk:
    global _clerk_client
    if _clerk_client is None:
        secret_key = os.getenv("CLERK_SECRET_KEY")
        if not secret_key:
            raise HTTPException(status_code=500, detail="Server misconfigured - CLERK_SECRET_KEY missing")
        _clerk_client = Clerk(bearer_auth=secret_key)
    return _clerk_client


def verify_clerk_jwt(request: Request) -> dict:
    """Verifies the Clerk JWT and returns the raw payload."""
    clerk = _get_clerk_client()

    request_state = clerk.authenticate_request(
        request,
        AuthenticateRequestOptions(),
    )

    if not request_state.is_signed_in:
        raise HTTPException(status_code=401, detail="Unauthorized")

    return request_state.payload


def get_current_user_id(
    payload: dict = Depends(verify_clerk_jwt),
    db: Session = Depends(get_db),
) -> str:
    """
    Resolves the Clerk user, upserts them into the users table,
    and returns their clerk_user_id (sub) as the user_id string.
    """
    clerk_user_id = payload["sub"]

    user = db.query(User).filter(User.clerk_user_id == clerk_user_id).one_or_none()

    if user is None:
        # First time seeing this user — fetch details from Clerk Backend API
        email, name = _fetch_clerk_user_details(clerk_user_id)
        user = User(
            id=clerk_user_id,
            clerk_user_id=clerk_user_id,
            name=name,
            email=email,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(user)
    else:
        # Refresh name/email periodically if you want, or just bump updated_at
        user.updated_at = datetime.utcnow()

    db.commit()
    return clerk_user_id


def _fetch_clerk_user_details(clerk_user_id: str) -> tuple[str, str]:
    """
    Calls Clerk Backend API to get the user's email and display name.
    Returns (email, name).
    """
    try:
        clerk = _get_clerk_client()
        clerk_user = clerk.users.get(user_id=clerk_user_id)

        # Primary email from the email_addresses list
        email = ""
        if clerk_user.email_addresses:
            # Find the primary one, or fall back to the first
            for ea in clerk_user.email_addresses:
                if ea.id == clerk_user.primary_email_address_id:
                    email = ea.email_address
                    break
            if not email:
                email = clerk_user.email_addresses[0].email_address

        # Build display name
        parts = []
        if clerk_user.first_name:
            parts.append(clerk_user.first_name)
        if clerk_user.last_name:
            parts.append(clerk_user.last_name)
        name = " ".join(parts) or clerk_user.username or clerk_user_id

        return email, name

    except Exception as e:
        logger.warning(f"Failed to fetch Clerk user {clerk_user_id}: {e}")
        # Graceful fallback — don't block auth if Clerk API is temporarily down
        return "", clerk_user_id
