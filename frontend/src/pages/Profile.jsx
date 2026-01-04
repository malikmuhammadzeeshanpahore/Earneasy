import React, {useEffect, useState} from 'react'
import api from '../services/api'

export default function Profile(){
  const [user,setUser]=useState(null)
  const [name,setName]=useState('')

  useEffect(()=>{
    async function load(){
      const token = localStorage.getItem('de_token')
      if(!token) return
      api.setToken(token)
      const r = await api.me()
      if(r.user){ setUser(r.user); setName(r.user.name || '') }
    }
    load()
  },[])

  async function save(){
    if(!user) return
    const r = await fetch((import.meta.env.VITE_API_URL||'http://localhost:4000') + '/api/auth/me', { method:'PUT', headers:{ 'Content-Type':'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('de_token') }, body: JSON.stringify({ name }) })
    const data = await r.json()
    if(data.user){ setUser(data.user); localStorage.setItem('de_user', JSON.stringify(data.user)); alert('Profile updated') }
  }

  if(!user) return <div className="card">Please sign in to edit profile.</div>

  return (
    <div className="card">
      <h2>Profile</h2>
      <div style={{margin:'8px 0'}}>
        <label className="small muted">Name</label>
        <input value={name} onChange={e=>setName(e.target.value)} style={{display:'block',width:'100%',padding:8,marginTop:6}} />
      </div>
      <div style={{marginTop:12}}>
        <button className="btn" onClick={save}>Save</button>
      </div>
    </div>
  )
}
