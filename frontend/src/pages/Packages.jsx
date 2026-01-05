import React, {useEffect, useState} from 'react'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function Packages(){
  const [packages,setPackages]=useState([])
  const [user,setUser]=useState(null)

  useEffect(()=>{
    async function load(){
      try{
        const r = await api.getPackages()
        if(r.packages) setPackages(r.packages)
        const token = localStorage.getItem('de_token')
        if(token){ api.setToken(token); const me = await api.me(); if(me.user) setUser(me.user) }
      }catch(e){
        console.error('Failed to load packages', e)
      }
    }
    load()
  },[])

  const navigate = useNavigate()
  function handleBuy(pkgId){
    if(!user){ return alert('Please sign in') }
    // attempt to buy via API — if insufficient funds, backend will tell us how much is required
    (async ()=>{
      try{
        const resp = await api.buyPackage(pkgId)
        if(resp && resp.error === 'insufficient_funds' || resp && resp.required){
          // redirect to deposit with package preselected
          return navigate(`/deposit?package=${encodeURIComponent(pkgId)}`)
        }
        if(resp && resp.ok){
          // update local user wallet and show success
          const newWallet = resp.wallet !== undefined ? resp.wallet : (user.wallet - (resp.package ? resp.package.price : 0))
          const updated = { ...user, wallet: newWallet }
          setUser(updated)
          localStorage.setItem('de_user', JSON.stringify({ ...JSON.parse(localStorage.getItem('de_user')||'{}'), wallet: newWallet }))
          alert('Package purchased and activated!')
          return
        }
        // fallback: redirect to deposit
        navigate(`/deposit?package=${encodeURIComponent(pkgId)}`)
      }catch(e){
        console.error('Buy failed', e)
        navigate(`/deposit?package=${encodeURIComponent(pkgId)}`)
      }
    })()
  }

  return (
    <div>
      <h2>Investment Packages</h2>
      <div className="grid">
        {packages.map(p=> (
          <div key={p.id} className="card" style={{position:'relative'}}>
            {p.locked && <div style={{position:'absolute',right:8,top:8,background:'#eee',padding:'4px 8px',borderRadius:6,fontSize:12,fontWeight:700}}>LOCKED</div>}
            <h3>{p.name}</h3>
            <p className="muted small">Price: Rs {p.price} • Cycle: {p.duration} days</p>
            <p className="small muted">Daily: Rs {p.dailyClaim || '—'}</p>
            <button disabled={p.locked} className="btn" onClick={()=>handleBuy(p.id)} style={{marginTop:10}}>{p.locked ? 'Locked' : `Invest Rs ${p.price}`}</button>
          </div>
        ))}
      </div>
    </div>
  )
}
