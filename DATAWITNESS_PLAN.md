# DataWitness — Complete Implementation Plan

> A deterministic, local-first data debugger that finds the smallest set of changed records capable of reproducing an unexpected calculation result.

## 1. Product brief

### 1.1 Product promise

DataWitness compares an older and newer version of the same CSV dataset, identifies added, deleted, and modified records, then runs reproducible experiments to find the smallest tested set of changes that recreates the new result.

The product must clearly distinguish between:

- **Changed:** the row differs between versions.
- **Influential:** removing or isolating the row changes the investigated metric.
- **Verified reproducer:** the row belongs to a tested change set that reproduces the target result.
- **Minimal within budget:** no smaller set was found within the configured experiment and time budget.

DataWitness must not claim to discover an absolute causal truth. Its precise claim is:

> “This is the smallest reproducing change set found within the configured deterministic search budget.”

### 1.2 Target users

- Data analysts investigating changed dashboards or reports.
- Developers debugging data pipelines.
- Finance and operations teams validating recurring calculations.
- Technical reviewers who need an auditable explanation rather than an AI guess.

### 1.3 Primary user journey

1. Open DataWitness.
2. Upload the **before** CSV.
3. Upload the **after** CSV.
4. Select the stable record ID column.
5. Choose `Count`, `Sum`, or `Average`.
6. Start the investigation.
7. Watch progress as DataWitness compares the datasets and tests candidate subsets.
8. Review the before result, after result, and verified reproducing change set.
9. Inspect individual records and experiment evidence.
10. Download an HTML, JSON, or CSV report.

### 1.4 MVP scope

The first production-quality build includes:

- CSV-only input.
- Local processing with no required cloud API keys.
- A stable, unique record ID column.
- Added, deleted, modified, and unchanged record classification.
- Count, sum, and average metrics.
- Deterministic patch application.
- Bounded delta-debugging search.
- Cached experiments.
- Progress updates through Server-Sent Events.
- Cancellation between experiments.
- Ranked findings and reproduction proof.
- Searchable, filterable changes table.
- Built-in sales demo dataset.
- HTML, JSON, and CSV reports.
- Responsive, accessible React interface.
- Backend unit/integration tests.
- Frontend component tests.
- Docker build and run support.
- Offline `make test` after dependencies are installed.

### 1.5 Explicit non-goals for the MVP

Do not add these before the core journey is reliable:

- Arbitrary user-supplied Python or JavaScript execution.
- Excel, Parquet, database, or streaming inputs.
- Authentication, workspaces, or collaboration.
- Cloud storage.
- LLM-generated explanations.
- Distributed processing.
- Automatic data repair.
- PDF rendering.
- General-purpose SQL authoring.

The MVP should be excellent at one complete workflow instead of broad but shallow.

---

## 2. Product and technical decisions

### 2.1 Execution model

DataWitness is local-first:

```text
Browser
  │ REST + Server-Sent Events
  ▼
FastAPI application
  │
  ├── Upload and validation services
  ├── Background investigation jobs
  ├── Deterministic investigation engine
  ├── SQLite metadata store
  └── Local report/file store
```

The application must work without external AI services, network calls, or credentials.

### 2.2 Selected stack

Frontend:

- React.
- TypeScript.
- Vite.
- Tailwind CSS.
- shadcn/ui-style primitives.
- Recharts for charts.
- Lucide icons.
- Vitest and Testing Library.

Backend:

- Python 3.12.
- FastAPI.
- Pydantic settings and schemas.
- Polars for CSV reading and dataframe operations.
- SQLite using the standard library for metadata and events.
- Jinja2 for HTML reports.
- Pytest, Ruff, and Mypy.

Operations:

- Docker multi-stage build.
- Docker Compose for local execution.
- `uv.lock` for Python dependencies.
- `package-lock.json` for frontend dependencies.
- `.nvmrc` and `.python-version` for runtime pins.
- `Makefile` as the single developer command surface.

### 2.3 Data processing rules

- CSV files must have a header row.
- The selected ID column must exist in both files.
- IDs must be non-null and unique within each file.
- Both files must contain the same set of columns; column order may differ.
- Missing values are normalized consistently before comparison.
- The metric column for `sum` and `average` must be numeric.
- Row matching is always by the selected stable ID, never by row position.
- All user data is processed locally and never sent to an external service.

### 2.4 Safety limits

