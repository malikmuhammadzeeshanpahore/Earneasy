import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Packages from './pages/Packages'
import Tasks from './pages/Tasks'
import Wallet from './pages/Wallet'
import Referrals from './pages/Referrals'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import SecretAdmin from './pages/SecretAdmin'
import Deposit from './pages/Deposit'
import NotFound from './pages/NotFound'
import Header from './components/Header'

export default function App(){
  return (
    <div>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/secret-admin/:code" element={<SecretAdmin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
