import React, {useState} from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LanguageToggle from './LanguageToggle'

export default function Header(){
  const navigate = useNavigate()
  const auth = !!localStorage.getItem('de_user')
  const [open, setOpen] = useState(false)

  function handleSignOut(){
    localStorage.removeItem('de_user')
    navigate('/')
  }

  const user = localStorage.getItem('de_user') ? JSON.parse(localStorage.getItem('de_user')) : null

  return (
    <header className="container header">
      <div className="brand">
        <Link to="/" style={{display:'flex',alignItems:'center',gap:12}}>
          <div className="logo">DE</div>
          <div className="title">DailyEarn Pro</div>
        </Link>
      </div>

      <nav className="nav">
        <Link to="/packages">Packages</Link>
        <Link to="/tasks">Tasks</Link>
        <Link to="/wallet">Wallet</Link>
  <Link to="/referrals">Referrals</Link>
  <Link to="/deposit" className="">Deposit</Link>
        {auth ? (
          <>
            <Link to="/dashboard" className="">Dashboard</Link>
            <button className="btn" onClick={handleSignOut}>Sign out</button>
          </>
        ) : (
          <Link to="/auth" className="cta btn">Sign in</Link>
        )}
      </nav>

      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <LanguageToggle />
        <button className="hamburger" aria-label="menu" onClick={()=>setOpen(true)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6H21" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M3 12H21" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M3 18H21" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {open && (
        <div className="mobile-menu" onClick={()=>setOpen(false)}>
          <div className="panel" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{fontWeight:700}}>Menu</div>
              <button onClick={()=>setOpen(false)} style={{border:'none',background:'transparent'}}>Close</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <Link to="/" onClick={()=>setOpen(false)}>Home</Link>
              <Link to="/packages" onClick={()=>setOpen(false)}>Packages</Link>
              <Link to="/tasks" onClick={()=>setOpen(false)}>Tasks</Link>
              <Link to="/wallet" onClick={()=>setOpen(false)}>Wallet</Link>
              <Link to="/referrals" onClick={()=>setOpen(false)}>Referrals</Link>
              {auth ? (
                <>
                  <Link to="/dashboard" onClick={()=>setOpen(false)}>Dashboard</Link>
                  <button className="btn" onClick={()=>{ handleSignOut(); setOpen(false) }}>Sign out</button>
                </>
              ) : (
                <Link to="/auth" onClick={()=>setOpen(false)} className="btn">Sign in</Link>
              )}
            </div>
            <div style={{marginTop:14}} className="text-muted small">Signed in as: {user ? user.email || user.name : 'Guest'}</div>
          </div>
        </div>
      )}
    </header>
  )
}
