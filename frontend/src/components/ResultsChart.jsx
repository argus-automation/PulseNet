import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { format, parseISO, subMinutes, subHours, subDays, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'

const METRICS = [
  { key: 'download_mbps', label: 'Download', color: 'var(--accent-cyan)',   unit: 'Mbps' },
  { key: 'upload_mbps',   label: 'Upload',   color: 'var(--accent-orange)', unit: 'Mbps' },
  { key: 'ping_ms',       label: 'Ping',     color: 'var(--accent-green)',  unit: 'ms'   },
]

// Time range presets — null cutoff means "all"
const RANGES = [
  { label: '5 min',   minutes: 5 },
  { label: '30 min',  minutes: 30 },
  { label: '1 hr',    minutes: 60 },
  { label: '6 hr',    minutes: 360 },
  { label: '24 hr',   minutes: 1440 },
  { label: '7 days',  minutes: 10080 },
  { label: '30 days', minutes: 43200 },
  { label: 'All',     minutes: null },
]

/** Pick a smart X-axis format string based on the span of the visible data */
function pickTimeFormat(spanMinutes) {
  if (spanMinutes === null || spanMinutes > 10080) return 'MMM d'      // > 7 days  → Jan 5
  if (spanMinutes > 1440)  return 'EEE HH:mm'                          // > 1 day   → Mon 14:30
  if (spanMinutes > 60)    return 'HH:mm'                              // > 1 hr    → 14:30
  return 'HH:mm:ss'                                                    // ≤ 1 hr    → 14:30:05
}

/** Tooltip shows the full timestamp always */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '10px 14px',
      fontFamily: 'var(--font-mono)', fontSize: 12, minWidth: 170,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: 11 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between',
                                      gap: 16, color: p.color, marginBottom: 2 }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{p.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

export default function ResultsChart({ results, showRangeSelector = false }) {
  const [activeMetrics, setActiveMetrics] = useState(['download_mbps', 'upload_mbps', 'ping_ms'])
  const [rangeIdx, setRangeIdx] = useState(7) // default = "All"

  const selectedRange = RANGES[rangeIdx]

  // Filter + sort results by chosen time range
  const filtered = useMemo(() => {
    const sorted = [...results].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    if (!selectedRange.minutes) return sorted
    const cutoff = subMinutes(new Date(), selectedRange.minutes)
    return sorted.filter(r => new Date(r.timestamp) >= cutoff)
  }, [results, selectedRange])

  // Compute span of visible data to pick tick format
  const spanMinutes = useMemo(() => {
    if (filtered.length < 2) return selectedRange.minutes
    const first = new Date(filtered[0].timestamp)
    const last  = new Date(filtered[filtered.length - 1].timestamp)
    return differenceInMinutes(last, first) || 1
  }, [filtered, selectedRange])

  const timeFmt = pickTimeFormat(spanMinutes)

  const data = filtered.map(r => ({
    ...r,
    time:     format(parseISO(r.timestamp), timeFmt),
    fullTime: format(parseISO(r.timestamp), 'MMM d yyyy, HH:mm:ss'),
  }))

  const toggle = (key) =>
    setActiveMetrics(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])

  const showMs   = activeMetrics.includes('ping_ms')
  const showMbps = activeMetrics.includes('download_mbps') || activeMetrics.includes('upload_mbps')

  if (!results.length) {
    return (
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
        No data yet — run a speed test to begin
      </div>
    )
  }

  return (
    <div>
      {/* ── Controls row: metric toggles (left) + range selector (right) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        {/* Metric pills */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {METRICS.map(({ key, label, color }) => (
            <button key={key} onClick={() => toggle(key)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 11px', borderRadius: 100,
              border: `1px solid ${activeMetrics.includes(key) ? color + '60' : 'var(--border)'}`,
              background: activeMetrics.includes(key) ? color + '18' : 'transparent',
              color: activeMetrics.includes(key) ? color : 'var(--text-muted)',
              fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                             background: activeMetrics.includes(key) ? color : 'var(--text-muted)' }} />
              {label}
            </button>
          ))}
        </div>

        {/* Time range dropdown */}
        {showRangeSelector && (
          <select
            value={rangeIdx}
            onChange={e => setRangeIdx(Number(e.target.value))}
            style={{
              padding: '5px 10px', background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)', fontFamily: 'var(--font-display)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none',
            }}
          >
            {RANGES.map((r, i) => (
              <option key={r.label} value={i}>{r.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Empty state after filtering ── */}
      {!data.length && (
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          No results in the last {selectedRange.label}
        </div>
      )}

      {!!data.length && (
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 5, right: showMs ? 50 : 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />

            <XAxis
              dataKey="time"
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--border)' }} tickLine={false}
              interval="preserveStartEnd"
            />

            <YAxis yAxisId="mbps" orientation="left"
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false} tickLine={false} width={42}
              label={{ value: 'Mbps', angle: -90, position: 'insideLeft',
                       fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)', dx: -4 }}
            />

            {showMs && (
              <YAxis yAxisId="ms" orientation="right"
                tick={{ fill: 'var(--accent-green)', fontSize: 11, fontFamily: 'var(--font-mono)', opacity: 0.7 }}
                axisLine={false} tickLine={false} width={42}
                label={{ value: 'ms', angle: 90, position: 'insideRight',
                         fill: 'var(--accent-green)', fontSize: 11, fontFamily: 'var(--font-mono)', dx: 12, opacity: 0.7 }}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {activeMetrics.includes('download_mbps') && (
              <Line yAxisId="mbps" type="monotone" dataKey="download_mbps" name="Download"
                stroke="var(--accent-cyan)" strokeWidth={2}
                dot={{ r: 3, fill: 'var(--accent-cyan)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'var(--accent-cyan)' }} />
            )}
            {activeMetrics.includes('upload_mbps') && (
              <Line yAxisId="mbps" type="monotone" dataKey="upload_mbps" name="Upload"
                stroke="var(--accent-orange)" strokeWidth={2}
                dot={{ r: 3, fill: 'var(--accent-orange)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'var(--accent-orange)' }} />
            )}
            {showMs && activeMetrics.includes('ping_ms') && (
              <Line yAxisId="ms" type="monotone" dataKey="ping_ms" name="Ping"
                stroke="var(--accent-green)" strokeWidth={2} strokeDasharray="5 3"
                dot={{ r: 3, fill: 'var(--accent-green)', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: 'var(--accent-green)' }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
