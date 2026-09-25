"""Minimal Google (OAuth2 / OpenID Connect) login with FastAPI.

Flow:
1. GET /auth/google  -> redirect the browser to Google's consent screen.
2. Google redirects back to GET /auth/google/callback?code=...&state=...
3. We exchange the code for tokens, fetch the user profile, and return it.

Setup:
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
    cp .env.example .env          # then fill in your Google OAuth client
    .venv/bin/python main.py      # or: .venv/bin/uvicorn main:app --reload
    open http://localhost:8000
"""

import os
import sys
from pathlib import Path
from urllib.parse import urlencode

try:
    import httpx
    from dotenv import load_dotenv
    from fastapi import Cookie, FastAPI, HTTPException, Request
    from fastapi.responses import HTMLResponse, RedirectResponse
    from itsdangerous import BadSignature, URLSafeTimedSerializer
except ModuleNotFoundError as exc:  # usually the wrong Python, not a missing dep
    raise SystemExit(
        f"\nCannot import '{exc.name}' using {sys.executable}\n"
        f"This almost always means you are running the system Python instead of the\n"
        f"virtualenv. Run the app with the venv's interpreter directly:\n\n"
        f"    .venv/bin/python main.py\n\n"
        f"If that fails, install the dependencies into it:\n"
        f"    .venv/bin/pip install -r requirements.txt\n"
    ) from None

# Look for .env next to this file, not the current working directory, so the app
# boots the same way no matter which directory you run uvicorn from.
load_dotenv(Path(__file__).parent / ".env")


def require(name: str) -> str:
    """Read a required env var, failing with instructions instead of a bare KeyError."""
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"\n\nMissing environment variable: {name}\n"
            f"  1. cp .env.example .env\n"
            f"  2. open .env and paste your Google OAuth client id/secret into it\n"
            f"     (create one at https://console.cloud.google.com/apis/credentials)\n"
            f"  3. restart the server\n"
            f"Or skip Google entirely while building the UI:\n"
            f"  echo 'DEV_LOGIN=true' >> .env\n"
        )
    return value


# Fakes a signed-in user instead of calling Google. Handy for frontend work.
DEV_LOGIN = os.getenv("DEV_LOGIN", "").lower() in {"1", "true", "yes"}
SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-only-insecure-secret")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "") or ("dev" if DEV_LOGIN else require("GOOGLE_CLIENT_ID"))
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "") or ("dev" if DEV_LOGIN else require("GOOGLE_CLIENT_SECRET"))
# Must match exactly what you typed in the Google Cloud console.
REDIRECT_URI = os.getenv("REDIRECT_URI", "http://localhost:8000/auth/google/callback")

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
SCOPES = "openid email profile"

app = FastAPI(title="Google login example")
state_signer = URLSafeTimedSerializer(SESSION_SECRET, salt="oauth-state")
session_signer = URLSafeTimedSerializer(SESSION_SECRET, salt="session")
http = httpx.AsyncClient()


# ---------------------------------------------------------------- routes

@app.get("/", response_class=HTMLResponse)
async def index() -> str:
    return """
    <h1>FastAPI + Google login</h1>
    <p><a href="/auth/google">Sign in with Google</a></p>
    <p><a href="/me">Check the current session (via cookie)</a></p>
    """


@app.get("/auth/google")
async def google_login() -> RedirectResponse:
    state = state_signer.dumps("nonce")
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    return RedirectResponse(f"{AUTH_URL}?{urlencode(params)}")


@app.get("/auth/google/callback")
async def google_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    if error:
        raise HTTPException(status_code=400, detail=f"Google returned an error: {error}")

    # Protect against CSRF: the state we sent must come back unchanged and unexpired.
    try:
        state_signer.loads(state, max_age=600)
    except BadSignature:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    if DEV_LOGIN:
        # DEV_LOGIN=true short-circuits Google so the flow can be built without
        # real OAuth credentials. Never enable this in production.
        user = {
            "sub": "dev-user-123",
            "email": "dev@example.com",
            "email_verified": True,
            "name": "Dev User",
            "picture": "",
        }
    else:
        token_resp = await http.post(
            TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            # Most common cause: client id/secret or redirect_uri mismatch in
            # the Google Cloud console. Surface Google's message rather than a 500.
            raise HTTPException(
                status_code=400,
                detail=f"Token exchange failed: {token_resp.json().get('error')} "
                f"({token_resp.json().get('error_description', 'no description')})",
            )
        tokens = token_resp.json()

        profile_resp = await http.get(
            USERINFO_URL, headers={"Authorization": f"Bearer {tokens['access_token']}"}
        )
        profile_resp.raise_for_status()
        user = profile_resp.json()

    # Signed so the client cannot forge a profile. A real app would keep this
    # server-side (or store only a session id) instead of in a cookie.
    response = RedirectResponse("/profile")
    response.set_cookie(
        "session",
        session_signer.dumps(user),
        httponly=True,
        samesite="lax",
        max_age=86400,
        secure=False,  # set True when serving over HTTPS
    )
    return response


@app.get("/profile")
async def profile(session: str | None = Cookie(default=None)) -> dict:
    if not session:
        raise HTTPException(status_code=401, detail="Not signed in")
    try:
        return session_signer.loads(session, max_age=86400)
    except BadSignature:
        raise HTTPException(status_code=401, detail="Session invalid or expired, sign in again")


if __name__ == "__main__":
    import uvicorn

    # Lets `python main.py` actually serve, instead of exiting after defining routes.
    uvicorn.run(app, host="127.0.0.1", port=8000)
