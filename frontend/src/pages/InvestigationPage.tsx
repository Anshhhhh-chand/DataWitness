import { useEffect, useMemo, useState } from 'react'
import { cancelInvestigation, getChanges, getExperiments, getFindings, getInvestigation } from '../api/endpoints'
import { reportUrl } from '../api/client'
import type { Change, Experiment, Finding, InvestigationSummary, ProgressEvent } from '../api/types'

type InvestigationPageProps = { id: string; onBack: () => void }

const terminalStatuses = new Set(['completed', 'partial', 'failed', 'cancelled'])
const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 })

export function InvestigationPage({ id, onBack }: InvestigationPageProps) {
  const [summary, setSummary] = useState<InvestigationSummary | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [changeSearch, setChangeSearch] = useState('')
  const [changeKind, setChangeKind] = useState('all')
  const filteredChanges = useMemo(() => changes.filter((change) => (changeKind === 'all' || change.kind === changeKind) && change.record_id.toLowerCase().includes(changeSearch.toLowerCase())), [changeKind, changeSearch, changes])
  const [event, setEvent] = useState<ProgressEvent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const poll = async () => {
      try {
        const next = await getInvestigation(id)
        if (!active) return
        setSummary(next)
        if (terminalStatuses.has(next.status)) {
          const [findingResponse, changeResponse, experimentResponse] = await Promise.all([getFindings(id), getChanges(id), getExperiments(id)])
          if (active) { setFindings(findingResponse); setChanges(changeResponse.items); setExperiments(experimentResponse) }
          return
        }
      } catch (pollError) {
        if (active) setError(pollError instanceof Error ? pollError.message : 'Could not load investigation')
      }
      if (active) window.setTimeout(() => void poll(), 600)
    }
    void poll()
    const source = new EventSource(`/api/investigations/${id}/events`)
    source.onmessage = (message) => { try { setEvent(JSON.parse(message.data) as ProgressEvent) } catch { /* Ignore malformed events. */ } }
    return () => { active = false; source.close() }
  }, [id])

  async function cancel() {
    try { setSummary(await cancelInvestigation(id)) } catch (cancelError) { setError(cancelError instanceof Error ? cancelError.message : 'Could not cancel') }
  }

  if (error && !summary) return <section className="workspace-card"><p className="error-message" role="alert">{error}</p><button className="button secondary" onClick={onBack}>Back to overview</button></section>
  if (!summary) return <section className="workspace-card loading-state" aria-live="polite">Loading investigation…</section>

  const progress = event?.percent ?? summary.progress_percent
  const running = !terminalStatuses.has(summary.status)
  const displayEvent = event?.message ?? (summary.status === 'queued' ? 'Investigation queued' : 'Processing datasets')
  return (
    <section className="dashboard">
      <div className="dashboard-header"><div><button className="back-link" onClick={onBack}>← Overview</button><p className="eyebrow">Investigation</p><h1>{summary.before_filename} <span>→</span> {summary.after_filename}</h1></div>{running && <button className="button secondary" onClick={() => void cancel()}>Cancel</button>}</div>
      {running && <div className="progress-panel" aria-live="polite"><div className="progress-label"><strong>{displayEvent}</strong><span>{progress}%</span></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p>{event?.experiments_completed ?? 0} experiments completed</p></div>}
      {summary.error_message && <div className="alert error-message" role="alert">{summary.error_message}</div>}
      <div className="metric-grid">
        <MetricCard label="Before result" value={summary.before_result} />
        <MetricCard label="After result" value={summary.after_result} />
        <MetricCard label="Output change" value={summary.result_delta} accent />
        <MetricCard label="Minimal reproducer" value={summary.minimal_change_count} suffix="changes" />
      </div>
      <div className={`proof-panel ${summary.reproduction_status === 'verified_reproducer' ? 'success' : ''}`}>
        <p className="eyebrow">{summary.status}</p>
        <h2>{summary.reproduction_status === 'verified_reproducer' ? 'Verified reproducer' : summary.reproduction_status === 'no_effect' ? 'No relevant change found' : 'Investigation result'}</h2>
        <p>{summary.reproduction_status === 'verified_reproducer' ? `DataWitness found ${summary.minimal_change_count} changes that reproduce the after result within the tested search budget.` : summary.stop_reason ?? 'The investigation has not finished yet.'}</p>
        {summary.minimal_change_count > 0 && <p><strong>{summary.minimal_change_count}</strong> verified change records · expected after result <strong>{formatNumber(summary.after_result)}</strong></p>}
      </div>
      <div className="dashboard-columns"><section className="panel"><div className="panel-header"><div><p className="eyebrow">Evidence</p><h2>Ranked findings</h2></div><span className="count-badge">{findings.length}</span></div>{findings.slice(0, 8).map((finding) => <FindingRow key={finding.id} finding={finding} />)}{!findings.length && <p className="empty-copy">Findings will appear when the search completes.</p>}</section><section className="panel"><div className="panel-header"><div><p className="eyebrow">Change inventory</p><h2>Detected changes</h2></div><span className="count-badge">{summary.changed_count}</span></div><div className="change-breakdown"><span><strong>{summary.modified_count}</strong> modified</span><span><strong>{summary.added_count}</strong> added</span><span><strong>{summary.deleted_count}</strong> deleted</span></div><div className="change-filters"><input aria-label="Search record IDs" placeholder="Search record IDs" value={changeSearch} onChange={(event) => setChangeSearch(event.target.value)} /><select aria-label="Filter change kind" value={changeKind} onChange={(event) => setChangeKind(event.target.value)}><option value="all">All changes</option><option value="modified">Modified</option><option value="added">Added</option><option value="deleted">Deleted</option></select></div>{filteredChanges.slice(0, 20).map((change) => <div className="change-row" key={change.id}><span className={`kind-badge ${change.kind}`}>{change.kind}</span><strong>{change.record_id}</strong>{change.in_minimal_set && <span className="verified-badge">Verified</span>}</div>)}{!filteredChanges.length && <p className="empty-copy">Changes will appear when the comparison completes.</p>}</section></div>
      <section className="panel experiments-panel"><div className="panel-header"><div><p className="eyebrow">Controlled experiments</p><h2>Experiment history</h2></div><span className="count-badge">{experiments.length}</span></div>{experiments.slice(-10).reverse().map((experiment) => <div className="experiment-row" key={experiment.sequence_number}><strong>#{experiment.sequence_number}</strong><span>{experiment.selected_change_count} changes tested</span><span>{formatNumber(experiment.output_value)}</span><span className={experiment.matches_target ? 'match-label' : ''}>{experiment.matches_target ? 'Matched target' : 'Candidate'}</span>{experiment.cache_hit && <span className="cache-label">Cache</span>}</div>)}{!experiments.length && <p className="empty-copy">Experiment history will appear when the search completes.</p>}</section>
      {terminalStatuses.has(summary.status) && <div className="report-links"><span>Download report</span><a href={reportUrl(id, 'html')}>HTML</a><a href={reportUrl(id, 'json')}>JSON</a><a href={reportUrl(id, 'csv')}>CSV</a></div>}
    </section>
  )
}

function formatNumber(value: number | null) { return value === null ? '—' : numberFormat.format(value) }
function MetricCard({ label, value, suffix, accent }: { label: string; value: number | null; suffix?: string; accent?: boolean }) { return <div className={`metric-card ${accent ? 'accent' : ''}`}><span>{label}</span><strong>{formatNumber(value)}</strong>{suffix && <small>{suffix}</small>}</div> }
function FindingRow({ finding }: { finding: Finding }) { return <div className="finding-row"><div><strong>#{finding.rank} · {finding.record_id}</strong><p>{finding.explanation}</p></div><div className="finding-score">{finding.in_minimal_set && <span className="verified-badge">Verified</span>}<strong>{numberFormat.format(finding.score)}</strong></div></div> }
