FROM node:22.11.0-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12.2-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN pip install --no-cache-dir uv && uv sync --frozen --no-dev
COPY backend/app ./app
COPY data /app/data
COPY --from=frontend-build /app/frontend/dist /app/backend/app/static
RUN mkdir -p /app/var/data
ENV DATAWITNESS_ENV=production DATAWITNESS_DATA_DIR=/app/var/data
EXPOSE 8000
CMD [".venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
