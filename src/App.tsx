import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Credits from './pages/Credits'
import Community from './pages/Community'
import Account from './pages/Account'
import Plans from './pages/Plans'
import Library from './pages/Library'
import { storage } from './lib/storage'
import { TopNav } from './components/Nav'

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = storage.get('token')
  if (!token) return <Navigate to="/" replace />
  return children
}

function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/community" element={<Community />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/library" element={<Library />} />
        <Route path="/account" element={<Account />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/app/*" element={
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
