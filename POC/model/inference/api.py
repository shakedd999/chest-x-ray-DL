"""
HTTP API for the chest X-ray classifier.

Run locally with:
    uvicorn POC.model.inference.api:app --host 127.0.0.1 --port 8000

Authentication:
    Requests to /get_prediction must include a Firebase ID token:
        Authorization: Bearer <token>
    The token's signature is verified against Google's public JWKs and
    the audience/issuer claims are matched against EXPECTED_FIREBASE_PROJECT.
    No service-account credentials or gcloud login required — the JWKs
    are fetched over HTTPS from a public endpoint and cached in-process.
"""
import logging
import os
from contextlib import asynccontextmanager
from io import BytesIO
from typing import Dict, List

import jwt
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from jwt import PyJWKClient
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel

from POC.model.inference import model_inference


MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPE_PREFIX = "image/"

# Explicit allowlist; never wildcard. Add deployed Hosting origin once it exists.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

# Firebase project this backend trusts. Frontend must sign in to the same project.
EXPECTED_FIREBASE_PROJECT = os.environ.get("FIREBASE_PROJECT_ID", "chestxray-bde16")
EXPECTED_ISSUER = f"https://securetoken.google.com/{EXPECTED_FIREBASE_PROJECT}"

# Public JWK set Firebase signs ID tokens with. No auth needed to fetch.
FIREBASE_JWKS_URL = (
    "https://www.googleapis.com/service_accounts/v1/jwk/"
    "securetoken@system.gserviceaccount.com"
)
_jwks_client = PyJWKClient(FIREBASE_JWKS_URL, cache_keys=True, lifespan=3600)

logger = logging.getLogger(__name__)


class PredictionResponse(BaseModel):
    probabilities: Dict[str, float]
    predictions: List[str]


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Loading model on startup")
    model_inference.download_and_load_the_model()
    logger.info("Model loaded")
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
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
        )
    id_token = authorization.split(" ", 1)[1].strip()
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(id_token).key
        decoded = jwt.decode(
            id_token,
            signing_key,
            algorithms=["RS256"],
            audience=EXPECTED_FIREBASE_PROJECT,
            issuer=EXPECTED_ISSUER,
            options={"require": ["exp", "iat", "aud", "iss", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired token.")
    except jwt.InvalidAudienceError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token audience does not match this server's Firebase project.",
        )
    except jwt.InvalidIssuerError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token issuer.")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}")
    uid = decoded.get("sub") or decoded.get("user_id")
    if not uid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has no subject.")
    return uid


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "model_loaded": model_inference.model is not None,
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
