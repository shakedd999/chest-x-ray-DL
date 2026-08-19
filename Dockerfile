FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/model/inference ./backend/model/inference

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD exec uvicorn backend.model.inference.api:app --host 0.0.0.0 --port ${PORT:-8080}
