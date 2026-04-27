import { useState, useEffect, useCallback } from 'react'
import { Trash2, RefreshCw, BarChart2, List } from 'lucide-react'
import { api } from '../api'
import ResultsChart from '../components/ResultsChart'
import ResultsTable from '../components/ResultsTable'
import ResultDetail from '../components/ResultDetail'
import ExportMenu from '../components/ExportMenu'

export default function History() {
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('both')
  const [confirmClear, setConfirmClear] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getResults(0, 200)
      setResults(data.results)
      setTotal(data.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await api.deleteResult(id).catch(() => {})
    setSelected(null)
    load()
  }

  const handleClearAll = async () => {
    await api.deleteAll().catch(() => {})
    setConfirmClear(false)
    load()
  }

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 24, animation: 'fade-in 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Speed Test History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>{total} results recorded</p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {[
              { id: 'both', label: 'Both' },
              { id: 'chart', label: 'Chart' },
              { id: 'table', label: 'Table' },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setView(id)} style={{
                padding: '7px 14px',
                background: view === id ? 'var(--bg-elevated)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: view === id ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-display)',
                fontSize: 12,
                fontWeight: 600,
                transition: 'all 0.15s',
              }}>
                {label}
              </button>
            ))}
          </div>

          <button className="btn btn-secondary" onClick={load} style={{ padding: '8px 14px', fontSize: 13 }}>
            <RefreshCw size={14} /> Refresh
          </button>

          {/* Export dropdown */}
          <ExportMenu results={results} />

          {/* Clear all */}
          {results.length > 0 && (
            confirmClear ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-danger" onClick={handleClearAll} style={{ fontSize: 12, padding: '8px 14px' }}>Confirm clear all</button>
                <button className="btn btn-secondary" onClick={() => setConfirmClear(false)} style={{ fontSize: 12, padding: '8px 14px' }}>Cancel</button>
              </div>
            ) : (
              <button className="btn btn-secondary" onClick={() => setConfirmClear(true)} style={{ fontSize: 12, padding: '8px 14px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                <Trash2 size={13} /> Clear all
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          {(view === 'both' || view === 'chart') && (
            <div className="card" style={{ padding: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Speed & Latency Trends</h2>
              <ResultsChart results={results} showRangeSelector={true} />
            </div>
          )}
          {(view === 'both' || view === 'table') && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Test Results</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>Select a test to view full details</p>
              </div>
              <ResultsTable results={results} onSelect={setSelected} onDelete={handleDelete} />
            </div>
          )}
        </>
      )}

      {selected && <ResultDetail result={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />}
    </div>
  )
}
