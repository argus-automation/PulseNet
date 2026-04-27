import { useEffect, useState } from 'react'

const RADIUS = 90
const STROKE = 14
const CENTER = 110
const MAX_ANGLE = 240 // degrees of arc

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const s = polarToCartesian(cx, cy, r, startAngle)
  const e = polarToCartesian(cx, cy, r, endAngle)
  const large = endAngle - startAngle > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

export default function SpeedGauge({ value = 0, max = 200, label = 'Mbps', color = 'var(--accent-cyan)', size = 220 }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    let frame
    const start = displayed
    const end = value
    const duration = 900
    const startTime = performance.now()

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(start + (end - start) * eased)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [value]) // eslint-disable-line

  const startAngle = -120
  const endAngle = 120
  const fillAngle = startAngle + (MAX_ANGLE * Math.min(displayed / max, 1))

  const trackPath = arcPath(CENTER, CENTER, RADIUS, startAngle, endAngle)
  const fillPath = arcPath(CENTER, CENTER, RADIUS, startAngle, fillAngle)

  // circumference calc for stroke-dasharray
  const arcLength = (MAX_ANGLE / 360) * 2 * Math.PI * RADIUS

  // Tick marks
  const ticks = Array.from({ length: 9 }, (_, i) => {
    const angle = startAngle + (i / 8) * MAX_ANGLE
    const inner = polarToCartesian(CENTER, CENTER, RADIUS - STROKE / 2 - 6, angle)
    const outer = polarToCartesian(CENTER, CENTER, RADIUS + STROKE / 2 + 4, angle)
    return { inner, outer, major: i % 2 === 0 }
  })

  const svgSize = CENTER * 2
  const scale = size / svgSize

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg
        width={size}
        height={size * 0.75}
        viewBox={`10 30 ${svgSize - 20} ${svgSize * 0.75}`}
        style={{ overflow: 'visible' }}
      >
        {/* Background glow */}
        <defs>
          <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`grad-${label}`} gradientUnits="userSpaceOnUse"
            x1={polarToCartesian(CENTER, CENTER, RADIUS, startAngle).x}
            y1={polarToCartesian(CENTER, CENTER, RADIUS, startAngle).y}
            x2={polarToCartesian(CENTER, CENTER, RADIUS, endAngle).x}
            y2={polarToCartesian(CENTER, CENTER, RADIUS, endAngle).y}
          >
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />

        {/* Fill */}
        <path
          d={fillPath}
          fill="none"
          stroke={`url(#grad-${label})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          filter={`url(#glow-${label})`}
          style={{ transition: 'none' }}
        />

        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <line
            key={i}
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            stroke={tick.major ? 'var(--text-muted)' : 'var(--border)'}
            strokeWidth={tick.major ? 1.5 : 1}
            strokeLinecap="round"
          />
        ))}

        {/* Needle dot */}
        {(() => {
          const needle = polarToCartesian(CENTER, CENTER, RADIUS, fillAngle)
          return (
            <circle
              cx={needle.x}
              cy={needle.y}
              r={6}
              fill={color}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
          )
        })()}

        {/* Value */}
        <text
          x={CENTER}
          y={CENTER + 10}
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize={36}
          fontFamily="var(--font-mono)"
          fontWeight="600"
        >
          {displayed.toFixed(1)}
        </text>
        <text
          x={CENTER}
          y={CENTER + 32}
          textAnchor="middle"
          fill="var(--text-secondary)"
          fontSize={13}
          fontFamily="var(--font-display)"
          fontWeight="600"
          letterSpacing="1"
        >
          {label.toUpperCase()}
        </text>

        {/* Min / Max labels */}
        {(() => {
          const minPt = polarToCartesian(CENTER, CENTER, RADIUS + 22, startAngle)
          const maxPt = polarToCartesian(CENTER, CENTER, RADIUS + 22, endAngle)
          return (
            <>
              <text x={minPt.x} y={minPt.y + 4} textAnchor="middle" fill="var(--text-muted)" fontSize={10} fontFamily="var(--font-mono)">0</text>
              <text x={maxPt.x} y={maxPt.y + 4} textAnchor="middle" fill="var(--text-muted)" fontSize={10} fontFamily="var(--font-mono)">{max}</text>
            </>
          )
        })()}
      </svg>
    </div>
  )
}
