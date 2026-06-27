from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient

from app.core.config import settings

_bearer = HTTPBearer()

# Module-level JWKS client with key caching — avoids a round-trip per request.
# The JWKS endpoint is public; keys only change when you rotate signing keys.
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def verify_supabase_token(
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
) -> dict:
    """
    Validates a Supabase access token using asymmetric JWT verification.
    Fetches the project's public key from the JWKS endpoint and verifies
    with RS256 or ES256 — no shared secret required.
    Returns the decoded JWT payload (contains 'sub' = Supabase user UUID).
    """
    token = credentials.credentials
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
        )
        return payload
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        )
