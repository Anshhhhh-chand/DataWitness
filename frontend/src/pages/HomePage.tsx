type HomePageProps = {
  onNew: () => void
  onDemo: () => void
  demoLoading: boolean
  error: string | null
}

export function HomePage({ onNew, onDemo, demoLoading, error }: HomePageProps) {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">A deterministic data debugger</p>
        <h1>Find the records behind the result.</h1>
        <p className="hero-copy">
          Compare two CSV versions, run controlled experiments, and verify the
          smallest tested set of changes that recreates an unexpected metric.
        </p>
        <div className="hero-actions">
          <button className="button primary" onClick={onNew}>New investigation</button>
          <button className="button secondary" onClick={onDemo} disabled={demoLoading}>
            {demoLoading ? 'Starting demo…' : 'Try demo dataset'}
          </button>
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
      </section>
      <section className="steps" aria-label="Investigation steps">
        {[
          ['01', 'Upload', 'Add before and after CSV files.'],
          ['02', 'Compare', 'Classify added, deleted, and modified records.'],
          ['03', 'Experiment', 'Search deterministic candidate subsets.'],
          ['04', 'Verify', 'Review proof and download a report.'],
        ].map(([number, title, copy]) => (
          <article className="step-card" key={number}>
            <span className="step-number">{number}</span>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>
    </>
  )
}
