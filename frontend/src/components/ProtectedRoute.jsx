import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-base)',
        fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 14,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 12, color: 'var(--accent-cyan)', fontSize: 20 }}>⚡</div>
          Authenticating…
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  return children
}