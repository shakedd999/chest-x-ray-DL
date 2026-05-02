"""
HTTP API for the chest X-ray classifier.

Run locally with:
    uvicorn POC.model.inference.api:app --host 127.0.0.1 --port 8000

Authentication:
    Requests to /get_prediction must include a Firebase ID token:
        Authorization: Bearer <token>
    The token is verified server-side via firebase-admin. The frontend
    obtains the token via auth.currentUser.getIdToken() after Google
    Sign-In with the chestxray-bde16 project.

For local dev, firebase-admin uses Application Default Credentials —
run `gcloud auth application-default login` once. For deployed envs
set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON.
"""
import logging
import os
from contextlib import asynccontextmanager
from io import BytesIO
from typing import Dict, List

import firebase_admin
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel

from POC.model.inference import model_inference


MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPE_PREFIX = "image/"

# Explicit allowlist; never wildcard. Add deployed Hosting origin once it exists.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Firebase project this backend trusts. Frontend must sign in to the same project.
EXPECTED_FIREBASE_PROJECT = os.environ.get("FIREBASE_PROJECT_ID", "chestxray-bde16")

logger = logging.getLogger(__name__)


class PredictionResponse(BaseModel):
    probabilities: Dict[str, float]
    predictions: List[str]


def _init_firebase_admin() -> None:
    if firebase_admin._apps:  # already initialized
        return
    try:
        # Application Default Credentials (gcloud auth application-default login,
        # or GOOGLE_APPLICATION_CREDENTIALS service-account JSON in deployed envs).
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {"projectId": EXPECTED_FIREBASE_PROJECT})
        logger.info("Firebase Admin initialized for project %s", EXPECTED_FIREBASE_PROJECT)
    except Exception as exc:  # pragma: no cover
        logger.warning(
            "Firebase Admin init failed (%s). /get_prediction will reject every request "
            "with 503 until credentials are available.",
            exc,
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Loading model on startup")
    model_inference.download_and_load_the_model()
    logger.info("Model loaded")
    _init_firebase_admin()
    yield


app = FastAPI(
    title="Chest X-Ray Classifier API",
    description="Classifies chest X-ray images for Infiltration, Effusion, and Atelectasis.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def verify_id_token(authorization: str = Header(default="")) -> str:
    """FastAPI dependency that returns the verified Firebase uid."""
    if not firebase_admin._apps:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth not configured on the server. See README.",
        )
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
        )
    id_token = authorization.split(" ", 1)[1].strip()
    try:
        decoded = firebase_auth.verify_id_token(id_token)
    except firebase_auth.InvalidIdTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}")
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired token.")
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Auth failed: {exc}")
    if decoded.get("aud") != EXPECTED_FIREBASE_PROJECT:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token audience does not match this server's Firebase project.",
        )
    return decoded["uid"]


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": model_inference.model is not None,
        "auth_ready": bool(firebase_admin._apps),
    }


@app.post(
    "/get_prediction",
    response_model=PredictionResponse,
    summary="Classify a chest X-ray image",
)
async def get_prediction(
    file: UploadFile = File(..., description="Chest X-ray image file"),
    uid: str = Depends(verify_id_token),
) -> PredictionResponse:
    if not file.content_type or not file.content_type.startswith(ALLOWED_CONTENT_TYPE_PREFIX):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported content type '{file.content_type}'. Expected an image/* upload.",
        )

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded file exceeds the {MAX_UPLOAD_BYTES} byte limit.",
        )

    try:
        with Image.open(BytesIO(contents)) as image:
            image.load()
            result = model_inference.get_prediction(image)
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file could not be parsed as an image.",
        )

    logger.info("inference uid=%s file=%s bytes=%d", uid, file.filename, len(contents))
    return PredictionResponse(**result)