Defaults should be configurable through environment variables:

```text
Maximum upload size:       100 MB
Maximum row count:         250,000
Maximum changed records:   5,000
Experiment budget:         500
Time limit:                30 seconds
Preview rows:              10
Experiment page size:      50
Change page size:          50
```

If an investigation reaches a limit, it must return a useful partial result with an explicit stop reason.

---

## 3. Repository structure

```text
DataWitness/
├── README.md
├── DATAWITNESS_PLAN.md
├── Makefile
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── .gitignore
├── .nvmrc
├── .python-version
│
├── backend/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── dependencies.py
│   │   │   ├── health.py
│   │   │   ├── uploads.py
│   │   │   ├── investigations.py
│   │   │   ├── reports.py
│   │   │   └── demo.py
│   │   ├── domain/
│   │   │   ├── enums.py
│   │   │   ├── entities.py
│   │   │   ├── metric_models.py
│   │   │   └── schemas.py
│   │   ├── engine/
│   │   │   ├── csv_loader.py
│   │   │   ├── schema_validator.py
│   │   │   ├── record_aligner.py
│   │   │   ├── diff_engine.py
│   │   │   ├── metric_engine.py
│   │   │   ├── patch_engine.py
│   │   │   ├── experiment_cache.py
│   │   │   ├── delta_debugger.py
│   │   │   ├── influence_scorer.py
│   │   │   └── investigation_engine.py
│   │   ├── services/
│   │   │   ├── upload_service.py
│   │   │   ├── dataset_service.py
│   │   │   ├── investigation_service.py
│   │   │   ├── progress_service.py
│   │   │   └── report_service.py
│   │   ├── storage/
│   │   │   ├── database.py
│   │   │   ├── repositories.py
│   │   │   └── file_store.py
│   │   ├── workers/
│   │   │   ├── job_manager.py
│   │   │   ├── job_runner.py
│   │   │   └── cancellation.py
│   │   ├── templates/
│   │   │   └── report.html.j2
│   │   └── static/
│   └── tests/
│       ├── conftest.py
│       ├── fixtures/
│       │   ├── before.csv
│       │   ├── after.csv
│       │   ├── duplicate_ids.csv
│       │   └── incompatible_schema.csv
│       ├── unit/
│       │   ├── test_csv_loader.py
│       │   ├── test_schema_validator.py
│       │   ├── test_diff_engine.py
│       │   ├── test_metric_engine.py
│       │   ├── test_patch_engine.py
│       │   ├── test_delta_debugger.py
│       │   └── test_investigation_engine.py
│       └── integration/
│           ├── test_upload_api.py
│           ├── test_investigation_api.py
│           └── test_report_api.py
│
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── components.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── api/
│       │   ├── client.ts
│       │   ├── endpoints.ts
│       │   └── types.ts
│       ├── hooks/
│       │   ├── useUpload.ts
│       │   ├── useInvestigation.ts
│       │   ├── useInvestigationEvents.ts
│       │   ├── useChanges.ts
│       │   ├── useFindings.ts
│       │   └── useExperiments.ts
│       ├── lib/
│       │   ├── utils.ts
│       │   ├── formatters.ts
│       │   ├── validation.ts
│       │   └── constants.ts
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   ├── NewInvestigationPage.tsx
│       │   ├── InvestigationPage.tsx
│       │   ├── ChangesPage.tsx
│       │   └── ExperimentsPage.tsx
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppShell.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── TopBar.tsx
│       │   │   └── MobileNavigation.tsx
│       │   │   ├── common/
│       │   │   ├── upload/
│       │   │   ├── investigation/
│       │   │   └── ui/
│       │   └── tests/
│       └── tests/
│
├── data/demo/
│   ├── sales_before.csv
│   ├── sales_after.csv
│   └── demo_config.json
│
└── scripts/
    ├── generate_demo_data.py
    └── smoke_test.sh
```

---

## 4. Backend domain model

### 4.1 Dataset metadata

```text
Dataset
├── id: UUID
├── role: before | after
├── original_filename: string
├── stored_path: internal path
├── sha256: string
├── row_count: integer
├── columns: list[ColumnInfo]
├── preview_rows: list[object]
└── created_at: datetime
```

### 4.2 Investigation metadata

