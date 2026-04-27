export default function StatCard({ label, value, unit, icon: Icon, color = 'var(--accent-cyan)', delta, sub }) {
  return (
    <div
      className="card"
      style={{
        padding: '20px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* Top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, ${color}00, ${color}, ${color}00)`,
          opacity: 0.7,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          {label}
        </span>
        {Icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `${color}18`,
              border: `1px solid ${color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon size={15} color={color} strokeWidth={2} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 32,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {value ?? '—'}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--text-secondary)',
              fontWeight: 400,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {(delta !== undefined || sub) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -4 }}>
          {sub && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {sub}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
