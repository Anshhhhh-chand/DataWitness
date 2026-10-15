import { CheckCircle2, CircleDashed, Clock3, OctagonAlert, XCircle } from 'lucide-react'

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const config = normalized === 'completed' ? { label: 'Completed', icon: CheckCircle2, tone: 'success' } : normalized === 'running' ? { label: 'Running', icon: CircleDashed, tone: 'info' } : normalized === 'partial' ? { label: 'Partial', icon: Clock3, tone: 'warning' } : normalized === 'failed' ? { label: 'Failed', icon: XCircle, tone: 'danger' } : normalized === 'cancelled' ? { label: 'Cancelled', icon: OctagonAlert, tone: 'muted' } : { label: 'Queued', icon: Clock3, tone: 'muted' }
  const Icon = config.icon
  return <span className={`status-badge status-${config.tone}`}><Icon size={13} /> {config.label}</span>
}