```text
Investigation
├── id: UUID
├── before_dataset_id: UUID
├── after_dataset_id: UUID
├── id_column: string
├── metric_spec: MetricSpec
├── status: queued | running | completed | partial | failed | cancelled
├── current_stage: string
├── progress_percent: integer
├── old_result: number
├── new_result: number
├── result_delta: number
├── changed_count: integer
├── minimal_change_count: integer
├── reproduction_status: string
├── algorithm_version: string
├── stop_reason: string | null
├── created_at: datetime
├── started_at: datetime | null
└── completed_at: datetime | null
```

### 4.3 Change unit

```text
ChangeUnit
├── id: stable internal ID
├── record_id: string
├── kind: added | deleted | modified
├── changed_columns: list[string]
├── before_values: object | null
├── after_values: object | null
└── heuristic_impact: number | null
```

The MVP uses row-level change units. Field-level minimization may be added after the row-level workflow is stable.

### 4.4 Experiment

```text
Experiment
├── id
├── investigation_id
├── sequence_number
├── selected_change_ids
├── selected_change_count
├── output_value
├── target_value
├── distance_from_target
├── matches_target
├── status
├── cache_hit
├── duration_ms
└── created_at
```

### 4.5 Finding

```text
Finding
├── id
├── investigation_id
├── change_id
├── rank
├── score
├── explanation
├── in_minimal_set
├── output_without_change
└── estimated_effect
```

### 4.6 Progress event

```text
ProgressEvent
├── id
├── investigation_id
├── stage
├── percent
├── message
├── experiments_completed
├── experiments_total
├── payload
└── created_at
```

---

## 5. Backend modules and required functions

### 5.1 `config.py`

Create a typed settings object that reads environment variables and creates the data directory. It must expose:

```python
get_settings() -> Settings
```

Settings include environment, paths, limits, experiment budget, and time limit.

### 5.2 `csv_loader.py`

Responsibilities:

- Enforce extension, byte, and row-count limits.
- Read a CSV with Polars.
- Produce inferred column types and a preview.
- Calculate SHA-256.
- Convert parser errors into user-safe domain errors.

Functions:

```python
load_csv(path: Path, max_rows: int) -> pl.DataFrame
preview_csv(path: Path, limit: int = 10) -> DatasetPreview
calculate_file_hash(path: Path) -> str
validate_file_size(path: Path, max_bytes: int) -> None
```

### 5.3 `schema_validator.py`

Responsibilities:

- Confirm the selected ID column exists in both datasets.
- Reject null or duplicate IDs.
- Compare column sets independent of order.
- Validate numeric metric columns.
- Normalize null values consistently.

Functions:

```python
infer_schema(table: pl.DataFrame) -> DatasetSchema
validate_id_column(table: pl.DataFrame, id_column: str) -> None
validate_dataset_pair(before, after, id_column) -> SchemaValidationResult
validate_metric(table, metric: MetricSpec) -> None
```

### 5.4 `record_aligner.py`

Align rows by the selected ID and return:

- Common IDs.
- Added IDs.
- Deleted IDs.
- Modified common IDs.
- Unchanged common IDs.

Functions:

```python
align_records(before, after, id_column) -> AlignedRecords
classify_changes(aligned) -> DiffResult
```

### 5.5 `diff_engine.py`

Create stable change IDs, changed-column lists, before/after values, summary counts, and per-column summaries.

Functions:

```python
compute_diff(before, after, id_column) -> DiffResult
get_change_summary(diff) -> ChangeSummary
get_changed_columns(diff) -> list[ColumnChangeSummary]
```

### 5.6 `metric_engine.py`

Metric schema:

```python
class MetricSpec(BaseModel):
    kind: Literal["count", "sum", "average"]
    column: str | None = None
```

Functions:

```python
calculate_metric(table, metric) -> MetricResult
metric_distance(actual, target, tolerance) -> float
matches_target(actual, target, tolerance) -> bool
```

Rules:

- `count` counts rows and does not require a metric column.
- `sum` requires a numeric column.
- `average` requires a numeric column.
- Count uses exact equality.
- Numeric metrics use absolute and relative tolerance to handle floating-point representation.

### 5.7 `patch_engine.py`

Apply selected changes to the before table:

```python
apply_change_set(before, changes, selected_ids, id_column) -> pl.DataFrame
```

Rules:

- Modified rows replace the before version with the after version.
- Added rows are appended.
- Deleted rows are removed.
- Applying every change to the before dataset must reconstruct the after dataset.

