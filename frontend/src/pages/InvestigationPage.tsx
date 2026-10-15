import { useEffect, useState } from 'react'
import { Activity, ArrowRight, Check, Download, FileSearch, ListFilter, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { cancelInvestigation, getChanges, getExperiments, getFindings, getInvestigation, replayWitness } from '../api/endpoints'
import { reportUrl } from '../api/client'
import type { Change, Experiment, Finding, InvestigationSummary, ProgressEvent } from '../api/types'
import { PageBack } from '../components/layout/AppShell'
import { MetricCard } from '../components/ui/MetricCard'
import { StatusBadge } from '../components/ui/StatusBadge'

type InvestigationPageProps = { id: string; onBack: () => void; onNavigate: (path: string) => void }
const terminalStatuses = new Set(['completed', 'partial', 'failed', 'cancelled'])
const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 })
const chartColors = ['#6366f1', '#20b486', '#f59e0b', '#94a3b8']
const stages = ['loading', 'validating', 'diffing', 'calculating_baseline', 'searching', 'ranking']

export function InvestigationPage({ id, onBack, onNavigate }: InvestigationPageProps) {
  const [summary, setSummary] = useState<InvestigationSummary | null>(null)
  const [findings, setFindings] = useState<Finding[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [event, setEvent] = useState<ProgressEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [replaying, setReplaying] = useState(false)

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
      } catch (pollError) { if (active) setError(pollError instanceof Error ? pollError.message : 'Could not load investigation') }
      if (active) window.setTimeout(() => void poll(), 600)
    }
    void poll()
    const source = new EventSource(`/api/investigations/${id}/events`)
    source.onmessage = (message) => { try { setEvent(JSON.parse(message.data) as ProgressEvent) } catch { /* Ignore malformed events. */ } }
    return () => { active = false; source.close() }
  }, [id])

  async function cancel() { try { setSummary(await cancelInvestigation(id)); toast.success('Cancellation requested') } catch (cancelError) { toast.error(cancelError instanceof Error ? cancelError.message : 'Could not cancel') } }
  async function replay() { setReplaying(true); try { const result = await replayWitness(id); if (result.matches_target) toast.success('Witness replay verified', { description: `${formatNumber(result.reproduced_value)} matches the after result.` }); else toast.error('Replay did not match the target') } catch (replayError) { toast.error(replayError instanceof Error ? replayError.message : 'Could not replay witness') } finally { setReplaying(false) } }

  if (error && !summary) return <section className="content-card page-error"><p className="error-message" role="alert">{error}</p><button className="button button-secondary" onClick={onBack}>Back to overview</button></section>
  if (!summary) return <section className="loading-panel"><div className="loading-spinner" /><span>Loading investigation…</span></section>

  const running = !terminalStatuses.has(summary.status)
  const progress = event?.percent ?? summary.progress_percent
  const displayEvent = event?.message ?? (summary.status === 'queued' ? 'Investigation queued' : 'Processing datasets')
  const metricData = [{ name: 'Baseline', value: summary.before_result ?? 0 }, { name: 'Updated', value: summary.after_result ?? 0 }]
  const compositionData = [{ name: 'Modified', value: summary.modified_count }, { name: 'Added', value: summary.added_count }, { name: 'Deleted', value: summary.deleted_count }, { name: 'Unchanged', value: summary.unchanged_count }].filter((item) => item.value > 0)
  const reductionData = experiments.map((experiment) => ({ name: `#${experiment.sequence_number}`, count: experiment.selected_change_count }))
  const activeStage = event?.stage ?? summary.stage

  return <div className="investigation-page"><PageBack onBack={onBack} /><section className="investigation-hero"><div><div className="eyebrow-row"><span className="eyebrow-dot" /><span className="eyebrow">Investigation overview</span></div><h1>{summary.before_filename} <span className="muted-arrow">→</span> {summary.after_filename}</h1><div className="investigation-meta"><StatusBadge status={summary.status} /><span>Using <strong>{summary.metric.kind}{summary.metric.column ? ` · ${summary.metric.column}` : ''}</strong></span><span>Record ID <strong>{summary.id_column}</strong></span></div></div><div className="hero-actions"><button className="button button-secondary" onClick={() => window.open(reportUrl(id, 'html'), '_blank')}><Download size={15} /> Export report</button>{running ? <button className="button button-danger" onClick={() => void cancel()}><X size={15} /> Cancel</button> : <button className="button button-primary" onClick={() => void replay()} disabled={replaying}><RefreshCw size={15} /> {replaying ? 'Replaying…' : 'Replay witness'}</button>}</div></section>
    {running && <section className="progress-card"><div className="progress-card-header"><div><span className="eyebrow">Live progress</span><h2>{displayEvent}</h2></div><strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="progress-footer"><span>{event?.experiments_completed ?? summary.experiments_completed} experiments completed</span><span>Budget {event?.experiments_total ?? summary.experiment_budget}</span></div><StageTimeline activeStage={activeStage} /></section>}
    {summary.error_message && <div className="alert alert-danger" role="alert">{summary.error_message}</div>}
    <section className="metric-grid investigation-metrics"><MetricCard label="Baseline result" value={formatNumber(summary.before_result)} detail={summary.before_filename} icon={Activity} /><MetricCard label="Updated result" value={formatNumber(summary.after_result)} detail={summary.after_filename} icon={Sparkles} tone="brand" /><MetricCard label="Observed difference" value={formatSigned(summary.result_delta)} detail="Updated minus baseline" icon={ArrowRight} tone={summary.result_delta && summary.result_delta !== 0 ? 'warning' : 'default'} /><MetricCard label="Verified witness" value={summary.minimal_change_count.toString()} detail={`${summary.changed_count.toLocaleString()} total changed records`} icon={ShieldCheck} tone="success" /></section>
    <section className="chart-grid"><ChartCard title="Metric comparison" eyebrow="Actual calculation results"><ResponsiveContainer width="100%" height={230}><BarChart data={metricData} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} width={52} /><Tooltip cursor={{ fill: 'var(--canvas)' }} content={<ChartTooltip />} /><Bar dataKey="value" fill="var(--brand)" radius={[7, 7, 0, 0]} barSize={42} /></BarChart></ResponsiveContainer></ChartCard><ChartCard title="Change composition" eyebrow="Rows classified by the diff engine"><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={compositionData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={86} paddingAngle={4} stroke="none">{compositionData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer><div className="chart-legend">{compositionData.map((entry, index) => <span key={entry.name}><i style={{ background: chartColors[index % chartColors.length] }} />{entry.name} <strong>{entry.value}</strong></span>)}</div></ChartCard></section>
    {experiments.length > 0 && <section className="content-card reduction-card"><div className="section-heading"><div><span className="eyebrow">Controlled search</span><h2>Candidate set reduction</h2><p>Each point is a real experiment run against the updated metric.</p></div><button className="text-button" onClick={() => onNavigate(`/investigations/${id}/experiments`)}>View experiment history <ArrowRight size={15} /></button></div><ResponsiveContainer width="100%" height={180}><BarChart data={reductionData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} width={30} allowDecimals={false} /><Tooltip cursor={{ fill: 'var(--canvas)' }} content={<ChartTooltip />} /><Bar dataKey="count" fill="#20b486" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></section>}
    <section className={`proof-card ${summary.reproduction_status === 'verified_reproducer' ? 'proof-success' : ''}`}><div className="proof-icon"><ShieldCheck size={22} /></div><div className="proof-copy"><span className="eyebrow">Evidence outcome</span><h2>{summary.reproduction_status === 'verified_reproducer' ? 'Verified reproducer' : summary.reproduction_status === 'no_effect' ? 'No relevant change found' : summary.status === 'partial' ? 'Best result within budget' : 'Investigation result'}</h2><p>{summary.reproduction_status === 'verified_reproducer' ? `DataWitness found ${summary.minimal_change_count} changes that reproduce the updated result within the tested search budget.` : summary.stop_reason ?? 'The investigation has not finished yet.'}</p></div><div className="proof-values"><span>Updated target<strong>{formatNumber(summary.after_result)}</strong></span><span>Witness size<strong>{summary.minimal_change_count}</strong></span></div></section>
    <section className="result-grid"><div className="content-card findings-card"><div className="section-heading"><div><span className="eyebrow">Ranked evidence</span><h2>Findings</h2></div><button className="text-button" onClick={() => onNavigate(`/investigations/${id}/changes`)}>Inspect all <ArrowRight size={15} /></button></div>{findings.slice(0, 5).map((finding) => <FindingRow key={finding.id} finding={finding} />)}{findings.length === 0 && <EmptyResult text={running ? 'Findings will appear when the search completes.' : 'No findings were produced for this metric.'} />}</div><div className="content-card changes-card"><div className="section-heading"><div><span className="eyebrow">Change inventory</span><h2>Detected changes</h2></div><span className="count-badge">{summary.changed_count}</span></div><div className="change-summary-row"><span><strong>{summary.modified_count}</strong> Modified</span><span><strong>{summary.added_count}</strong> Added</span><span><strong>{summary.deleted_count}</strong> Deleted</span></div>{changes.slice(0, 6).map((change) => <div className="compact-change-row" key={change.id}><span className={`kind-badge ${change.kind}`}>{change.kind}</span><strong>{change.record_id}</strong>{change.in_minimal_set && <span className="verified-badge">Verified</span>}</div>)}{!changes.length && <EmptyResult text={running ? 'Change inventory will appear after diffing.' : 'No changes detected.'} />}<button className="button button-ghost full-width" onClick={() => onNavigate(`/investigations/${id}/changes`)}><ListFilter size={15} /> Open changes inspector</button></div></section>
  </div>
}

function StageTimeline({ activeStage }: { activeStage: string }) { const activeIndex = stages.indexOf(activeStage); return <div className="stage-timeline">{stages.map((stage, index) => <div className={`stage-item ${index < activeIndex ? 'stage-complete' : ''} ${index === activeIndex ? 'stage-active' : ''}`} key={stage}><span>{index < activeIndex ? <Check size={12} /> : index + 1}</span><small>{stage.replace('_', ' ')}</small></div>)}</div> }
function ChartCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) { return <div className="content-card chart-card"><div className="chart-card-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div></div>{children}</div> }
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) { if (!active || !payload?.length) return null; return <div className="chart-tooltip"><span>{label ?? payload[0].name}</span><strong>{numberFormat.format(payload[0].value)}</strong></div> }
function FindingRow({ finding }: { finding: Finding }) { return <div className="finding-row"><span className="finding-rank">#{finding.rank}</span><div className="finding-main"><strong>{finding.record_id}</strong><p>{finding.explanation}</p></div><div className="finding-score">{finding.in_minimal_set && <span className="verified-badge">Verified</span>}<strong>{numberFormat.format(finding.score)}</strong></div></div> }
function EmptyResult({ text }: { text: string }) { return <div className="empty-result"><FileSearch size={18} /><span>{text}</span></div> }
function formatNumber(value: number | null) { return value === null ? '—' : numberFormat.format(value) }
function formatSigned(value: number | null) { if (value === null) return '—'; return `${value > 0 ? '+' : ''}${numberFormat.format(value)}` }
