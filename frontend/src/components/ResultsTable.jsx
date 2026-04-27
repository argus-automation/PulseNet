import { format, parseISO } from 'date-fns'
import { ChevronRight, Trash2 } from 'lucide-react'

export default function ResultsTable({ results, onSelect, onDelete }) {
  if (!results.length) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
        No results yet — run your first speed test to begin tracking.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['#', 'Timestamp', 'Download', 'Upload', 'Ping', 'Server', 'ISP', 'Triggered', ''].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r)}
              style={{ cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.12s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={tdStyle}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{r.id}</span>
              </td>
              <td style={tdStyle}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)' }}>
                  {format(parseISO(r.timestamp), 'MMM d, HH:mm')}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                  {format(parseISO(r.timestamp), 'yyyy')}
                </div>
              </td>
              <td style={tdStyle}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent-cyan)', fontWeight: 600 }}>{r.download_mbps}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>Mbps</span>
              </td>
              <td style={tdStyle}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent-orange)', fontWeight: 600 }}>{r.upload_mbps}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>Mbps</span>
              </td>
              <td style={tdStyle}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent-green)', fontWeight: 600 }}>{r.ping_ms}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>ms</span>
              </td>
              {/* Server: show sponsor/server name — NOT the city */}
              <td style={tdStyle}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.server_sponsor || r.server_name || '—'}
                </div>
              </td>
              {/* NEW: ISP column */}
              <td style={tdStyle}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-cyan)', opacity: 0.85, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.isp || '—'}
                </div>
              </td>
              <td style={tdStyle}>
                <span className={`tag ${r.triggered_by === 'manual' ? 'tag-cyan' : 'tag-purple'}`}>{r.triggered_by}</span>
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(r.id) }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={14} color="var(--text-muted)" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const thStyle = {
  padding: '10px 14px',
  textAlign: 'left',
  fontFamily: 'var(--font-display)',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

const tdStyle = { padding: '11px 14px', verticalAlign: 'middle' }
