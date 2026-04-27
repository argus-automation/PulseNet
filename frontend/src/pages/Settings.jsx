import { useState, useEffect, useRef } from 'react'
import { User, Shield, Bell, Database, Users, Save, Upload, Download,
         Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw, Plus, Trash2, Send } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../contexts/AuthContext'

/* ── Tiny toast ────────────────────────────────────────────────────────── */
function Toast({ msg, type = 'success', onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      padding: '12px 18px', borderRadius: 'var(--radius-sm)',
      background: type === 'success' ? 'rgba(0,229,160,0.15)' : 'rgba(239,68,68,0.15)',
      border: `1px solid ${type === 'success' ? 'rgba(0,229,160,0.4)' : 'rgba(239,68,68,0.4)'}`,
      color: type === 'success' ? 'var(--accent-green)' : '#ef4444',
      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14,
      display: 'flex', alignItems: 'center', gap: 8,
      animation: 'fade-in 0.2s ease', boxShadow: 'var(--shadow-card)',
    }}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  )
}

/* ── Section wrapper ───────────────────────────────────────────────────── */
function Section({ title, children }) {
  return (
    <div className="card" style={{ padding: '22px 24px', marginBottom: 16 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                   color: 'var(--text-primary)', marginBottom: 18,
                   paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

/* ── Toggle row ────────────────────────────────────────────────────────── */
function ToggleRow({ label, sub, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600,
                      fontSize: 14, color: 'var(--text-primary)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{
        width: 44, height: 24, borderRadius: 12, flexShrink: 0,
        background: value ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
        border: `1px solid ${value ? 'var(--accent-cyan)' : 'var(--border)'}`,
        position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: value ? 'var(--shadow-glow-cyan)' : 'none',
      }}>
        <div style={{
          position: 'absolute', top: 3,
          left: value ? 22 : 3, width: 16, height: 16,
          borderRadius: '50%', transition: 'left 0.2s',
          background: value ? 'var(--bg-base)' : 'var(--text-muted)',
        }} />
      </div>
    </div>
  )
}

/* ── Field ─────────────────────────────────────────────────────────────── */
function Inp({ label, value, onChange, type = 'text', placeholder, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600,
                      color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      <input type={type} value={value ?? ''} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '9px 12px', background: 'var(--bg-elevated)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none',
        }}
        onFocus={e  => (e.target.style.borderColor = 'var(--accent-cyan)')}
        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
      />
      {hint && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{hint}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Profile Tab
───────────────────────────────────────────────────────────────────────── */
function ProfileTab({ user, onRefresh, toast }) {
  const [username, setUsername] = useState(user?.username || '')
  const [email,    setEmail]    = useState(user?.email    || '')
  const [avatar,   setAvatar]   = useState(user?.avatar   || '')
  const [curPw,    setCurPw]    = useState('')
  const [newPw,    setNewPw]    = useState('')
  const [confPw,   setConfPw]   = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const fileRef = useRef()

  const pwChecks = [
    { label: '8+ chars',   ok: newPw.length >= 8 },
    { label: 'Uppercase',  ok: /[A-Z]/.test(newPw) },
    { label: 'Lowercase',  ok: /[a-z]/.test(newPw) },
    { label: 'Number',     ok: /[0-9]/.test(newPw) },
    { label: 'Special',    ok: /[^A-Za-z0-9]/.test(newPw) },
  ]
  const pwScore = pwChecks.filter(c => c.ok).length

  const handleAvatarFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setAvatar(ev.target.result)
    reader.readAsDataURL(file)
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api.updateMe({ username, email, avatar: avatar || null })
      await onRefresh()
      toast('Profile updated', 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const savePassword = async () => {
    if (newPw !== confPw) { toast('Passwords do not match', 'error'); return }
    if (pwScore < 4)      { toast('Password is too weak', 'error'); return }
    setSaving(true)
    try {
      await api.changePassword({ current_password: curPw, new_password: newPw })
      setCurPw(''); setNewPw(''); setConfPw('')
      toast('Password changed', 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <Section title="Avatar & Identity">
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 22 }}>
          <div onClick={() => fileRef.current.click()}
            style={{
              width: 76, height: 76, borderRadius: '50%', cursor: 'pointer',
              background: avatar ? 'transparent' : 'var(--accent-cyan-dim)',
              border: `2px solid ${avatar ? 'var(--accent-cyan)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative', flexShrink: 0,
              transition: 'border-color 0.2s',
            }}
          >
            {avatar
              ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <User size={30} color="var(--accent-cyan)" />}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = 1)}
              onMouseLeave={e => (e.currentTarget.style.opacity = 0)}
            >
              <Upload size={18} color="#fff" />
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15,
                          color: 'var(--text-primary)' }}>{user?.username}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
              {user?.email}
            </div>
            <span className={`tag ${user?.role === 'admin' ? 'tag-orange' : 'tag-cyan'}`}
              style={{ marginTop: 6, display: 'inline-flex' }}>
              {user?.role}
            </span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarFile} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Inp label="Username" value={username} onChange={setUsername} placeholder="johndoe" />
          <Inp label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
        </div>
        <button className="btn btn-primary" onClick={saveProfile} disabled={saving}
          style={{ marginTop: 4 }}>
          <Save size={14} /> {saving ? 'Saving…' : 'Save profile'}
        </button>
      </Section>

      <Section title="Change Password">
        <Inp label="Current password" type={showPw ? 'text' : 'password'}
          value={curPw} onChange={setCurPw} placeholder="••••••••" />
        <Inp label="New password" type={showPw ? 'text' : 'password'}
          value={newPw} onChange={setNewPw} placeholder="••••••••" />

        {/* Strength bars */}
        {newPw && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{
                  flex: 1, height: 3, borderRadius: 2,
                  background: i <= pwScore
                    ? ['','#ef4444','#f97316','#eab308','#22c55e','#00d4f5'][pwScore]
                    : 'var(--bg-elevated)',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
              {pwChecks.map(c => (
                <span key={c.label} style={{
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                  color: c.ok ? 'var(--accent-green)' : 'var(--text-muted)',
                }}>
                  {c.ok ? '✓' : '○'} {c.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <Inp label="Confirm new password" type={showPw ? 'text' : 'password'}
          value={confPw} onChange={setConfPw} placeholder="••••••••" />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
          <button className="btn btn-primary" onClick={savePassword} disabled={saving || !curPw || !newPw || !confPw}>
            <Shield size={14} /> {saving ? 'Updating…' : 'Update password'}
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                          fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            <input type="checkbox" checked={showPw} onChange={e => setShowPw(e.target.checked)}
              style={{ accentColor: 'var(--accent-cyan)' }} />
            Show passwords
          </label>
        </div>
      </Section>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Backup & Restore Tab
───────────────────────────────────────────────────────────────────────── */
function BackupTab({ toast }) {
  const [restoring, setRestoring]   = useState(false)
  const [restoreResult, setResult]  = useState(null)
  const fileRef = useRef()

  const handleBackup = async () => {
    try {
      const res = await api.backup()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `pulsenet-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast('Backup downloaded', 'success')
    } catch (e) { toast(e.message, 'error') }
  }

  const handleRestore = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setRestoring(true); setResult(null)
    try {
      const data = await api.restore(file)
      setResult(data)
      toast(`Restored ${data.inserted} records`, 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setRestoring(false) }
    e.target.value = ''
  }

  return (
    <div>
      <Section title="Create Backup">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.6 }}>
          Downloads all speed test results as a JSON file. This file can be used to restore data
          on any PulseNet instance. Backups include timestamps, all speed metrics, server info, and ISP data.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {[['Format', 'JSON'], ['Includes', 'All results + metadata'], ['Passwords', 'Not included']].map(([k, v]) => (
            <div key={k} style={{
              padding: '8px 14px', background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{k}</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" onClick={handleBackup} style={{ marginTop: 4 }}>
          <Download size={15} /> Download backup
        </button>
      </Section>

      <Section title="Restore from Backup">
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
          Upload a previously exported <code>.json</code> backup file. Existing records with the same ID
          will be skipped — only new records will be imported.
        </p>
        <div
          onClick={() => fileRef.current.click()}
          style={{
            border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
            padding: '32px 24px', textAlign: 'center', cursor: 'pointer',
            transition: 'all 0.15s', marginBottom: 12,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.background = 'var(--accent-cyan-dim)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
        >
          <Upload size={28} color="var(--text-muted)" style={{ marginBottom: 10 }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 14 }}>
            {restoring ? 'Restoring…' : 'Click to upload backup file'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>pulsenet-backup-*.json</div>
        </div>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={handleRestore} />

        {restoreResult && (
          <div style={{
            padding: '12px 16px', background: 'var(--accent-green-dim)',
            border: '1px solid rgba(0,229,160,0.3)', borderRadius: 'var(--radius-sm)',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-green)' }}>
              ✓ Inserted {restoreResult.inserted} · Skipped {restoreResult.skipped}
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Alerts Tab
───────────────────────────────────────────────────────────────────────── */
function AlertsTab({ toast }) {
  const [cfg,     setCfg]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [testing, setTesting] = useState(null)

  useEffect(() => {
    api.getAlertConfig().then(c => { setCfg(c); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const set = (k, v) => setCfg(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const updated = await api.setAlertConfig(cfg)
      setCfg(updated)
      toast('Alert settings saved', 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const testChannel = async (channel) => {
    setTesting(channel)
    try {
      await api.testAlert(channel)
      toast(`Test notification sent via ${channel}`, 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setTesting(null) }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>Loading…</div>
  if (!cfg) return null

  return (
    <div>
      {/* ── Thresholds ── */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                     color: 'var(--text-primary)', marginBottom: 14,
                     paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
          Speed Thresholds
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <Inp label="Min download (Mbps)" type="number" value={cfg.min_download_mbps ?? ''}
            onChange={v => set('min_download_mbps', v ? parseFloat(v) : null)} placeholder="e.g. 10" />
          <Inp label="Min upload (Mbps)" type="number" value={cfg.min_upload_mbps ?? ''}
            onChange={v => set('min_upload_mbps', v ? parseFloat(v) : null)} placeholder="e.g. 5" />
          <Inp label="Max ping (ms)" type="number" value={cfg.max_ping_ms ?? ''}
            onChange={v => set('max_ping_ms', v ? parseFloat(v) : null)} placeholder="e.g. 100" />
          <Inp label="Alert cooldown (min)" type="number" value={cfg.cooldown_minutes}
            onChange={v => set('cooldown_minutes', parseInt(v) || 30)} hint="Min wait between alerts" />
        </div>
      </div>

      {/* ── Channels grid: 2 × 2 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>

        {/* Discord */}
        <ChannelCard title="Discord" icon="🎮"
          enabled={cfg.discord_enabled} onToggle={v => set('discord_enabled', v)}
          testing={testing === 'discord'} onTest={() => testChannel('discord')}
          accentColor="var(--accent-purple)">
          <Inp label="Webhook URL" value={cfg.discord_webhook_url}
            onChange={v => set('discord_webhook_url', v)}
            placeholder="https://discord.com/api/webhooks/…"
            hint="Server Settings → Integrations → Webhooks" />
        </ChannelCard>

        {/* Telegram */}
        <ChannelCard title="Telegram" icon="✈️"
          enabled={cfg.telegram_enabled} onToggle={v => set('telegram_enabled', v)}
          testing={testing === 'telegram'} onTest={() => testChannel('telegram')}
          accentColor="var(--accent-cyan)">
          <Inp label="Bot token" value={cfg.telegram_bot_token}
            onChange={v => set('telegram_bot_token', v)}
            placeholder="110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
            hint="Create with @BotFather on Telegram" />
          <Inp label="Chat ID" value={cfg.telegram_chat_id}
            onChange={v => set('telegram_chat_id', v)}
            placeholder="-1001234567890" hint="Get from @userinfobot" />
        </ChannelCard>

        {/* Email */}
        <ChannelCard title="Email (SMTP)" icon="📧"
          enabled={cfg.email_enabled} onToggle={v => set('email_enabled', v)}
          testing={testing === 'email'} onTest={() => testChannel('email')}
          accentColor="var(--accent-orange)">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Inp label="SMTP host" value={cfg.email_smtp_host}
              onChange={v => set('email_smtp_host', v)} placeholder="smtp.gmail.com" />
            <Inp label="Port" type="number" value={cfg.email_smtp_port}
              onChange={v => set('email_smtp_port', parseInt(v) || 587)} placeholder="587" />
            <Inp label="Username" value={cfg.email_smtp_user}
              onChange={v => set('email_smtp_user', v)} placeholder="you@gmail.com" />
            <Inp label="Password" type="password" value={cfg.email_smtp_pass}
              onChange={v => set('email_smtp_pass', v)} placeholder="App password" />
          </div>
          <Inp label="Send alerts to" value={cfg.email_to}
            onChange={v => set('email_to', v)} placeholder="alerts@example.com" />
        </ChannelCard>

        {/* Webhook */}
        <ChannelCard title="Generic Webhook" icon="🔗"
          enabled={cfg.webhook_enabled} onToggle={v => set('webhook_enabled', v)}
          testing={testing === 'webhook'} onTest={() => testChannel('webhook')}
          accentColor="var(--accent-green)">
          <Inp label="Webhook URL" value={cfg.webhook_url}
            onChange={v => set('webhook_url', v)} placeholder="https://your-server.com/hook" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 600,
                            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Method
            </label>
            <select value={cfg.webhook_method} onChange={e => set('webhook_method', e.target.value)}
              style={{ padding: '8px 10px', background: 'var(--bg-elevated)',
                       border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                       color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none' }}>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
            </select>
          </div>
        </ChannelCard>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        <Save size={14} /> {saving ? 'Saving…' : 'Save all alert settings'}
      </button>
    </div>
  )
}

/* Reusable channel card wrapper */
function ChannelCard({ title, icon, enabled, onToggle, testing, onTest, accentColor, children }) {
  return (
    <div className="card" style={{
      padding: '16px 18px',
      border: `1px solid ${enabled ? accentColor + '40' : 'var(--border)'}`,
      transition: 'border-color 0.2s',
    }}>
      {/* Header: title + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                         color: enabled ? accentColor : 'var(--text-primary)' }}>{title}</span>
        </div>
        <div onClick={() => onToggle(!enabled)} style={{
          width: 40, height: 22, borderRadius: 11, flexShrink: 0,
          background: enabled ? accentColor : 'var(--bg-elevated)',
          border: `1px solid ${enabled ? accentColor : 'var(--border)'}`,
          position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
        }}>
          <div style={{
            position: 'absolute', top: 3,
            left: enabled ? 20 : 3, width: 14, height: 14,
            borderRadius: '50%', transition: 'left 0.2s',
            background: enabled ? 'var(--bg-base)' : 'var(--text-muted)',
          }} />
        </div>
      </div>

      {/* Fields — always rendered but visually muted when disabled */}
      <div style={{ opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'all' : 'none',
                    transition: 'opacity 0.2s' }}>
        {children}
        <button className="btn btn-secondary" disabled={testing || !enabled}
          onClick={onTest}
          style={{ fontSize: 12, padding: '6px 12px', marginTop: 4 }}>
          <Send size={12} /> {testing ? 'Sending…' : 'Send test'}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Users Tab
───────────────────────────────────────────────────────────────────────── */
function UsersTab({ toast }) {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)

  const load = () => api.listUsers().then(setUsers).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const changeRole = async (id, role) => {
    try { await api.changeRole(id, role); load(); toast('Role updated', 'success') }
    catch (e) { toast(e.message, 'error') }
  }

  const deactivate = async (id) => {
    if (!confirm('Deactivate this user?')) return
    try { await api.deactivateUser(id); load(); toast('User deactivated', 'success') }
    catch (e) { toast(e.message, 'error') }
  }

  const createUser = async () => {
    setCreating(true)
    try {
      await api.registerUser(newUser)
      setNewUser({ username: '', email: '', password: '' })
      setShowNew(false)
      load()
      toast('User created', 'success')
    } catch (e) { toast(e.message, 'error') }
    finally { setCreating(false) }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>Loading…</div>

  return (
    <div>
      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              All Users
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              {users.length} registered accounts
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowNew(v => !v)} style={{ fontSize: 13 }}>
            <Plus size={14} /> New user
          </button>
        </div>

        {showNew && (
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)',
                        background: 'var(--accent-cyan-dim)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
              <Inp label="Username" value={newUser.username}
                onChange={v => setNewUser(p => ({ ...p, username: v }))} placeholder="johndoe" />
              <Inp label="Email" value={newUser.email}
                onChange={v => setNewUser(p => ({ ...p, email: v }))} placeholder="john@example.com" />
              <Inp label="Password" type="password" value={newUser.password}
                onChange={v => setNewUser(p => ({ ...p, password: v }))} placeholder="••••••••" />
              <button className="btn btn-primary" onClick={createUser} disabled={creating}
                style={{ marginBottom: 14 }}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['User', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 18px', textAlign: 'left',
                                     fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600,
                                     color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px',
                                     borderBottom: '1px solid var(--border)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: u.avatar ? 'transparent' : 'var(--accent-cyan-dim)',
                      border: '1px solid var(--border)', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {u.avatar ? <img src={u.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <User size={14} color="var(--accent-cyan)" />}
                    </div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600,
                                   fontSize: 13, color: 'var(--text-primary)' }}>{u.username}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 18px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{u.email}</span>
                </td>
                <td style={{ padding: '12px 18px' }}>
                  <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                    style={{
                      padding: '4px 8px', background: 'var(--bg-elevated)',
                      border: `1px solid ${u.role === 'admin' ? 'rgba(255,123,46,0.3)' : 'var(--border)'}`,
                      borderRadius: 6, color: u.role === 'admin' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer', outline: 'none',
                    }}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td style={{ padding: '12px 18px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </td>
                <td style={{ padding: '12px 18px' }}>
                  <button onClick={() => deactivate(u.id)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                             color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5,
                             fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                    <Trash2 size={13} /> Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   Settings page (root)
───────────────────────────────────────────────────────────────────────── */
export default function Settings() {
  const { user, isAdmin, refreshUser } = useAuth()
  const [tab,   setTab]   = useState('profile')
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const TABS = [
    { id: 'profile',  icon: User,     label: 'Profile' },
    ...(isAdmin ? [
      { id: 'backup',   icon: Database, label: 'Backup & Restore' },
      { id: 'alerts',   icon: Bell,     label: 'Alerts' },
      { id: 'users',    icon: Users,    label: 'Users' },
    ] : []),
  ]

  return (
    <div style={{ padding: '28px', animation: 'fade-in 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800,
                     color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          {isAdmin ? 'Admin settings — full access' : 'Manage your profile and preferences'}
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24,
                    borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 16px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
            color: tab === id ? 'var(--accent-cyan)' : 'var(--text-muted)',
            borderBottom: `2px solid ${tab === id ? 'var(--accent-cyan)' : 'transparent'}`,
            marginBottom: -1, transition: 'all 0.15s',
          }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ width: "100%" }}>
        {tab === 'profile' && <ProfileTab user={user} onRefresh={refreshUser} toast={showToast} />}
        {tab === 'backup'  && <BackupTab toast={showToast} />}
        {tab === 'alerts'  && <AlertsTab toast={showToast} />}
        {tab === 'users'   && <UsersTab  toast={showToast} />}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}