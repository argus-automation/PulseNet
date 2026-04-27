import { X, Download, Upload, Zap, Server, Globe, Wifi, Calendar, Clock } from 'lucide-react'
import { format, parseISO } from 'date-fns'

function DetailRow({ icon: Icon, label, value, color = 'var(--text-secondary)' }) {
  if (!value) return null
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={14} color={color} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </div>
      </div>
    </div>
  )
}

function SpeedBlock({ label, value, unit, color }) {
  return (
    <div
      style={{
        flex: 1,
        padding: '16px',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${color}30`,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 5 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 600, color }}>
          {value}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
          {unit}
        </span>
      </div>
    </div>
  )
}

export default function ResultDetail({ result, onClose, onDelete }) {
  if (!result) return null

  const ts = parseISO(result.timestamp)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade-in">
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
              Test Result #{result.id}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {format(ts, 'EEEE, MMMM d yyyy — HH:mm:ss')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`tag ${result.triggered_by === 'manual' ? 'tag-cyan' : 'tag-purple'}`}>
              {result.triggered_by}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Speed blocks */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <SpeedBlock label="Download" value={result.download_mbps} unit="Mbps" color="var(--accent-cyan)" />
            <SpeedBlock label="Upload" value={result.upload_mbps} unit="Mbps" color="var(--accent-orange)" />
            <SpeedBlock label="Ping" value={result.ping_ms} unit="ms" color="var(--accent-green)" />
          </div>

          {/* Details */}
          <DetailRow icon={Server} label="Server" value={result.server_sponsor || result.server_name} color="var(--accent-cyan)" />
          <DetailRow icon={Globe} label="Location" value={result.server_location} color="var(--accent-orange)" />
          <DetailRow icon={Wifi} label="ISP" value={result.isp} color="var(--accent-green)" />
          <DetailRow icon={Globe} label="IP Address" value={result.ip_address} color="var(--text-secondary)" />
          <DetailRow
            icon={Calendar}
            label="Date"
            value={format(ts, 'MMMM d, yyyy')}
            color="var(--text-secondary)"
          />
          <DetailRow
            icon={Clock}
            label="Time"
            value={format(ts, 'HH:mm:ss')}
            color="var(--text-secondary)"
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <button className="btn btn-danger" onClick={() => onDelete(result.id)}>
            Delete result
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
