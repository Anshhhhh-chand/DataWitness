import { useMemo, useState } from 'react'
import { createInvestigation, uploadDataset } from '../api/endpoints'
import type { MetricKind, UploadResponse } from '../api/types'

type NewInvestigationPageProps = { onCreated: (id: string) => void; onBack: () => void }

function UploadCard({ role, upload, onUpload, error }: {
  role: 'before' | 'after'
  upload: UploadResponse | null
  onUpload: (file: File) => void
  error: string | null
}) {
  const label = role === 'before' ? 'Before dataset' : 'After dataset'
  return (
    <label className="upload-box upload-card">
      <span className="upload-card-title">{label}</span>
      <span className="upload-card-copy">{role === 'before' ? 'The expected result' : 'The unexpected result'}</span>
      <input type="file" accept=".csv,text/csv" onChange={(event) => {
        const file = event.target.files?.[0]
        if (file) onUpload(file)
      }} />
      {upload && <span className="upload-success">✓ {upload.filename} · {upload.row_count.toLocaleString()} rows</span>}
      {error && <span className="error-message">{error}</span>}
    </label>
  )
}

export function NewInvestigationPage({ onCreated, onBack }: NewInvestigationPageProps) {
  const [before, setBefore] = useState<UploadResponse | null>(null)
  const [after, setAfter] = useState<UploadResponse | null>(null)
  const [errors, setErrors] = useState<{ before: string | null; after: string | null }>({ before: null, after: null })
  const [idColumn, setIdColumn] = useState('')
  const [metricKind, setMetricKind] = useState<MetricKind>('count')
  const [metricColumn, setMetricColumn] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const sharedColumns = useMemo(() => {
    if (!before || !after) return []
    return before.columns.filter((column) => after.columns.some((other) => other.name === column.name))
  }, [before, after])
  const numericColumns = sharedColumns.filter((column) => /int|float|decimal|uint/i.test(column.dtype))

  async function handleUpload(role: 'before' | 'after', file: File) {
    setErrors((current) => ({ ...current, [role]: null }))
    try {
      const upload = await uploadDataset(file, role)
      if (role === 'before') setBefore(upload)
      else setAfter(upload)
    } catch (error) {
      setErrors((current) => ({ ...current, [role]: error instanceof Error ? error.message : 'Upload failed' }))
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!before || !after || !idColumn) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const metric = metricKind === 'count' ? { kind: metricKind } : { kind: metricKind, column: metricColumn }
      const created = await createInvestigation(before.upload_id, after.upload_id, idColumn, metric)
      onCreated(created.investigation_id)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not start investigation')
    } finally {
      setSubmitting(false)
    }
  }

  const canStart = Boolean(before && after && idColumn && (metricKind === 'count' || metricColumn))
  return (
    <section className="workspace-card investigation-form">
      <button className="back-link" onClick={onBack}>← Overview</button>
      <p className="eyebrow">New investigation</p>
      <h1>Compare two dataset snapshots</h1>
      <p className="section-copy">Upload CSV files with the same columns and a stable, unique record ID.</p>
      <div className="upload-grid">
        <UploadCard role="before" upload={before} onUpload={(file) => void handleUpload('before', file)} error={errors.before} />
        <UploadCard role="after" upload={after} onUpload={(file) => void handleUpload('after', file)} error={errors.after} />
      </div>
      {before && after && (
        <form onSubmit={submit} className="configure-panel">
          <div className="form-heading"><span className="step-number">02</span><h2>Configure the calculation</h2></div>
          <label className="field-label">Stable record ID
            <select value={idColumn} onChange={(event) => setIdColumn(event.target.value)}>
              <option value="">Select a column…</option>
              {sharedColumns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
            </select>
          </label>
          <label className="field-label">Metric
            <select value={metricKind} onChange={(event) => { setMetricKind(event.target.value as MetricKind); setMetricColumn('') }}>
              <option value="count">Count rows</option><option value="sum">Sum a column</option><option value="average">Average a column</option>
            </select>
          </label>
          {metricKind !== 'count' && <label className="field-label">Metric column
            <select value={metricColumn} onChange={(event) => setMetricColumn(event.target.value)}>
              <option value="">Select a numeric column…</option>
              {numericColumns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}
            </select>
          </label>}
          <p className="config-summary">DataWitness will compare <strong>{before.filename}</strong> with <strong>{after.filename}</strong> by <strong>{idColumn || 'your ID column'}</strong> and test a {metricKind} metric.</p>
          {submitError && <p className="error-message" role="alert">{submitError}</p>}
          <button className="button primary" disabled={!canStart || submitting}>{submitting ? 'Starting…' : 'Start investigation'}</button>
        </form>
      )}
    </section>
  )
}
