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
    DOCS_DIR=/app/data/docs

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
RUN mkdir -p /app/data/vectorstore /app/data/docs

# ---------- Non-root User ----------
RUN addgroup --system app \
    && adduser --system --ingroup app app \
    && chown -R app:app /app/data

USER app

# ---------- Preload documents at container start ----------
# This runs preload_docs.py before starting FastAPI
ENTRYPOINT ["/usr/bin/tini", "--", "sh", "-c"]
CMD ["python preload_docs.py --docs-dir $DOCS_DIR --vectorstore-path $VECTORSTORE_PATH && uvicorn main:app --host $HOST --port $PORT"]