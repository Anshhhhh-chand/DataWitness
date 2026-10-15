import { useMemo, useState } from 'react'
import { Check, FileSpreadsheet, Info, UploadCloud, X } from 'lucide-react'
import { toast } from 'sonner'
import { createInvestigation, uploadDataset } from '../api/endpoints'
import type { MetricKind, UploadResponse } from '../api/types'
import { PageBack } from '../components/layout/AppShell'

type NewInvestigationPageProps = { onCreated: (id: string) => void; onBack: () => void }

export function NewInvestigationPage({ onCreated, onBack }: NewInvestigationPageProps) {
  const [before, setBefore] = useState<UploadResponse | null>(null)
  const [after, setAfter] = useState<UploadResponse | null>(null)
  const [errors, setErrors] = useState<{ before: string | null; after: string | null }>({ before: null, after: null })
  const [idColumn, setIdColumn] = useState('')
  const [metricKind, setMetricKind] = useState<MetricKind>('count')
  const [metricColumn, setMetricColumn] = useState('')
  const [uploading, setUploading] = useState<'before' | 'after' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const sharedColumns = useMemo(() => before && after ? before.columns.filter((column) => after.columns.some((other) => other.name === column.name)) : [], [before, after])
  const columnsMatch = Boolean(before && after && before.columns.length === after.columns.length && sharedColumns.length === before.columns.length)
  const numericColumns = sharedColumns.filter((column) => /int|float|decimal|uint/i.test(column.dtype))
  const step = !before || !after ? 1 : !idColumn || (metricKind !== 'count' && !metricColumn) ? 2 : 3
  const canStart = Boolean(before && after && idColumn && (metricKind === 'count' || metricColumn))

  async function handleUpload(role: 'before' | 'after', file: File) {
    setErrors((current) => ({ ...current, [role]: null }))
    if (!file.name.toLowerCase().endsWith('.csv')) { setErrors((current) => ({ ...current, [role]: 'Please choose a CSV file.' })); return }
    setUploading(role)
    try {
      const upload = await uploadDataset(file, role)
      if (role === 'before') setBefore(upload)
      else setAfter(upload)
      toast.success(`${role === 'before' ? 'Baseline' : 'Updated'} dataset uploaded`, { description: `${upload.row_count.toLocaleString()} rows ready to inspect.` })
    } catch (error) {
      setErrors((current) => ({ ...current, [role]: error instanceof Error ? error.message : 'Upload failed' }))
      toast.error('Upload failed')
    } finally { setUploading(null) }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!before || !after || !idColumn) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const metric = metricKind === 'count' ? { kind: metricKind } : { kind: metricKind, column: metricColumn }
      const created = await createInvestigation(before.upload_id, after.upload_id, idColumn, metric)
      toast.success('Investigation started', { description: 'The comparison is now running locally.' })
      onCreated(created.investigation_id)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not start investigation')
      toast.error('Could not start investigation')
    } finally { setSubmitting(false) }
  }

  return <div className="workflow-page"><PageBack onBack={onBack} /><div className="workflow-header"><div><span className="eyebrow">New investigation</span><h1>Trace a result across two snapshots.</h1><p>Upload the expected and unexpected versions of your CSV. We’ll validate the shape before running any experiments.</p></div><div className="privacy-note"><Info size={16} /><span><strong>Local processing</strong><small>Files stay in this workspace.</small></span></div></div><StepRail active={step} />
    <form onSubmit={submit} className="workflow-form"><section className="content-card workflow-section"><div className="section-heading"><div><span className="eyebrow">Step 1</span><h2>Upload your datasets</h2><p>Both files should contain the same columns. Record matching uses the stable ID you choose next.</p></div><span className="step-state">{before && after ? <><Check size={14} /> Ready</> : 'Required'}</span></div><div className="upload-grid polished-upload-grid"><UploadCard role="before" upload={before} error={errors.before} uploading={uploading === 'before'} onUpload={(file) => void handleUpload('before', file)} onRemove={() => setBefore(null)} /><UploadCard role="after" upload={after} error={errors.after} uploading={uploading === 'after'} onUpload={(file) => void handleUpload('after', file)} onRemove={() => setAfter(null)} /></div>{before && after && <div className={`schema-callout ${columnsMatch ? 'schema-good' : 'schema-warning'}`}><span>{columnsMatch ? <Check size={16} /> : <Info size={16} />}</span><span><strong>{columnsMatch ? 'Schema compatible' : 'Check the dataset columns'}</strong><small>{columnsMatch ? `${sharedColumns.length} shared columns detected. Column order can differ.` : 'The datasets must contain the same set of columns before you can continue.'}</small></span></div>}</section>
      {before && after && <section className="content-card workflow-section"><div className="section-heading"><div><span className="eyebrow">Step 2</span><h2>Define the calculation</h2><p>Choose how DataWitness should compare the baseline and updated datasets.</p></div><span className="step-state">{idColumn ? <><Check size={14} /> Configured</> : 'Required'}</span></div><div className="config-grid"><label className="field-label">Stable record ID<select value={idColumn} onChange={(event) => setIdColumn(event.target.value)}><option value="">Select a column…</option>{sharedColumns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}</select><small>This identifies the same record across both files.</small></label><label className="field-label">Metric<select value={metricKind} onChange={(event) => { setMetricKind(event.target.value as MetricKind); setMetricColumn('') }}><option value="count">Count rows</option><option value="sum">Sum a column</option><option value="average">Average a column</option></select><small>Use the calculation that changed unexpectedly.</small></label>{metricKind !== 'count' && <label className="field-label">Metric column<select value={metricColumn} onChange={(event) => setMetricColumn(event.target.value)}><option value="">Select a numeric column…</option>{numericColumns.map((column) => <option key={column.name} value={column.name}>{column.name}</option>)}</select><small>Only numeric columns are available.</small></label>}</div><div className="preview-grid"><PreviewTable label="Baseline preview" upload={before} /><PreviewTable label="Updated preview" upload={after} /></div></section>}
      {before && after && <section className="content-card workflow-section confirm-section"><div className="section-heading"><div><span className="eyebrow">Step 3</span><h2>Confirm and run</h2><p>Review the inputs before DataWitness starts the deterministic search.</p></div><span className="step-state">{canStart ? <><Check size={14} /> Ready to run</> : 'Waiting for setup'}</span></div><div className="confirmation-grid"><ConfirmItem label="Datasets" value={`${before.filename} → ${after.filename}`} /><ConfirmItem label="Record ID" value={idColumn || 'Not selected'} /><ConfirmItem label="Metric" value={metricKind === 'count' ? 'Count rows' : `${metricKind} of ${metricColumn || 'column'}`} /><ConfirmItem label="Rows" value={`${before.row_count.toLocaleString()} → ${after.row_count.toLocaleString()}`} /></div><p className="config-summary">DataWitness will compare the two versions by <strong>{idColumn || 'your stable ID'}</strong>, calculate the <strong>{metricKind}</strong> result, and test changed records until it finds the smallest reproducing set within the configured budget.</p>{submitError && <p className="error-message" role="alert">{submitError}</p>}<button className="button button-primary button-large" disabled={!canStart || !columnsMatch || submitting}>{submitting ? 'Starting investigation…' : 'Start investigation'}</button></section>}
    </form>
  </div>
}

