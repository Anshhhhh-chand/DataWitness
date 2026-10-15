import type { LucideIcon } from 'lucide-react'

export function MetricCard({ label, value, detail, icon: Icon, tone = 'default' }: { label: string; value: string; detail?: string; icon: LucideIcon; tone?: 'default' | 'brand' | 'success' | 'warning' }) {
  return <article className={`metric-card metric-card-${tone}`}><div className="metric-card-top"><span className="metric-icon"><Icon size={17} /></span><span className="metric-label">{label}</span></div><strong>{value}</strong>{detail && <small>{detail}</small>}</article>
}