### 5.8 `experiment_cache.py`

Cache key inputs:

- Investigation ID.
- Metric specification.
- Sorted selected change IDs.

Functions:

```python
build_cache_key(investigation_id, metric, selected_ids) -> str
get_cached_result(key) -> MetricResult | None
store_result(key, result) -> None
```

### 5.9 `delta_debugger.py`

Use a deterministic, bounded delta-debugging algorithm:

1. Start with all changed records.
2. Verify that the full set reproduces the after result.
3. Split the candidate set into groups.
4. Test whether a group can be removed while still reproducing the target.
5. Keep successful removals.
6. Split unresolved groups and continue.
7. Stop when no further reduction is possible, the budget is reached, the time limit is reached, or cancellation is requested.

Required function:

```python
minimize_change_set(
    all_changes,
    predicate,
    budget,
    progress,
    should_cancel,
) -> MinimizationResult
```

The result must include:

- Selected IDs.
- Number of experiments.
- Cache hits.
- Stop reason.
- Whether minimality was established within the budget.
- Final output and target output.

### 5.10 `influence_scorer.py`

For each change in the minimal set, remove it and run the metric. Rank by the distance from the target or the magnitude of output movement. Mark verified members separately from heuristic-only changed records.

Function:

```python
rank_changes(before, changes, minimal_set, metric, id_column) -> list[Finding]
```

### 5.11 `investigation_engine.py`

Orchestrate the full deterministic flow:

```python
run_investigation(
    before_path,
    after_path,
    id_column,
    metric,
    settings,
    progress_callback,
    should_cancel,
) -> InvestigationResult
```

Stages:

```text
queued
loading
validating
diffing
calculating_baseline
searching
ranking
generating_report
completed | partial | failed | cancelled
```

---

## 6. API contract

All API routes are under `/api`.

### 6.1 Health

```http
GET /api/health
```

Response:

```json
{ "status": "ok", "version": "0.1.0" }
```

### 6.2 Upload

```http
POST /api/uploads
Content-Type: multipart/form-data
```

Form fields:

```text
file: CSV file
role: before | after
```

Response includes upload ID, filename, size, hash, row count, column metadata, and ten preview rows.

### 6.3 Create investigation

```http
POST /api/investigations
```

Request:

```json
{
  "before_upload_id": "uuid",
  "after_upload_id": "uuid",
  "id_column": "order_id",
  "metric": { "kind": "sum", "column": "profit" }
}
```

Response:

```json
{ "investigation_id": "uuid", "status": "queued" }
```

### 6.4 Investigation state

```http
GET /api/investigations/{id}
```

Return status, stage, progress, metric results, diff summary, reproduction status, stop reason, and timestamps.

### 6.5 Progress stream

```http
GET /api/investigations/{id}/events
Accept: text/event-stream
```

Event payload:

```json
{
  "stage": "searching",
  "percent": 63,
  "message": "Testing a smaller group of 24 changes",
  "experiments_completed": 42,
  "experiments_total": 100
}
```

### 6.6 Cancel

```http
POST /api/investigations/{id}/cancel
```

Cancellation is cooperative and checked between experiments.

### 6.7 Changes

```http
GET /api/investigations/{id}/changes
GET /api/investigations/{id}/changes/{change_id}
```

Query parameters:

```text
kind=all|added|deleted|modified
search=<record ID search>
verified=true|false
sort=impact_desc|record_id|change_type
page=1
page_size=50
```

### 6.8 Findings and experiments

```http
GET /api/investigations/{id}/findings
GET /api/investigations/{id}/experiments
```

### 6.9 Reports

```http
GET /api/investigations/{id}/report?format=html
GET /api/investigations/{id}/report?format=json
GET /api/investigations/{id}/report?format=csv
```

### 6.10 Demo

```http
POST /api/demo/investigations
```

The endpoint uses committed synthetic sales CSVs and creates a normal investigation, so the demo exercises the real product path.

---

## 7. Frontend architecture

### 7.1 Routes

```text
/                              Home / overview
/new                           New investigation flow
/investigations/:id            Investigation overview
/investigations/:id/changes    All changes table
/investigations/:id/experiments Experiment history
```

Use a small route resolver in `App.tsx` or a lightweight router. A dependency is optional; the flow must support browser refresh on investigation pages in the production server.

### 7.2 API and hooks

