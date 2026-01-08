import React, { useEffect } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Packages from './pages/Packages'
import Wallet from './pages/Wallet'
import Referrals from './pages/Referrals'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import SecretAdmin from './pages/SecretAdmin'
import Deposit from './pages/Deposit'
import NotFound from './pages/NotFound'
import Header from './components/Header'
import Footer from './components/Footer'
import JoinChannelModal from './components/JoinChannelModal'
import ErrorBoundary from './components/ErrorBoundary'
import LocationGate from './components/LocationGate'

import { ToastProvider } from './components/Toast'
import { startUserSync, stopUserSync } from './services/userSync'
import api from './services/api'
export default function App(){
  useEffect(()=>{ startUserSync(); return ()=> stopUserSync() }, [])

  // record an anonymous pageview on app mount so backend captures visitor IP even if not logged in
  useEffect(()=>{
    try{ api.postEvent({ type: 'pageview', meta: { path: window.location.pathname } }) }catch(e){}
  }, [])

  return (
    <ToastProvider>
      <div>
        <Header />
        <JoinChannelModal />
        <LocationGate />
        <main className="container">
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/secret-admin/:code" element={<SecretAdmin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </ToastProvider>
  )
}
