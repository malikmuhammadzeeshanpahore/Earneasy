import React, {useEffect, useState} from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Progress from '../components/Progress'

export default function Dashboard(){
  const [user,setUser] = useState(null)

  useEffect(()=>{
    async function load(){
      const token = localStorage.getItem('de_token')
      if(!token) return
      api.setToken(token)
      const r = await api.me()
      if(r.user) setUser(r.user)
    }
    load()
  },[])

  if(!user) return (
    <div className="card">
      <h3>Not signed in</h3>
      <p className="muted small">Please sign in to view your dashboard.</p>
      <Link to="/auth" className="btn">Sign in</Link>
    </div>
  )

  const pkg = null

  return (
    <div>
      <div className="spaced flex card" style={{marginBottom:16}}>
        <div>
          <h2>Welcome, {user.name}</h2>
          <p className="muted small">Balance: ${user.wallet?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="center">
          <div className="profile-pic" />
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Active Package</h3>
          {pkg ? (
            <div>
              <strong>{pkg.name}</strong>
              <p className="muted small">Daily tasks: {pkg.dailyTasks} • Daily rate: ${pkg.dailyRate}</p>
              <Progress value={(user.investment.completedDays / pkg.duration) * 100 || 0} />
            </div>
          ) : (
            <div className="small muted">No active package. <Link to="/packages">Buy one</Link></div>
          )}
        </div>

        <div className="card">
          <h3>Daily Tasks Progress</h3>
          {!user.isActive ? (
            <div>
              <p className="muted small">Your account is not active. Submit a deposit and wait for admin approval to start earning.</p>
              <Link to="/deposit" className="btn" style={{marginTop:8}}>Submit deposit</Link>
            </div>
          ) : (
            <>
              <p className="muted small">Complete your tasks to earn today.</p>
              <Link to="/tasks" className="btn" style={{marginTop:8}}>Go to tasks</Link>
            </>
          )}
        </div>

        <div className="card">
          <h3>Referral</h3>
          <p className="small muted">Your referral code: <strong>{user.id}</strong></p>
          <p className="small muted">You earn commission when friends purchase packages.</p>
        </div>
      </div>
    </div>
  )
}
