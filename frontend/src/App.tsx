import { useState } from 'react'

function App() {
  const [started, setStarted] = useState(false)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">DW</div>
        <div>
          <strong>DataWitness</strong>
          <span className="eyebrow">REPRODUCIBLE DATA DEBUGGING</span>
        </div>
        <span className="status-pill"><span className="status-dot" /> Local mode</span>
      </header>
      <section className="hero">
        <p className="eyebrow">A deterministic data debugger</p>
        <h1>Find the records behind the result.</h1>
        <p className="hero-copy">
          Compare two CSV versions, run controlled experiments, and verify the
          smallest tested set of changes that recreates an unexpected metric.
        </p>
        <div className="hero-actions">
          <button className="button primary" onClick={() => setStarted(true)}>
            {started ? 'Investigation workspace ready' : 'New investigation'}
          </button>
          <button className="button secondary">Try demo dataset</button>
        </div>
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
      {started && (
        <section className="workspace-card" aria-live="polite">
          <p className="eyebrow">Workspace</p>
          <h2>Start with two CSV snapshots</h2>
          <p>Select a stable ID column after both files are uploaded.</p>
          <div className="upload-grid">
            <label className="upload-box">Before dataset<input type="file" accept=".csv,text/csv" /></label>
            <label className="upload-box">After dataset<input type="file" accept=".csv,text/csv" /></label>
          </div>
        </section>
      )}
    </main>
  )
}

export default App
