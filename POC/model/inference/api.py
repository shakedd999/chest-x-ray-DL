"""
HTTP API for the chest X-ray classifier.

Run locally with:
    uvicorn POC.model.inference.api:app --host 0.0.0.0 --port 8000

Then send an image:
    curl -F "file=@POC/test_xray_images/00000099_012-Effusion.png" \
        http://localhost:8000/get_prediction
"""
from contextlib import asynccontextmanager
from io import BytesIO
import logging
from typing import Dict, List

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel

from POC.model.inference import model_inference


MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPE_PREFIX = "image/"

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


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model_loaded": model_inference.model is not None}


@app.post(
    "/get_prediction",
    response_model=PredictionResponse,
    summary="Classify a chest X-ray image",
)
async def get_prediction(file: UploadFile = File(..., description="Chest X-ray image file")) -> PredictionResponse:
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

    return PredictionResponse(**result)
