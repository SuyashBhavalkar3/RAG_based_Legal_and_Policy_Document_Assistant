# ============================
# Backend Dockerfile (FastAPI + RAG)
# Ephemeral storage suitable for Render Free
# ============================

FROM python:3.11-slim

# ---------- Environment ----------
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    VECTORSTORE_PATH=/app/data/vectorstore \
    DOCS_DIR=/app/data/docs \
    HF_HOME=/app/data/hf_cache

# ---------- System Dependencies ----------
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libffi-dev \
    libssl-dev \
    curl \
    ca-certificates \
    tini \
    && rm -rf /var/lib/apt/lists/*

# ---------- Working Directory ----------
WORKDIR /app

# ---------- Python Dependencies ----------
COPY requirements.txt .
RUN python -m pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ---------- Application Code ----------
COPY . .

# ---------- Create Folders ----------
RUN mkdir -p /app/data/vectorstore /app/data/docs /app/data/hf_cache

# ---------- Non-root User ----------
RUN addgroup --system app \
    && adduser --system --ingroup app app \
    && chown -R app:app /app/data

USER app

# ---------- Runtime ----------
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
