import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight, CheckCircle2, Clock3, FileSearch, Plus, ShieldCheck, Sparkles } from 'lucide-react'
import { getInvestigations } from '../api/endpoints'
import type { InvestigationSummary } from '../api/types'
import { EmptyState } from '../components/ui/EmptyState'
import { MetricCard } from '../components/ui/MetricCard'
import { StatusBadge } from '../components/ui/StatusBadge'

type HomePageProps = { onNew: () => void; onDemo: () => void; onOpenInvestigation: (id: string) => void; demoLoading: boolean; error: string | null }

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export function HomePage({ onNew, onDemo, onOpenInvestigation, demoLoading, error }: HomePageProps) {
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getInvestigations().then((items) => { if (active) setInvestigations(items) }).catch((loadFailure) => { if (active) setLoadError(loadFailure instanceof Error ? loadFailure.message : 'Could not load recent investigations') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const completed = useMemo(() => investigations.filter((item) => item.status === 'completed').length, [investigations])
  const verified = useMemo(() => investigations.filter((item) => item.reproduction_status === 'verified_reproducer').length, [investigations])
  const experiments = useMemo(() => investigations.reduce((total, item) => total + item.experiments_completed, 0), [investigations])

  return <div className="overview-page">
    <section className="overview-hero"><div><div className="eyebrow-row"><span className="eyebrow-dot" /><span className="eyebrow">Deterministic data debugging</span></div><h1>Find the records behind the result.</h1><p>DataWitness compares dataset versions, runs controlled experiments, and shows the smallest tested change set that reproduces an unexpected metric.</p><div className="hero-actions"><button className="button button-primary" onClick={onNew}><Plus size={17} /> New investigation</button><button className="button button-secondary" onClick={onDemo} disabled={demoLoading}><Sparkles size={16} /> {demoLoading ? 'Starting demo…' : 'Try demo dataset'}</button></div></div><div className="hero-proof"><div className="proof-orbit"><ShieldCheck size={28} /></div><span>Local-first by design</span><strong>Evidence over guesses</strong><small>Your CSV files never leave this workspace.</small></div></section>
    {(error || loadError) && <div className="alert alert-danger" role="alert">{error ?? loadError}</div>}
    {loading ? <div className="overview-skeletons"><div /><div /><div /><div /></div> : investigations.length === 0 ? <EmptyState onNew={onNew} onDemo={onDemo} loading={demoLoading} /> : <>
      <section className="metric-grid overview-metrics"><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}><MetricCard label="Recent investigations" value={investigations.length.toString()} detail="Latest workspace activity" icon={FileSearch} tone="brand" /></motion.div><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}><MetricCard label="Completed" value={completed.toString()} detail="Finished investigations" icon={CheckCircle2} tone="success" /></motion.div><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}><MetricCard label="Verified witnesses" value={verified.toString()} detail="Reproducers found" icon={ShieldCheck} /></motion.div><motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}><MetricCard label="Experiments run" value={experiments.toString()} detail="Across recent runs" icon={Clock3} tone="warning" /></motion.div></section>
      <section className="content-card recent-card"><div className="section-heading"><div><span className="eyebrow">Workspace activity</span><h2>Recent investigations</h2></div><button className="text-button" onClick={onNew}>New investigation <ArrowUpRight size={15} /></button></div><div className="recent-list">{investigations.map((item) => <button className="recent-row" key={item.investigation_id} onClick={() => onOpenInvestigation(item.investigation_id)}><span className="recent-icon"><FileSearch size={17} /></span><span className="recent-primary"><strong>{item.before_filename} <span>→</span> {item.after_filename}</strong><small>{dateFormat.format(new Date(item.created_at))} · {item.changed_count.toLocaleString()} changed records</small></span><span className="recent-result">{item.after_result === null ? 'Pending' : item.after_result.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span><StatusBadge status={item.status} /><ArrowUpRight size={15} className="row-arrow" /></button>)}</div></section>
      <section className="overview-lower"><div className="content-card workflow-card"><div className="section-heading"><div><span className="eyebrow">How it works</span><h2>From changed rows to proof</h2></div></div><div className="workflow-steps"><WorkflowStep number="01" title="Compare" copy="Match records by a stable ID and classify every change." /><WorkflowStep number="02" title="Experiment" copy="Test candidate subsets against the real after result." /><WorkflowStep number="03" title="Verify" copy="Review evidence and export a reproducible report." /></div></div><div className="content-card integrity-card"><span className="integrity-icon"><ShieldCheck size={20} /></span><span className="eyebrow">Evidence standard</span><h2>Smallest tested change set</h2><p>DataWitness reports what it verified within the configured search budget, never an untestable causal guess.</p></div></section>
    </>}
  </div>
}

function WorkflowStep({ number, title, copy }: { number: string; title: string; copy: string }) { return <div className="workflow-step"><span>{number}</span><div><strong>{title}</strong><p>{copy}</p></div></div> }
