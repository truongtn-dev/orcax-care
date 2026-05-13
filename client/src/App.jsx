import { useEffect, useState } from 'react'
import './App.css'

const apiBase = import.meta.env.VITE_API_URL || ''

function App() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    const url = apiBase ? `${apiBase}/health` : '/health'
    fetch(url)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth({ ok: false, message: 'API unreachable' }))
  }, [])

  return (
    <main className="app">
      <h1>OrcaXCare</h1>
      <p className="muted">WDP301 · React (Vite) + Express + MongoDB</p>
      <section className="card">
        <h2>API status</h2>
        <pre>{health ? JSON.stringify(health, null, 2) : 'Loading…'}</pre>
        <p className="hint">
          Start the server from <code>server/</code> and optionally set{' '}
          <code>VITE_API_URL</code> in <code>client/.env</code>.
        </p>
      </section>
    </main>
  )
}

export default App
