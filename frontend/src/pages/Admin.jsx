import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { useToast } from '../components/Toast'

export default function Admin(){
  const adm = localStorage.getItem('de_user') ? JSON.parse(localStorage.getItem('de_user')) : null
  if(!adm || adm.role !== 'admin') return <div className="card">Admin only (sign in as admin)</div>

  const [users, setUsers] = useState([])
  const [deposits, setDeposits] = useState([])
  const [events, setEvents] = useState([])
  const [visits, setVisits] = useState([])
  const toast = useToast()

  useEffect(()=>{
    async function load(){
      try{
        api.setToken(localStorage.getItem('de_token'))
        const u = await api.adminGetUsers(); if(u && u.users) setUsers(u.users)
        const d = await api.adminGetDeposits(); if(d && d.deposits) setDeposits(d.deposits)
        const ev = await api.adminGetEvents(100); if(ev && ev.events) setEvents(ev.events)
        const vs = await api.adminGetVisits(200); if(vs && vs.visits) setVisits(vs.visits)
      }catch(e){ console.error('Load admin data failed', e); toast.show('Failed to load admin data','error') }
    }
    load()
  },[])

  async function refresh(){
    try{ const ev = await api.adminGetEvents(100); if(ev && ev.events) setEvents(ev.events) }catch(e){ console.error(e); toast.show('Failed to refresh events','error') }
  }

  async function refreshVisits(){
    try{ const vs = await api.adminGetVisits(200); if(vs && vs.visits) setVisits(vs.visits) }catch(e){ console.error(e); toast.show('Failed to refresh visits','error') }
  }

  return (
    <div>
      <h2>Admin</h2>
      <div className="grid">
        <div className="card">
          <h3>Users</h3>
          {users.length===0 ? <div className="small muted">No users</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {users.map(u=> (
                <div key={u.id} className="small muted">{u.email} — {u.name} — Wallet: Rs {u.wallet}</div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Pending Deposits</h3>
          {deposits.length===0 ? <div className="small muted">No pending deposits</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {deposits.map(d=> (
                <div key={d.id} className="small muted">{d.createdAt} — Rs {d.amount} — By: {d.userId}</div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Recent Events</h3>
          <div style={{marginBottom:8}}>
            <button className="btn" onClick={refresh}>Refresh events</button>
          </div>
          {events.length===0 ? <div className="small muted">No events</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {events.map(ev=> (
                <div key={ev.id} className="small muted">{ev.createdAt} — {ev.type || 'pageview'} — IP: {ev.ip || '—'}{ev.geo ? ' — Loc: ' + (ev.geo.ll ? ev.geo.ll.join(',') : ((ev.geo.lat ? (String(ev.geo.lat).substring(0,10) + ',' + String(ev.geo.lon).substring(0,10)) : '—'))) : ''} — {ev.email || ev.userId || 'anonymous'}</div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Recent Visits</h3>
          <div style={{marginBottom:8}}>
            <button className="btn" onClick={refreshVisits}>Refresh visits</button>
          </div>
          {visits.length===0 ? <div className="small muted">No visits</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {visits.map(v=> (
                <div key={v.id} className="small muted">{v.createdAt} — {v.method} {v.path} — IP: {v.ip || '—'} — UA: {v.userAgent ? v.userAgent.substring(0,60) : '—'}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