`api/client.ts`:

- Typed `get`, `post`, and multipart upload helpers.
- Convert non-2xx responses to a user-safe error shape.

`api/types.ts`:

- Upload response.
- Column metadata.
- Metric spec.
- Investigation summary.
- Progress event.
- Change detail.
- Finding.
- Experiment.
- Report format.

Hooks:

```text
useUpload()                  Uploads and previews a file.
useInvestigation(id)         Polls summary state.
useInvestigationEvents(id)   Opens and closes SSE stream.
useChanges(id, filters)      Loads paginated changes.
useFindings(id)              Loads ranked findings.
useExperiments(id)           Loads experiment history.
```

### 7.3 Design system

Visual direction:

- Warm neutral page background.
- White cards with subtle borders.
- Slate text.
- Indigo primary accent.
- Emerald success.
- Amber warning.
- Rose/red errors.
- Restrained radii and shadows.
- Inter or a comparable system sans-serif.
- Strong whitespace and clear data hierarchy.

Build or adapt shadcn/ui primitives for:

- Button.
- Card.
- Badge.
- Tabs.
- Dialog.
- Drawer.
- Select.
- Progress.
- Skeleton.
- Tooltip.
- Table.
- Dropdown menu.
- Alert.
- Toast.

### 7.4 Global shell

Desktop:

- Fixed left sidebar.
- Main content with max-width and scrolling.
- Top bar with page name and status.

Mobile:

- Collapsible navigation.
- Horizontal-safe tables.
- Cards stack into one column.
- Charts use responsive containers.

Sidebar entries:

```text
DataWitness logo and wordmark
Overview
New investigation
Recent investigations
Settings placeholder
```

### 7.5 Home page

Include:

- Hero headline: “Find the records behind the result.”
- Short explanatory copy.
- Primary `New investigation` button.
- Secondary `Try demo dataset` button.
- Recent investigations list.
- Empty state when none exist.
- Four-step visual: upload → compare → experiment → verify.

### 7.6 New investigation page

Three visible steps:

#### Step 1: Upload

Two upload cards:

- Before dataset: expected result.
- After dataset: unexpected result.

Each card supports drag/drop, keyboard activation, file picker, upload progress, filename, size, replacement, removal, and error display.

#### Step 2: Configure

- Preview first ten rows.
- Select the record ID column.
- Show row counts and schema compatibility.
- Choose count, sum, or average.
- Select numeric metric column when required.
- Render a natural-language summary of the chosen investigation.

#### Step 3: Confirm

Show:

- Both filenames.
- Row counts.
- Selected ID column.
- Metric.
- Number of detected changes if already available.

Primary button: `Start investigation`.

### 7.7 Investigation overview

Header:

- Investigation name.
- Status badge.
- Dataset names.
- Last updated.
- Cancel button while running.
- Report download menu when complete.

Summary cards:

```text
Before result
After result
Output change
Minimal reproducer
```

Charts:

- Before/after output bar chart.
- Change composition chart for modified, added, deleted, unchanged.
- Optional impact ranking chart.

Main proof panel:

```text
Verified reproducer

DataWitness found 4 changes that reproduce the after result.

Expected after result:      $1,101,840.00
Reproduced with 4 changes:  $1,101,840.00

All 4 changes are necessary within the tested search budget.
```

For partial search:

```text
Best result found within the investigation budget

The result reproduced, but the time or experiment budget ended before
minimality could be fully established.
```

Progress view:

- Stage timeline.
- Progress bar.
- Current message.
- Experiments completed and budget.
- Accessible `aria-live` update.

Findings:

- Ranked cards.
- Record ID.
- Change type.
- Changed fields.
- Impact.
- Verified reproducer badge.

### 7.8 Changes page

Filters:

- All.
- Modified.
- Added.
- Deleted.
- In verified set.
- Search by ID.
- Sort by impact, ID, or type.

Table columns:

```text
Record ID | Type | Changed fields | Before | After | Impact | Verified
```

Clicking a row opens a detail drawer with:

- Before values.
- After values.
- Highlighted fields.
- Impact score.
- Verified status.
- Evidence and explanation.

### 7.9 Experiments page

Show:

- Experiment count.
- Cache hits.
- Budget and stop reason.
- Candidate-set reduction.
- Each experiment’s selected count, output, target match, duration, and cache status.

This page proves that the explanation was produced by controlled experiments.

