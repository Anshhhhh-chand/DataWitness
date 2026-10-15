import { FilePlus2 } from 'lucide-react'

export function EmptyState({ onNew, onDemo, loading }: { onNew: () => void; onDemo: () => void; loading: boolean }) {
  return <div className="empty-state"><span className="empty-state-icon"><FilePlus2 size={24} /></span><h2>Start your first investigation</h2><p>Compare two CSV snapshots and find the smallest tested set of changes behind an unexpected result.</p><div className="empty-state-actions"><button className="button button-primary" onClick={onNew}>Create investigation</button><button className="button button-secondary" onClick={onDemo} disabled={loading}>{loading ? 'Preparing demo…' : 'Explore demo dataset'}</button></div></div>
}
