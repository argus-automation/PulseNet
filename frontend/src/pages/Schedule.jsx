import { useState, useEffect, useRef } from 'react'
import { Clock, CheckCircle, AlertCircle, Calendar, Activity, RefreshCw } from 'lucide-react'
import { api } from '../api'
import { format, parseISO, formatDistanceToNow } from 'date-fns'

const PRESETS = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '2 hr', value: 120 },
  { label: '6 hr', value: 360 },
  { label: '12 hr', value: 720 },
  { label: '24 hr', value: 1440 },
]

function Countdown({ targetISO }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (!targetISO) return
    const tick = () => {
      try {
        const target = parseISO(targetISO.replace('+00:00', 'Z'))
        const diff = target - Date.now()
        if (diff <= 0) { setLabel('Running soon…'); return }
        const m = Math.floor(diff / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        setLabel(`${m}m ${s.toString().padStart(2, '0')}s`)
      } catch { setLabel('') }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetISO])

  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--accent-cyan)' }}>{label}</span>
}

export default function Schedule() {
  const [config, setConfig] = useState({ enabled: false, interval_minutes: 60 })
  const [status, setStatus] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [recentRuns, setRecentRuns] = useState([])

  const load = async () => {
    const [sched, stat, results] = await Promise.all([
      api.getSchedule(),
      api.getStatus(),
      api.getResults(0, 5),
    ])
    setConfig(sched)
    setStatus(stat)
    setRecentRuns(results.results.filter(r => r.triggered_by === 'scheduled').slice(0, 4))
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(async () => {
      const stat = await api.getStatus().catch(() => null)
      if (stat) setStatus(stat)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await api.setSchedule(config)
    const stat = await api.getStatus()
    setStatus(stat)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) {
    return <div style={{ padding: 28, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>Loading…</div>
  }

  const isActive = config.enabled && status?.next_scheduled_run
  const nextRun = status?.next_scheduled_run

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20, animation: 'fade-in 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Auto-Schedule
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Configure automated speed tests to run at set intervals
          </p>
        </div>
        <button className="btn btn-secondary" onClick={load} style={{ padding: '8px 14px', fontSize: 12 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Main 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* LEFT: config panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Enable toggle */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Enable auto-scheduling</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Automatically run speed tests at the configured interval</div>
              </div>
              <div
                onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
                style={{
                  width: 48, height: 26, borderRadius: 13,
                  background: config.enabled ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
                  border: `1px solid ${config.enabled ? 'var(--accent-cyan)' : 'var(--border)'}`,
                  position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease', flexShrink: 0,
                  boxShadow: config.enabled ? 'var(--shadow-glow-cyan)' : 'none',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: config.enabled ? 24 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: config.enabled ? 'var(--bg-base)' : 'var(--text-muted)',
                  transition: 'left 0.2s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Interval presets */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>Test interval</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>How often to run an automatic speed test</div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {PRESETS.map((p) => (
                <button key={p.value} onClick={() => setConfig((c) => ({ ...c, interval_minutes: p.value }))}
                  style={{
                    padding: '7px 14px', borderRadius: 100,
                    border: `1px solid ${config.interval_minutes === p.value ? 'rgba(0,212,245,0.4)' : 'var(--border)'}`,
                    background: config.interval_minutes === p.value ? 'var(--accent-cyan-dim)' : 'var(--bg-elevated)',
                    color: config.interval_minutes === p.value ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Custom:</span>
              <input
                type="number" min={1} max={10080}
                value={config.interval_minutes}
                onChange={(e) => setConfig((c) => ({ ...c, interval_minutes: Math.max(1, parseInt(e.target.value) || 1) }))}
                style={{
                  width: 80, padding: '6px 10px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none',
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>minutes</span>
            </div>
          </div>

          {/* Info */}
          <div style={{
            padding: '14px 18px', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', background: 'var(--bg-elevated)',
            display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-secondary)',
          }}>
            <AlertCircle size={16} color="var(--accent-orange)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Scheduled tests run in the background. Each test takes approximately 30–60 seconds. All results are saved automatically and visible in the History page.</span>
          </div>

          {/* Save button */}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}
            style={{ justifyContent: 'center', padding: '13px', fontSize: 15, fontWeight: 700, letterSpacing: '0.3px' }}>
            {saving ? (
              <><RefreshCw size={16} style={{ animation: 'spin-slow 1s linear infinite' }} /> Saving…</>
            ) : saved ? (
              <><CheckCircle size={16} /> Schedule saved!</>
            ) : (
              <><Calendar size={16} /> Save schedule</>
            )}
          </button>
        </div>

        {/* RIGHT: status + recent runs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Live status card */}
          <div className="card" style={{
            padding: '24px',
            background: isActive ? 'rgba(0,212,245,0.04)' : 'var(--bg-card)',
            border: `1px solid ${isActive ? 'rgba(0,212,245,0.2)' : 'var(--border)'}`,
            position: 'relative', overflow: 'hidden',
          }}>
            {isActive && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--accent-cyan), transparent)' }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span className={`status-dot ${isActive ? 'running' : 'idle'}`} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                Scheduler is {isActive ? 'active' : 'inactive'}
              </span>
            </div>

            {isActive && nextRun ? (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Next run in</div>
                <Countdown targetISO={nextRun} />
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  {format(parseISO(nextRun.replace('+00:00', 'Z')), 'MMM d, HH:mm:ss')}
                </div>
                <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>Interval</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                    Every {config.interval_minutes >= 60
                      ? `${config.interval_minutes / 60}h`
                      : `${config.interval_minutes}m`}
                  </span>
                </div>
              </>
            ) : (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                Enable scheduling and save to activate automatic tests.
              </div>
            )}
          </div>

          {/* Recent scheduled runs */}
          <div className="card" style={{ padding: '20px 22px', flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 14 }}>
              Recent scheduled runs
            </div>
            {recentRuns.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>No scheduled runs yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recentRuns.map((r) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)',
                    marginBottom: 6,
                  }}>
                    <Activity size={13} color="var(--accent-purple)" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                        {format(parseISO(r.timestamp), 'MMM d, HH:mm:ss')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-cyan)' }}>↓{r.download_mbps}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-orange)' }}>↑{r.upload_mbps}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-green)' }}>{r.ping_ms}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
