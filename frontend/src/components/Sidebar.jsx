import { NavLink, useNavigate } from 'react-router-dom'
import { Activity, BarChart2, Clock, Zap, ChevronLeft, ChevronRight, Settings, LogOut, Sun, Moon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const NAV = [
  { to: '/', icon: Activity, label: 'Dashboard', end: true },
  { to: '/history', icon: BarChart2, label: 'History' },
  { to: '/schedule', icon: Clock, label: 'Schedule' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar({ isRunning, collapsed, onToggle }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { theme, toggle: toggleTheme, isDark } = useTheme()
  const w = collapsed ? 64 : 220

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside style={{
      width: w, flexShrink: 0,
      background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '20px 0',
      position: 'relative', zIndex: 10,
      transition: 'width 0.25s ease', overflow: 'hidden',
    }}>

      {/* ── Logo + collapse toggle ── */}
      <div style={{
        padding: collapsed ? '0 14px 24px' : '0 16px 24px',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8, minWidth: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'var(--accent-cyan)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-cyan)', flexShrink: 0,
          }}>
            <Zap size={18} color="var(--bg-base)" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17,
                            color: 'var(--text-primary)', letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
                PulseNet
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                SpeedTest Tracker
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={onToggle} title="Collapse sidebar" style={collapseBtn}>
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Collapsed expand button */}
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, marginTop: -8 }}>
          <button onClick={onToggle} title="Expand sidebar" style={{ ...collapseBtn, color: 'var(--accent-cyan)' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── Status indicator ── */}
      {!collapsed ? (
        <div style={{
          margin: '0 10px 18px', padding: '9px 12px',
          background: isRunning ? 'rgba(0,212,245,0.06)' : 'var(--bg-elevated)',
          border: `1px solid ${isRunning ? 'rgba(0,212,245,0.25)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.3s ease',
        }}>
          <span className={`status-dot ${isRunning ? 'running' : 'idle'}`} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11,
                         color: isRunning ? 'var(--accent-cyan)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {isRunning ? 'Test running…' : 'Ready'}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <span className={`status-dot ${isRunning ? 'running' : 'idle'}`} title={isRunning ? 'Test running…' : 'Ready'} />
        </div>
      )}

      {/* ── Nav links ── */}
      <nav style={{ flex: 1, padding: '0 10px' }}>
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '9px 12px',
              borderRadius: 'var(--radius-sm)', marginBottom: 4,
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13,
              textDecoration: 'none',
              color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-cyan-dim)' : 'transparent',
              border: `1px solid ${isActive ? 'rgba(0,212,245,0.2)' : 'transparent'}`,
              transition: 'all 0.15s ease', whiteSpace: 'nowrap', overflow: 'hidden',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
                {!collapsed && label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer: theme toggle + logout ── */}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: 'auto', padding: collapsed ? '16px 10px 12px' : '16px 12px 12px' }}>

        {/* Theme toggle row */}
        {!collapsed ? (
          <button onClick={toggleTheme} style={{
            width: '100%', padding: '8px 12px', marginBottom: 8,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.color = 'var(--accent-cyan)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isDark ? <Moon size={14} /> : <Sun size={14} />}
              {isDark ? 'Dark mode' : 'Light mode'}
            </span>
            {/* Mini toggle pill */}
            <div style={{
              width: 32, height: 18, borderRadius: 9,
              background: isDark ? 'var(--bg-base)' : 'var(--accent-cyan)',
              border: '1px solid var(--border)', position: 'relative', transition: 'all 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 2,
                left: isDark ? 2 : 14,
                width: 12, height: 12, borderRadius: '50%',
                background: isDark ? 'var(--text-muted)' : 'var(--bg-base)',
                transition: 'left 0.2s',
              }} />
            </div>
          </button>
        ) : (
          <button onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: '100%', padding: '8px 0', marginBottom: 8,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-cyan)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}

        {/* Logout */}
        {!collapsed ? (
          <button onClick={handleLogout} style={logoutBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <LogOut size={15} /><span>Logout</span>
          </button>
        ) : (
          <button onClick={handleLogout} title="Logout" style={{ ...logoutBtnStyle, justifyContent: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <LogOut size={15} />
          </button>
        )}

        {!collapsed && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textAlign: 'center', marginTop: 10 }}>v2.0.0</div>
        )}
      </div>
    </aside>
  )
}

const collapseBtn = {
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 6, width: 26, height: 26,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, transition: 'all 0.15s',
}

const logoutBtnStyle = {
  width: '100%', padding: '8px 12px',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
  cursor: 'pointer', display: 'flex', alignItems: 'center',
  gap: 8, fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
}