### 7.10 Accessibility requirements

- Keyboard-accessible drop zones.
- Visible focus rings.
- Labels for every form field.
- No information communicated only by color.
- Text alternative for every chart.
- `aria-live` progress updates.
- Sufficient contrast.
- Reduced-motion support.
- Responsive overflow handling for tables.
- Clear error and success messages.

---

## 8. Report design

### 8.1 HTML report

The report must work offline and contain:

1. Product and investigation title.
2. Dataset filenames and SHA-256 checksums.
3. Dataset row counts and column names.
4. Selected ID column.
5. Metric configuration.
6. Before result.
7. After result.
8. Result delta.
9. Added/deleted/modified counts.
10. Minimal reproducing change set.
11. Exact reproduction proof.
12. Ranked findings.
13. Experiment summary.
14. Algorithm version.
15. Budget, time limit, and stop reason.
16. Warnings or limitations.
17. Timestamp.

### 8.2 JSON report

Include all machine-readable investigation metadata, diff units, findings, experiments, reproduction status, and configuration.

### 8.3 CSV report

Include one row per changed record:

```text
record_id
change_type
changed_columns
in_minimal_set
impact_score
before_values
after_values
```

---

## 9. Demo dataset

Create deterministic synthetic sales data with a fixed seed.

Columns:

```text
order_id
date
region
product
quantity
unit_price
discount
revenue
cost
profit
```

Requirements:

- Approximately 10,000 rows.
- Hundreds of irrelevant changes.
- Several modified records.
- At least one added record.
- At least one deleted record.
- A small number of intentionally impactful changes.
- A clear profit difference.
- Committed synthetic data only; never commit user uploads.

The demo button must use the same upload, configuration, job, and dashboard path as a normal investigation.

---

## 10. Error states and edge cases

### Upload errors

Use clear messages for:

- Unsupported file type.
- Empty file.
- File too large.
- Malformed CSV.
- Unsupported encoding.

### Schema errors

- Missing ID column.
- Duplicate IDs.
- Null IDs.
- Mismatched columns.
- Non-numeric sum/average column.

### Investigation states

No changed records:

> The datasets are identical for the selected record ID.

Changed but same metric:

> The datasets differ, but this calculation produced the same result. No relevant change was found for this metric.

Partial:

> A reproducing set was found, but the configured budget ended before minimality could be fully verified.

Failure:

> The investigation could not be completed. Check the details and try again.

Show technical details only behind an expandable details element.

---

## 11. Testing plan

### 11.1 Backend unit tests

Required behavior tests:

- Valid CSV loads.
- Malformed CSV fails with a safe error.
- File size limit is enforced.
- Duplicate IDs are rejected.
- Null IDs are rejected.
- Compatible schemas pass.
- Incompatible schemas fail.
- Added rows are detected.
- Deleted rows are detected.
- Modified rows and changed fields are detected.
- Unchanged rows are ignored.
- Count is correct.
- Sum is correct.
- Average is correct.
- Full patch reconstructs the after dataset.
- Full change set reproduces the after metric.
- Known two-change reproducer is minimized.
- Same input produces same output.
- Cache returns same experiment result.
- Budget is respected.
- Time limit is respected.
- Cancellation stops between experiments.
- Partial results include stop reason.
- HTML report contains proof content.

### 11.2 Backend integration tests

Exercise the API path:

1. Upload before dataset.
2. Upload after dataset.
3. Create investigation.
4. Poll until completed.
5. Read summary.
6. Read progress/events.
7. Read changes.
8. Read findings.
9. Read experiments.
10. Download HTML, JSON, and CSV reports.

### 11.3 Frontend tests

- Dropzone accepts CSV.
- Dropzone rejects unsupported files.
- Metric builder requires a column for sum and average.
- Configuration summary renders.
- Progress timeline renders active and completed stages.
- Completed summary renders metric cards.
- Changes filters work.
- Change drawer shows before/after values.
- Empty state renders.
- Error state renders retry action.

### 11.4 Smoke test

The smoke script must:

1. Start or verify the backend.
2. Start the built-in demo investigation.
3. Wait for completion with a timeout.
4. Verify a reproducing set exists.
5. Download a report.
6. Confirm report content is non-empty.

---

## 12. Reproducible setup and commands

Required files:

