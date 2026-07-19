# Single-image deploy: build the React frontend, then run FastAPI which
# serves both the API and the built frontend from one port.

# ── Stage 1: build the React frontend ──────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python backend + built frontend ───────────────────────
FROM python:3.11-slim
WORKDIR /app/backend

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# Render (and most hosts) inject $PORT; default to 8000 locally.
ENV PORT=8000
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
