# DataWitness

> **Find the records behind the result.**

DataWitness is a local-first, deterministic data debugger for unexpected
calculation changes. It compares an older and newer CSV snapshot, identifies
what changed, runs controlled experiments, and reports the smallest tested set
of changes that reproduces the newer result.

It is built for situations where a dashboard, finance report, or recurring
pipeline result changed and a normal row diff is not enough to explain why.

## Buildathon positioning

### Best-fit track: Developer Tools / Data & Analytics

DataWitness belongs in a **Developer Tools**, **Data Infrastructure**, or
**Data & Analytics** track, depending on the buildathon’s exact track names.

It turns a difficult data-debugging task into an auditable developer workflow:

```text
Two CSV snapshots
        ↓
Stable-ID diff
        ↓
Controlled metric experiments
        ↓
Smallest tested reproducer
        ↓
Evidence and exportable report
```

### Why this project is useful

When a report changes, teams usually have to inspect a large diff manually or
trust an opaque explanation. Both approaches are slow and difficult to audit.

DataWitness helps analysts, engineers, finance teams, and technical reviewers
answer four practical questions:

1. Which records changed between the two versions?
2. Which metric actually changed?
3. Which changed records are needed to recreate the new result?
4. Can another person reproduce and inspect the evidence?

The result is a reproducible investigation rather than a guess:

> “This is the smallest reproducing change set found within the configured
> deterministic search budget.”

## What makes it different

- **Deterministic:** the same inputs and configuration produce the same search.
- **Local-first:** CSV data is processed locally without cloud APIs or keys.
- **Evidence-based:** the system shows the tested subsets, output values, target
  matches, cache hits, and stop reason.
- **Bounded:** upload, row, changed-record, experiment, and time limits are
  configurable.
- **Honest about causality:** a verified reproducer is not presented as an
  absolute causal truth.
- **Useful immediately:** the built-in sales demo works through the same path as
  a user-uploaded investigation.

## Demo story

The committed demo compares:

- `data/demo/sales_before.csv`
- `data/demo/sales_after.csv`

It investigates the `profit` sum by `order_id`. The after snapshot adds one
record, `DW-011`, which changes the profit total from **2,505** to **2,905**.
DataWitness detects that change, tests it against the real metric, and reports
the verified one-record reproducer.

The demo also exposes the evidence behind the result:

- Before and after metric values.
- Change classification.
- Candidate-set reduction.
- Ranked findings.
- Experiment history.
- Witness replay verification.
- HTML, JSON, and CSV exports.

## Core workflow

1. Upload the **baseline** CSV.
2. Upload the **updated** CSV.
3. Select the stable, unique record ID column.
4. Choose `Count`, `Sum`, or `Average`.
5. Watch the real investigation progress through SSE updates.
6. Review the before result, updated result, observed difference, and witness
   size.
7. Inspect changed records in the evidence table and detail drawer.
8. Replay the witness or export an HTML, JSON, or CSV report.

## How the backend works

The investigation engine performs real data operations; result values are not
random or fabricated.

1. **Load and validate:** Polars reads both CSV files and validates file size,
   headers, row limits, schema compatibility, and ID uniqueness.
2. **Align by ID:** records are matched by the selected stable ID, never by row
   position.
3. **Classify the diff:** rows are classified as added, deleted, modified, or
   unchanged.
4. **Calculate metrics:** count, sum, and average are calculated from the
   actual tables.
5. **Apply patches:** selected changed records are applied to the baseline
   table to construct a candidate dataset.
6. **Search deterministically:** bounded delta-debugging tests smaller candidate
   subsets against the updated target result.
7. **Rank evidence:** each changed record receives an evidence score and an
   explanation based on controlled metric experiments.
8. **Report honestly:** completed, partial, cancelled, failed, no-change, and
   no-effect states are kept distinct.

The key implementation modules are:

```text
backend/app/engine/csv_loader.py
backend/app/engine/schema_validator.py
backend/app/engine/diff_engine.py
backend/app/engine/metric_engine.py
backend/app/engine/patch_engine.py
backend/app/engine/delta_debugger.py
backend/app/engine/investigation_engine.py
```

## Features

### Investigation and evidence

- Stable-ID dataset comparison.
- Added, deleted, modified, and unchanged classification.
- Count, sum, and average metrics.
- Bounded deterministic delta-debugging.
- Experiment caching.
- Cooperative cancellation.
- Live Server-Sent Events progress.
- Verified witness replay.
- Ranked findings with before/after values.
- Searchable and filterable changes inspector.
- TanStack Table sorting and pagination.
- Experiment history with candidate-set reduction.

### Product experience

- Responsive SaaS-style application shell.
- Light and dark themes.
- Drag-and-drop CSV upload workflow.
- Dataset previews and schema compatibility feedback.
- Recharts metric and change-composition visualisations.
- Accessible status badges, progress states, focus states, and reduced-motion
  support.
- Toast feedback through Sonner.
- HTML, JSON, and CSV reports.

## Technology

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS and shadcn-style primitives
- Recharts
- TanStack Table
- Lucide React
- Motion for React
- Sonner
- Vitest and Testing Library