- `.nvmrc` pinned to Node 22.
- `.python-version` pinned to Python 3.12.
- `backend/uv.lock`.
- `frontend/package-lock.json`.
- `.env.example` with no secrets.
- `Dockerfile`.
- `docker-compose.yml`.
- `README.md` with exact commands.

Required commands:

```bash
make install
make test
make lint
make typecheck
make build
make docker-build
docker compose up --build
make smoke
```

`make test` must be the single offline test command after dependencies are installed.

The production Docker image must:

1. Build the frontend.
2. Install pinned backend dependencies.
3. Copy the frontend build into backend static files.
4. Create `/app/var/data`.
5. Serve the complete product from FastAPI on port 8000.

---

## 13. Implementation sequence

Each step must be implemented, verified, and committed before starting the next.

### Step 1 — Scaffold

Create runtime pins, manifests, lockfiles, Docker files, Makefile, README, FastAPI health endpoint, and Vite shell.

Checks:

```bash
make test
make build
docker build -t datawitness:local .
```

Commit message:

```text
chore: scaffold reproducible DataWitness application
```

### Step 2 — Upload and validation

Implement file storage, CSV parsing, previews, schema checks, upload API, and upload UI.

Checks:

```bash
make test
```

Commit:

```text
feat: add CSV upload and dataset validation
```

### Step 3 — Diff engine

Implement stable-ID alignment, added/deleted/modified classification, summaries, changes API, and changes table.

Checks:

```bash
make test
```

Commit:

```text
feat: implement deterministic dataset diffing
```

### Step 4 — Metrics

Implement count, sum, average, baseline calculations, and metric builder.

Checks:

```bash
make test
```

Commit:

```text
feat: add configurable dataset metrics
```

### Step 5 — Investigation engine

Implement patching, cache, delta debugging, influence scoring, and deterministic results.

Checks:

```bash
make test
```

Commit:

```text
feat: add minimal reproducing change search
```

### Step 6 — Jobs and progress

Implement bounded background jobs, progress persistence, SSE, cancellation, and progress UI.

Checks:

```bash
make test
```

Commit:

```text
feat: add background investigations and live progress
```

### Step 7 — Dashboard

Implement summary cards, charts, findings, proof panel, timeline, details drawer, responsive states, and navigation.

Checks:

```bash
make test
make build
```

Commit:

```text
feat: build DataWitness investigation dashboard
```

### Step 8 — Demo and reports

Implement deterministic demo data, one-click demo, HTML/JSON/CSV reports, and download controls.

Checks:

```bash
make test
make smoke
```

Commit:

```text
feat: add demo investigation and downloadable reports
```

### Step 9 — Final polish and reproducibility

Update README, verify all commands on a clean environment, verify Docker execution, review accessibility, and document known limitations.

Checks:

```bash
make install
make test
make lint
make typecheck
make build
docker compose up --build
```

Commit:

```text
docs: finalize DataWitness setup and demo instructions
```

---

## 14. Final acceptance criteria

DataWitness is submission-ready when:

1. It opens without credentials.
2. A user can upload two CSVs.
3. Both datasets show previews.
4. A stable ID can be selected.
5. Count, sum, and average are available.
6. Added, deleted, and modified records are identified.
7. Before and after results are calculated.
8. Investigation runs without freezing the interface.
9. Progress is visible in real time.
10. The demo finds a small reproducing set.
11. The reproducing set is verified by rerunning the metric.
12. Individual records show before/after values.
13. Findings are ranked and explained with evidence.
14. Experiment history is visible.
15. Reports download successfully.
16. Invalid data produces understandable errors.
17. No-change and no-effect states are clear.
18. Repeated runs are deterministic.
19. `make test` works offline after installation.
20. Docker builds and serves the complete application.
21. README instructions are sufficient for a clean-machine rebuild.

## 15. Demo narrative

The presentation should focus on one memorable sequence:

```text
Hundreds of data changes
          ↓
Controlled deterministic experiments
          ↓
Four verified records
          ↓
Exact reproduction of the unexpected result
```

Recommended final pitch:

> DataWitness is not another data-diff viewer. It is a reproducible data debugger. It compares two dataset versions, runs controlled experiments, and identifies the smallest set of changes that can recreate the unexpected result.

The strongest product decision is to keep the first release deterministic, local, explainable, and narrowly focused. A reliable end-to-end investigation is more valuable than broad support for unbounded data formats or arbitrary programs.
