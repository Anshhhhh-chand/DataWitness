SHELL := /bin/sh

.PHONY: install test lint typecheck build dev-backend dev-frontend dev docker-build smoke clean

install:
	uv sync --project backend
	npm ci --prefix frontend

test:
	uv run --project backend --directory backend pytest -q
	npm run test --prefix frontend -- --run

lint:
	uv run --project backend --directory backend ruff check app tests
	npm run lint --prefix frontend

typecheck:
	uv run --project backend --directory backend mypy app
	npm run typecheck --prefix frontend

build:
	npm run build --prefix frontend

dev-backend:
	uv run --project backend --directory backend uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	npm run dev --prefix frontend

dev:
	@echo "Run 'make dev-backend' and 'make dev-frontend' in separate terminals."

docker-build:
	docker build -t datawitness:local .

smoke:
	sh scripts/smoke_test.sh

clean:
	rm -rf frontend/dist frontend/node_modules backend/.venv var/data/*
