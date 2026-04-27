import { useState, useEffect, useCallback } from 'react'
import { Play, RefreshCw, Download, Upload, Activity } from 'lucide-react'
import { api } from '../api'
import SpeedGauge from '../components/SpeedGauge'
import ResultsChart from '../components/ResultsChart'
import ResultDetail from '../components/ResultDetail'

export default function Dashboard({ isRunning, setIsRunning, onRefresh }) {
  const [latest, setLatest] = useState(null)
  const [stats, setStats] = useState(null)
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [statsData, resultsData] = await Promise.all([
        api.getStats(),
        api.getResults(0, 30),
      ])
      setStats(statsData)
      setResults(resultsData.results)
      if (statsData.latest) setLatest(statsData.latest)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(async () => {
      const status = await api.getStatus().catch(() => null)
      if (status && !status.is_running) {
        setIsRunning(false)
        load()
        onRefresh?.()
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [isRunning, setIsRunning, load, onRefresh])

  const handleRun = async () => {
    setError('')
    try {
      await api.runTest()
      setIsRunning(true)
    } catch (e) {
      setError(e.message)
    }
  }

  const handleDelete = async (id) => {
    await api.deleteResult(id).catch(() => {})
    setSelected(null)
    load()
  }

  const dl = latest?.download_mbps ?? 0
  const ul = latest?.upload_mbps ?? 0
  const ping = latest?.ping_ms ?? 0

  const pingQuality = ping === 0 ? '—' : ping < 20 ? '⚡ Excellent' : ping < 50 ? '✓ Good' : ping < 100 ? '~ Fair' : '⚠ High'

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            Network Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Live connection monitoring & performance analysis</p>
        </div>
        <button className="btn btn-primary" onClick={handleRun} disabled={isRunning} style={{ fontSize: 14, padding: '10px 22px' }}>
          {isRunning ? (
            <><RefreshCw size={15} style={{ animation: 'spin-slow 1s linear infinite' }} /> Running test…</>
          ) : (
            <><Play size={15} strokeWidth={2.5} /> Run Test</>
          )}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)', color: '#ef4444', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── 4 equal-height metric cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>

        {/* Download */}
        <MetricCard accentColor="var(--accent-cyan)" title="DOWNLOAD ↓">
          <SpeedGauge value={dl} max={200} label="Mbps" color="var(--accent-cyan)" size={160} />
        </MetricCard>

        {/* Upload */}
        <MetricCard accentColor="var(--accent-orange)" title="UPLOAD ↑">
          <SpeedGauge value={ul} max={200} label="Mbps" color="var(--accent-orange)" size={160} />
        </MetricCard>

        {/* Ping */}
        <MetricCard accentColor="var(--accent-green)" title="LATENCY">
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 52, fontWeight: 600, color: 'var(--accent-green)', lineHeight: 1 }}>
                {ping ? ping.toFixed(1) : '—'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text-secondary)' }}>ms</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              {pingQuality}
            </div>
            <div style={{ width: 80, height: 3, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden', marginTop: 4 }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (ping / 150) * 100)}%`,
                background: ping < 20 ? 'var(--accent-green)' : ping < 50 ? 'var(--accent-cyan)' : ping < 100 ? 'var(--accent-orange)' : '#ef4444',
                borderRadius: 2,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        </MetricCard>

        {/* Session Stats */}
        <MetricCard accentColor="var(--accent-purple)" title="Session Summary">
          {stats?.count ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, width: '100%', padding: '0 4px' }}>
              <StatRow label="Total tests" value={stats.count} />
              <div style={{ height: 1, background: 'var(--border-subtle)' }} />
              <StatRow label="Avg. download" value={`${stats.avg_download}`} unit="Mbps" color="var(--accent-cyan)" />
              <StatRow label="Avg upload" value={`${stats.avg_upload}`} unit="Mbps" color="var(--accent-orange)" />
              <StatRow label="Best latency" value={`${stats.min_ping}`} unit="ms" color="var(--accent-green)" />
              <div style={{ height: 1, background: 'var(--border-subtle)' }} />
              <StatRow label="Peak download" value={`${stats.max_download}`} unit="Mbps" color="var(--accent-cyan)" />
              <StatRow label="Peak upload" value={`${stats.max_upload}`} unit="Mbps" color="var(--accent-orange)" />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>No data yet</span>
            </div>
          )}
        </MetricCard>
      </div>

      {/* Chart */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Speed & Latency Timeline</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Download, upload, and latency over the selected period</p>
        </div>
        <ResultsChart results={results} showRangeSelector={true} />
      </div>

      {/* Latest info bar */}
      {latest && (
        <div className="card" style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Last test</div>
          <InfoChip label="Server" value={latest.server_name || '—'} />
          <InfoChip label="ISP" value={latest.isp || '—'} />
          <InfoChip label="IP address" value={latest.ip_address || '—'} />
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setSelected(latest)}>View full result</button>
          </div>
        </div>
      )}

      {selected && <ResultDetail result={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />}
    </div>
  )
}

function MetricCard({ title, accentColor, children }) {
  return (
    <div className="card" style={{
      padding: '20px 16px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      position: 'relative',
      overflow: 'hidden',
      minHeight: 240,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', alignSelf: 'flex-start' }}>
        {title}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        {children}
      </div>
    </div>
  )
}

function StatRow({ label, value, unit, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color: color || 'var(--text-primary)' }}>
        {value}{unit && <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 3, fontSize: 10 }}>{unit}</span>}
      </span>
    </div>
  )
}

function InfoChip({ label, value }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
      {label}: <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}