function StepRail({ active }: { active: number }) { return <div className="step-rail" aria-label="Investigation setup progress">{[['01', 'Upload'], ['02', 'Configure'], ['03', 'Confirm']].map(([number, label], index) => <div className={`step-rail-item ${active === index + 1 ? 'active' : ''} ${active > index + 1 ? 'complete' : ''}`} key={number}><span>{active > index + 1 ? <Check size={14} /> : number}</span><strong>{label}</strong>{index < 2 && <i />}</div>)}</div> }

function UploadCard({ role, upload, error, uploading, onUpload, onRemove }: { role: 'before' | 'after'; upload: UploadResponse | null; error: string | null; uploading: boolean; onUpload: (file: File) => void; onRemove: () => void }) {
  const label = role === 'before' ? 'Baseline dataset' : 'Updated dataset'
  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) onUpload(file) }
  return <label className={`upload-dropzone ${upload ? 'upload-complete' : ''} ${error ? 'upload-error' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}><input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file) }} />{upload ? <><span className="file-icon"><FileSpreadsheet size={21} /></span><span className="upload-file-name">{upload.filename}</span><span className="upload-file-meta">{upload.row_count.toLocaleString()} rows · {(upload.size_bytes / 1024).toFixed(1)} KB</span><button type="button" className="upload-remove" onClick={(event) => { event.preventDefault(); onRemove() }} aria-label={`Remove ${label}`}><X size={14} /></button></> : <><span className="upload-cloud"><UploadCloud size={23} /></span><strong>{label}</strong><span className="upload-help">{uploading ? 'Uploading and validating…' : 'Drop a CSV here or browse'}</span><small>{role === 'before' ? 'The expected result' : 'The unexpected result'}</small></>}{error && <span className="error-message">{error}</span>}</label>
}

function PreviewTable({ label, upload }: { label: string; upload: UploadResponse }) { const columns = upload.columns.slice(0, 4); return <div className="preview-card"><div className="preview-title"><span>{label}</span><small>First {Math.min(3, upload.preview_rows.length)} rows</small></div><div className="mini-table-wrap"><table className="mini-table"><thead><tr>{columns.map((column) => <th key={column.name}>{column.name}</th>)}</tr></thead><tbody>{upload.preview_rows.slice(0, 3).map((row, index) => <tr key={index}>{columns.map((column) => <td key={column.name}>{String(row[column.name] ?? '—')}</td>)}</tr>)}</tbody></table></div></div> }
function ConfirmItem({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div> }
