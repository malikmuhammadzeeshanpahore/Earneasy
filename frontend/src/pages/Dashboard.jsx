import React, {useEffect, useState} from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import copyToClipboard from '../utils/clipboard'
import { useToast } from '../components/Toast'
// Progress component removed from dashboard in new design

export default function Dashboard(){
  const toast = useToast()
  const [user,setUser] = useState(null)

  useEffect(()=>{
    async function load(){
      try{
        const token = localStorage.getItem('de_token')
        if(!token) return
        api.setToken(token)
        const r = await api.me()
        if(r.user) setUser(r.user)
      }catch(e){
        console.error('Failed to load user in dashboard', e)
      }
    }
    load()
  },[])

  const [pkgInfo, setPkgInfo] = useState(null)
  useEffect(()=>{
    async function loadPkg(){
      try{
        if(!user || !user.currentPackageId) return
        const pkgs = await api.getPackages()
        if(pkgs && pkgs.packages){
          const p = pkgs.packages.find(x=>x.id === user.currentPackageId)
          if(p) setPkgInfo(p)
        }
      }catch(e){ console.error('Could not load package info', e) }
    }
    loadPkg()
  },[user])

  if(!user) return (
    <div className="bg-white/90 rounded-xl p-4 shadow-lg border max-w-3xl mx-auto">
      <h3 className="text-lg font-semibold">Not signed in</h3>
      <p className="text-muted text-sm">Please sign in to view your dashboard.</p>
      <Link to="/auth" className="inline-block mt-3 px-3 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-2 text-white">Sign in</Link>
    </div>
  )
  const claim = async ()=>{
    try{
      api.setToken(localStorage.getItem('de_token'))
      const r = await api.claimDaily()
      if(r.ok){
        toast.show('Claimed Rs ' + r.amount, 'success')
        setUser({ ...user, wallet: r.wallet })
        localStorage.setItem('de_user', JSON.stringify({ ...JSON.parse(localStorage.getItem('de_user')||'{}'), wallet: r.wallet }))
      }else if(r.error){
        toast.show(r.error, 'error')
      }
    }catch(e){ console.error('Claim failed', e); toast.show('Claim failed', 'error') }
  }

  const inviteCode = user.inviteCode || user.id
  const inviteLink = `${window.location.origin}/auth?ref=${inviteCode}`

  return (
    <div className="container">
      <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <div className="text-lg font-bold">Hello, {user.name}</div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <div>Balance: <strong>Rs {Number(user.wallet||0).toFixed(2)}</strong></div>
            <div className="text-xs text-slate-500">PKR</div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-2 text-white text-sm">🔋 Recharge</button>
          <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-brand text-brand text-sm bg-white">💸 Withdraw</button>
        </div>
      </div>

      <div className="bg-white/90 rounded-xl p-4 shadow-lg border">
        <h4 className="font-semibold">Support & Channel</h4>
        <p className="text-sm text-slate-600">JazzCash number for deposits: <strong>03344379353</strong></p>
        <div className="mt-2">
          <a href="https://whatsapp.com/channel/0029VbCMWJc6BIEZ4v0Sp82r" target="_blank" rel="noreferrer" className="text-brand">Open WhatsApp Channel</a>
        </div>
        <div className="mt-2">
          <a href="https://wa.me/+923344379353" target="_blank" rel="noreferrer" className="text-brand">Customer support: +92 334 4379353</a>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3 className="font-semibold">Active Package</h3>
          {user.currentPackageId ? (
            <div>
              <strong>{user.currentPackageId}</strong>
              <p className="text-muted text-sm">Daily: Rs {user.currentPackageId ? '—' : '—'}</p>
              <p className="text-muted text-sm">Daily: Rs {pkgInfo ? Number(pkgInfo.dailyClaim||0).toFixed(2) : '—'}</p>
              <div className="mt-2">
                <button className="inline-block px-3 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-2 text-white" onClick={claim}>Claim Daily</button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">No active package. <Link to="/packages" className="text-brand font-medium">Buy one</Link></div>
          )}
        </div>

  <div className="card">
          <h3 className="font-semibold">Referral</h3>
          <p className="text-sm text-slate-500">Invite code: <strong>{inviteCode}</strong></p>
          <div className="flex gap-2 mt-2">
            <button className="inline-block px-3 py-2 rounded-lg bg-gradient-to-r from-brand to-brand-2 text-white" onClick={async ()=>{
              if(!inviteCode){ toast.show('Invite code not ready','info'); return }
              try{
                await copyToClipboard(inviteCode)
                toast.show('Copied code: ' + inviteCode, 'success')
              }catch(e){
                console.error('Copy failed', e)
                toast.show('Could not copy invite code', 'error')
              }
            }}>Copy Code</button>
            <button className="inline-block px-3 py-2 rounded-lg border border-slate-200 text-slate-800" onClick={async ()=>{
              if(!inviteCode){ toast.show('Invite code not ready','info'); return }
              const link = window.location.origin + '/auth?ref=' + inviteCode
              try{
                await copyToClipboard(link)
                toast.show('Copied link: ' + link, 'success')
              }catch(e){
                console.error('Copy failed', e)
                toast.show('Could not copy invite link', 'error')
              }
            }}>Copy Link</button>
          </div>
          <p className="text-sm text-slate-500 mt-2">Team rewards: L1 10% • L2 5% • L3 1%</p>
        </div>

        <div className="card">
          <h3 className="font-semibold">My Account</h3>
          <p className="small muted">Name: {user.name}</p>
          <p className="small muted">Email: {user.email}</p>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <Link to="/wallet" className="btn">Balance Details</Link>
            <Link to="/auth" className="btn-ghost">Change Password</Link>
          </div>
        </div>
      </div>
      
      <div style={{marginTop:12}} className="card">
        <h4 className="font-semibold">Support & Channel</h4>
        <p className="small muted">JazzCash number for deposits: <strong>03344379353</strong></p>
        <div style={{marginTop:8}}>
          <a href="https://whatsapp.com/channel/0029VbCMWJc6BIEZ4v0Sp82r" target="_blank" rel="noreferrer" className="small">Open WhatsApp Channel</a>
        </div>
        <div style={{marginTop:6}}>
          <a href="https://wa.me/+923344379353" target="_blank" rel="noreferrer" className="small">Customer support: +92 334 4379353</a>
        </div>
      </div>
    </div>
  )
}