### Backend

- Python 3.12
- FastAPI and Uvicorn
- Pydantic Settings
- Polars
- SQLite standard library storage
- Pytest
- Ruff
- Mypy

### Operations

- Docker multi-stage build
- Docker Compose
- Python dependencies locked in `backend/uv.lock`
- JavaScript dependencies locked in `frontend/package-lock.json`
- Runtime pins in `.python-version` and `.nvmrc`
- `Makefile` as the single developer command surface

## Quick start

### Requirements

- Python **3.12.2**
- Node.js **22.11.0** and npm
- `uv`
- Docker Desktop, only for the container workflow

The required runtime versions are pinned in `.python-version` and `.nvmrc`.

### Install

```bash
cp .env.example .env
make install
```

Dependencies are installed inside the project:

- Python: `backend/.venv`
- JavaScript: `frontend/node_modules`

No global project dependency installation is required.

### Run in development

Use two terminals from the repository root:

```bash
# Terminal 1
make dev-backend
```

```bash
# Terminal 2
make dev-frontend
```

Open <http://localhost:5173>.

The Vite development server proxies `/api` to FastAPI on port 8000.

Health check:

```bash
curl http://localhost:8000/api/health
```

Expected response:

```json
{"status":"ok","version":"0.1.0"}
```

### Run the demo

1. Open <http://localhost:5173>.
2. Click **Try demo dataset**.
3. Wait for the investigation to complete.
4. Review the verified witness and experiment history.
5. Open the changes inspector.
6. Replay the witness.
7. Export the HTML, JSON, or CSV report.

### Run with Docker

```bash
make docker-build
```

Open <http://localhost:8000>.

Stop the container with:

```bash
```

## Quality checks

After dependencies are installed, the project has one reproducible check
surface:

```bash
make test
```

Additional checks:

```bash
make lint
make typecheck
make build
make smoke
```

The smoke test starts or verifies the backend, runs the committed demo,
confirms a verified reproducer, downloads an HTML report, and checks that the
report is non-empty.

The current local verification includes:

| Check | Result |
| --- | --- |
| Backend tests | 7 passed |
| Frontend tests | 3 passed |
| Ruff | Passed |
| ESLint | Passed |
| mypy | Passed |
| TypeScript | Passed |
| Frontend production build | Passed |
| Demo smoke test | Verified reproducer found |
| Docker Compose configuration | Passed |

## API surface

All API routes are under `/api`.

```text
GET  /health
POST /uploads

POST /investigations
GET  /investigations
GET  /investigations/{id}
GET  /investigations/{id}/events
POST /investigations/{id}/cancel
POST /investigations/{id}/replay
GET  /investigations/{id}/changes
GET  /investigations/{id}/changes/{change_id}
GET  /investigations/{id}/findings
GET  /investigations/{id}/experiments
GET  /investigations/{id}/report?format=html|json|csv

POST /demo/investigations
```

## Repository layout

```text
Datawitness/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routes
│   │   ├── domain/       # Domain entities and schemas
│   │   ├── engine/       # Deterministic data investigation engine
│   │   ├── services/     # Upload, job, progress, and report services
│   │   ├── storage/      # Local files, SQLite, and repositories
│   │   └── workers/      # Background job helpers
│   └── tests/            # Unit and API flow tests
├── frontend/
│   ├── src/
│   │   ├── api/          # Typed API client
│   │   ├── components/   # Shell and reusable UI primitives
│   │   └── pages/        # Overview, upload, investigation, changes, experiments
│   └── package.json
├── data/demo/            # Committed deterministic sales demo
├── scripts/smoke_test.sh
├── Dockerfile
├── docker-compose.yml
├── Makefile
└── DATAWITNESS_PLAN.md
```

## Configuration and safety limits

Copy `.env.example` to `.env` to configure:

```text
DATAWITNESS_MAX_UPLOAD_BYTES=104857600
DATAWITNESS_MAX_ROWS=250000
DATAWITNESS_MAX_CHANGED_RECORDS=5000
DATAWITNESS_EXPERIMENT_BUDGET=500
DATAWITNESS_TIME_LIMIT_SECONDS=30
DATAWITNESS_PREVIEW_ROWS=10
```

User data is stored locally under `var/data/` and is ignored by Git.

## Scope and limitations

DataWitness is intentionally focused on one reliable workflow:

- CSV input only.
- One local workspace.
- No authentication or collaboration layer.
- No arbitrary user code execution.
- No external AI service required.
- Minimality is established only within the configured deterministic budget.

The project does not claim to discover absolute causal truth. It verifies that
a tested change set reproduces the selected metric under the current dataset,
metric, and search configuration.

## Submission summary

DataWitness demonstrates how a data-debugging product can be:

- Useful without sending sensitive datasets to a cloud service.
- More trustworthy than an opaque explanation because every experiment is
  inspectable.
- More actionable than a standard diff because it isolates a reproducing set.
- Reproducible from a clean machine with pinned runtimes, lockfiles, tests, and
  Docker support.

It is a focused developer tool for turning “the number changed” into an
auditable explanation of which data changes can actually recreate the result.
