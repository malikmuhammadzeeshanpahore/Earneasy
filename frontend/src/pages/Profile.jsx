import React, {useEffect, useState} from 'react'
import api from '../services/api'

export default function Profile(){
  const [user,setUser]=useState(null)
  const [name,setName]=useState('')

  useEffect(()=>{
    async function load(){
      try{
        const token = localStorage.getItem('de_token')
        if(!token) return
        api.setToken(token)
        const r = await api.me()
        if(r.user){ setUser(r.user); setName(r.user.name || '') }
      }catch(e){
        console.error('Failed to load profile', e)
      }
    }
    load()
  },[])

  async function save(){
    if(!user) return
    try{
      const r = await fetch((import.meta.env.VITE_API_URL||'http://localhost:4000') + '/api/auth/me', { method:'PUT', headers:{ 'Content-Type':'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('de_token') }, body: JSON.stringify({ name }) })
      const data = await r.json()
      if(data.user){ setUser(data.user); localStorage.setItem('de_user', JSON.stringify(data.user)); alert('Profile updated') }
    }catch(e){
      console.error('Profile save failed', e)
      alert('Server error')
    }
  }

  if(!user) return <div className="card">Please sign in to edit profile.</div>

  return (
    <div className="card">
      <h2>My Account</h2>
      <div style={{margin:'8px 0'}}>
        <label className="small muted">Name</label>
        <input value={name} onChange={e=>setName(e.target.value)} style={{display:'block',width:'100%',padding:8,marginTop:6}} />
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
        <button className="btn" onClick={save}><i className="ri-save-line" style={{marginRight:8}}></i> Save</button>
        <button className="btn ghost" onClick={()=>window.location.href='/packages'}><i className="ri-stack-line" style={{marginRight:8}}></i> View Plans</button>
        <button className="btn" onClick={()=>window.location.href='/wallet'}><i className="ri-coins-line" style={{marginRight:8}}></i> Balance / History</button>
      </div>

      <div style={{marginTop:16}}>
        <h3 style={{margin:0}}>Withdrawal details</h3>
        <p className="small muted">Set your preferred withdrawal account here. This will be used when requesting withdrawals.</p>
        <div style={{marginTop:8}}>
          <input placeholder="Account number / details" style={{width:'100%',padding:8}} />
        </div>
      </div>

      <div style={{marginTop:16,display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn ghost" onClick={()=>{ navigator.clipboard && navigator.clipboard.writeText(user.inviteCode || user.id); alert('Invite code copied') }}><i className="ri-link-m"></i> Copy Invite Code</button>
        <button className="btn ghost" onClick={()=>{ navigator.clipboard && navigator.clipboard.writeText(window.location.origin + '/auth?ref=' + (user.inviteCode || user.id)); alert('Invite link copied') }}><i className="ri-share-line"></i> Copy Invite Link</button>
        <button className="btn ghost" onClick={()=>{ /* placeholder for download */ alert('App download link copied'); navigator.clipboard && navigator.clipboard.writeText('https://example.com/app-download') }}><i className="ri-download-line"></i> App Download</button>
        <button className="btn ghost" onClick={()=>{ localStorage.removeItem('de_user'); localStorage.removeItem('de_token'); window.location.href='/' }}><i className="ri-logout-box-line"></i> Logout</button>
      </div>
    </div>
  )
}
