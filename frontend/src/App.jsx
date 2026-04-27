import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Schedule from './pages/Schedule'
import Login from './pages/Login'
import Settings from './pages/Settings'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { api } from './api'

// Protected route wrapper
function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)'
    }}>Loading...</div>
  }
  
  return user ? children : <Navigate to="/login" />
}

// Main app content (protected)
function AppContent() {
  const [isRunning, setIsRunning] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    api.getStatus()
      .then((s) => setIsRunning(s.is_running))
      .catch(() => {})
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.25, zIndex: 0 }} />
      <Sidebar isRunning={isRunning} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
      <main style={{ flex: 1, overflow: 'auto', position: 'relative', zIndex: 1, transition: 'all 0.25s ease' }}>
        <Routes>
          <Route path="/" element={<Dashboard isRunning={isRunning} setIsRunning={setIsRunning} onRefresh={() => setRefreshKey((k) => k + 1)} />} />
          <Route path="/history" element={<History key={refreshKey} />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

// Main App with providers and routes
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={
              <PrivateRoute>
                <AppContent />
              </PrivateRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
