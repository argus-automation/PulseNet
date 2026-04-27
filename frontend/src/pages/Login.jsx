import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, Wifi, Activity, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

/* ── Password strength ──────────────────────────────────────────────────── */
function calcStrength(pw) {
  const checks = [
    { label: '8+ characters', ok: pw.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(pw) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(pw) },
    { label: 'Number', ok: /[0-9]/.test(pw) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(pw) },
  ]
  const score = checks.filter(c => c.ok).length
  return { checks, score, label: ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][score] }
}

const STRENGTH_COLOR = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#00d4f5']

/* ── Animated background SVG ────────────────────────────────────────────── */
function PulseBackground() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 500 500"
      style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00d4f5" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#050911" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="250" cy="250" r="200" fill="url(#bgGrad)" />
      {[80, 140, 200].map((r, i) => (
        <circle key={i} cx="250" cy="250" r={r}
          fill="none" stroke="#00d4f5" strokeWidth="0.8" opacity={0.4 - i * 0.1}
          style={{ animation: `pulse-ring ${2.5 + i * 0.7}s ease-out infinite`, animationDelay: `${i * 0.4}s` }}
        />
      ))}
      {/* Signal wave path */}
      <path d="M 60 250 Q 100 200 140 250 Q 180 300 220 250 Q 260 200 300 250 Q 340 300 380 250 Q 420 200 440 250"
        stroke="#00d4f5" strokeWidth="2" fill="none" opacity="0.6"
        style={{ animation: 'fade-in 2s ease infinite alternate' }}
      />
    </svg>
  )
}

/* ── Input component ────────────────────────────────────────────────────── */
function Field({ label, type = 'text', value, onChange, placeholder, error, right }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600,
                      color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: right ? '11px 42px 11px 14px' : '11px 14px',
            background: 'var(--bg-elevated)', border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => !error && (e.target.style.borderColor = 'var(--accent-cyan)')}
          onBlur={e  => !error && (e.target.style.borderColor = 'var(--border)')}
        />
        {right && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}>
            {right}
          </div>
        )}
      </div>
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444', fontSize: 12 }}>
          <AlertCircle size={12} /> {error}
        </div>
      )}
    </div>
  )
}

/* ── Main Login page ─────────────────────────────────────────────────────── */
export default function Login() {
  const navigate  = useNavigate()
  const { login } = useAuth()
  const { theme, toggle } = useTheme()

  const [tab,     setTab]     = useState('login')   // 'login' | 'register'
  const [email,   setEmail]   = useState('')
  const [uname,   setUname]   = useState('')
  const [pw,      setPw]      = useState('')
  const [pw2,     setPw2]     = useState('')
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  const strength = calcStrength(pw)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !pw) { setError('Please fill in all fields'); return }
    setLoading(true)
    try {
      await login(email, pw)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: 'var(--bg-base)',
      fontFamily: 'var(--font-body)',
    }}>
      {/* ── Left branding panel ── */}
      <div style={{
        flex: 1, display: 'none', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #050911 0%, #0b1220 60%, #0f1929 100%)',
        borderRight: '1px solid var(--border)',
        minWidth: 380,
      }}
        className="login-panel-left"
      >
        <PulseBackground />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'var(--accent-cyan)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 32px rgba(0,212,245,0.4)',
            }}>
              <Zap size={28} color="#050911" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32,
                            color: '#ffffff', letterSpacing: '-1px' }}>PulseNet</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                SpeedTest Tracker
              </div>
            </div>
          </div>

          {/* Stats preview */}
          {[
            { icon: Activity, label: 'Real-time monitoring', color: '#00d4f5' },
            { icon: Wifi,     label: 'Auto-scheduled tests', color: '#ff7b2e' },
            { icon: Zap,      label: 'Instant alerts',       color: '#00e5a0' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 20px', marginBottom: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10, backdropFilter: 'blur(4px)',
            }}>
              <Icon size={18} color={color} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600,
                             fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', position: 'relative', minWidth: 320,
      }}>
        {/* Theme toggle top-right */}
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <button onClick={toggle} style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 16,
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Mobile logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--accent-cyan)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-cyan)',
          }}>
            <Zap size={22} color="var(--bg-base)" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800,
                          fontSize: 22, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              PulseNet
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              SpeedTest Tracker
            </div>
          </div>
        </div>

        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 400,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '32px',
          boxShadow: 'var(--shadow-card)',
        }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex', background: 'var(--bg-elevated)',
            borderRadius: 8, padding: 4, marginBottom: 28,
          }}>
            {['login', 'register'].map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 6, border: 'none',
                  background: tab === t ? 'var(--bg-card)' : 'transparent',
                  color: tab === t ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', boxShadow: tab === t ? 'var(--shadow-card)' : 'none',
                  transition: 'all 0.15s ease', textTransform: 'capitalize',
                }}>
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: 18,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-sm)', color: '#ef4444',
              fontFamily: 'var(--font-mono)', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '10px 14px', marginBottom: 18,
              background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)',
              borderRadius: 'var(--radius-sm)', color: 'var(--accent-green)',
              fontFamily: 'var(--font-mono)', fontSize: 13,
            }}>
              {success}
            </div>
          )}

          {tab === 'login' ? (
            /* ── Login form ── */
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <Field label="Email or username" value={email} onChange={setEmail} placeholder="admin@example.com" />
              <Field
                label="Password" type={showPw ? 'text' : 'password'}
                value={pw} onChange={setPw} placeholder="••••••••"
                right={
                  <span onClick={() => setShowPw(v => !v)} style={{ color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                }
              />
              <button type="submit" disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, marginTop: 4 }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          ) : (
            /* ── Register info panel ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                padding: '16px', background: 'var(--accent-cyan-dim)',
                border: '1px solid rgba(0,212,245,0.2)', borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
                              color: 'var(--accent-cyan)', marginBottom: 8, fontSize: 14 }}>
                  Account registration
                </div>
                New accounts are created by an admin in the <strong>Settings → Users</strong> tab.
                Contact your administrator to get access, or log in with the admin credentials
                configured in the <code>.env</code> file.
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Default admin: <span style={{ color: 'var(--text-primary)' }}>admin@example.com</span>
              </div>
              <button onClick={() => setTab('login')} className="btn btn-secondary"
                style={{ justifyContent: 'center', padding: '10px' }}>
                Back to Sign In
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: 24, fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: 'var(--text-muted)', textAlign: 'center' }}>
          v1.0.0
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .login-panel-left { display: flex !important; }
        }
      `}</style>
    </div>
  )
}