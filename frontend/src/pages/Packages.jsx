import React, {useEffect, useState} from 'react'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function Packages(){
  const [packages,setPackages]=useState([])
  const [user,setUser]=useState(null)

  useEffect(()=>{
    async function load(){
      const r = await api.getPackages()
      if(r.packages) setPackages(r.packages)
      const token = localStorage.getItem('de_token')
      if(token){ api.setToken(token); const me = await api.me(); if(me.user) setUser(me.user) }
    }
    load()
  },[])

  const navigate = useNavigate()
  function handleBuy(pkgId){
    if(!user){ return alert('Please sign in') }
    // redirect to deposit page with package preselected
    navigate(`/deposit?package=${encodeURIComponent(pkgId)}`)
  }

  return (
    <div>
      <h2>Investment Packages</h2>
      <div className="grid">
        {packages.map(p=> (
          <div key={p.id} className="card">
            <h3>{p.name}</h3>
            <p className="muted small">Price: ${p.price} • Duration: {p.duration} days</p>
            <p className="small muted">Daily tasks: {p.dailyTasks} • Daily earning: ${p.dailyRate}</p>
            <button className="btn" onClick={()=>handleBuy(p.id)} style={{marginTop:10}}>Buy ${p.price}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
