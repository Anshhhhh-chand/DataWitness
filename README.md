# DataWitness

DataWitness is a local-first, deterministic data debugger. Upload an older and
newer CSV, choose a stable record ID and a metric, then inspect the smallest
tested set of changed records that reproduces the newer result.

The application has no required cloud service or API key. User files remain in
the configured local data directory.

## Requirements

- Python 3.12.2
- Node.js 22.11.0 and npm
- Docker 24+ (only required for the container workflow)
- `uv` for the Python dependency workflow

The versions are recorded in `.python-version` and `.nvmrc`. Install `uv` using
the official installer or your package manager; project dependencies are always
installed into `backend/.venv` by `uv sync` and `frontend/node_modules` by npm.

## Setup

```bash
cp .env.example .env
make install
```

`make install` installs the locked Python and JavaScript dependencies locally.
It does not install anything globally.

## Run locally

Start the API and frontend in separate terminals:

```bash
make dev-backend
make dev-frontend
```

Open <http://localhost:5173>. The Vite development server proxies `/api` to
the FastAPI server on port 8000.

## Checks

```bash
make test       # offline backend and frontend tests after setup
make lint
make typecheck
make build
make smoke
```

The smoke test expects the backend to be running at `http://127.0.0.1:8000`.

## Docker

```bash
make docker-build
```

Open <http://localhost:8000>. The production image builds the frontend and
serves it from FastAPI, including the API under `/api`.

## Project layout

- `backend/app/` — FastAPI API, deterministic engine, storage and reports.
- `frontend/src/` — React/TypeScript interface.
- `data/demo/` — deterministic demo inputs.
- `DATAWITNESS_PLAN.md` — product requirements and acceptance criteria.

## Data limits

Upload size, row count, experiment budget, time limit and page sizes are
configurable through the `DATAWITNESS_*` variables in `.env.example`.
