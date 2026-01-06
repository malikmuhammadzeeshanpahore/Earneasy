import React, {useEffect, useState} from 'react'
import api from '../services/api'
import { useToast } from '../components/Toast'
import copyToClipboard from '../utils/clipboard'

export default function Profile(){
  const toast = useToast()
  const [user,setUser]=useState(null)
  const [name,setName]=useState('')
  const [payoutName,setPayoutName]=useState('')
  const [payoutMethod,setPayoutMethod]=useState('jazzcash')
  const [payoutAccount,setPayoutAccount]=useState('')

  useEffect(()=>{
    async function load(){
      try{
        const token = localStorage.getItem('de_token')
        if(!token) return
        api.setToken(token)
        const r = await api.me()
        if(r.user){ setUser(r.user); setName(r.user.name || ''); setPayoutName(r.user.payoutName || ''); setPayoutMethod(r.user.payoutMethod || 'jazzcash'); setPayoutAccount(r.user.payoutAccount || '') }
      }catch(e){
        console.error('Failed to load profile', e)
      }
    }
    load()
  },[])

  async function save(){
    if(!user) return
    try{
      const payload = { name, payoutName, payoutMethod, payoutAccount }
      const data = await api.updateMe(payload)
      if(data.user){ setUser(data.user); localStorage.setItem('de_user', JSON.stringify(data.user)); toast.show('Profile updated', 'success') }
    }catch(e){
      console.error('Profile save failed', e)
      toast.show('Server error', 'error')
    }
  }

  const [oldPassword,setOldPassword] = useState('')
  const [newPassword,setNewPassword] = useState('')
  async function changePassword(){
    if(!oldPassword || !newPassword){ toast.show('Enter both current and new password', 'info'); return }
    try{
      const r = await api.changePassword({ oldPassword, newPassword })
      if(r && r.ok){ toast.show('Password changed', 'success'); setOldPassword(''); setNewPassword('') }
      else if(r && r.error) toast.show(r.error, 'error')
    }catch(e){ console.error('Change password failed', e); toast.show('Server error', 'error') }
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
          <label className="small muted">Account holder name</label>
          <input placeholder="Account holder name" value={payoutName} onChange={e=>setPayoutName(e.target.value)} style={{width:'100%',padding:8,marginTop:6}} />
          <label className="small muted" style={{marginTop:8}}>Account method</label>
          <select value={payoutMethod} onChange={e=>setPayoutMethod(e.target.value)} style={{width:'100%',padding:8,marginTop:6}}>
            <option value="jazzcash">JazzCash</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="other">Other</option>
          </select>
          <label className="small muted" style={{marginTop:8}}>Account number / details</label>
          <input placeholder="Account number / details" value={payoutAccount} onChange={e=>setPayoutAccount(e.target.value)} style={{width:'100%',padding:8,marginTop:6}} />
          <div style={{marginTop:8}}>
            <button className="btn" onClick={save}>Save withdrawal details</button>
          </div>
        </div>
      </div>

      <div style={{marginTop:16,display:'flex',gap:8,flexWrap:'wrap'}}>
        <button className="btn ghost" onClick={async ()=>{ const code = user.inviteCode || user.id; if(!code){ toast.show('Invite code not ready','info'); return } try{ await copyToClipboard(code); toast.show('Invite code copied: ' + code, 'success') }catch(e){ console.error('Copy failed', e); toast.show('Could not copy invite code', 'error') } }}><i className="ri-link-m"></i> Copy Invite Code</button>
        <button className="btn ghost" onClick={async ()=>{ const code = user.inviteCode || user.id; if(!code){ toast.show('Invite code not ready','info'); return } const link = window.location.origin + '/auth?ref=' + code; try{ await copyToClipboard(link); toast.show('Invite link copied: ' + link, 'success') }catch(e){ console.error('Copy failed', e); toast.show('Could not copy invite link', 'error') } }}><i className="ri-share-line"></i> Copy Invite Link</button>
        <a className="btn ghost" href="http://earneasy.fun/app/earneasy.apk" download><i className="ri-download-line"></i> App Download</a>
        <button className="btn ghost" onClick={()=>{ localStorage.removeItem('de_user'); localStorage.removeItem('de_token'); window.location.href='/' }}><i className="ri-logout-box-line"></i> Logout</button>
      </div>

      <div style={{marginTop:20}}>
        <h3 style={{margin:0}}>Change Password</h3>
        <p className="small muted">Change your account password.</p>
        <div style={{marginTop:8}}>
          <label className="small muted">Current password</label>
          <input type="password" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} style={{width:'100%',padding:8,marginTop:6}} />
          <label className="small muted" style={{marginTop:8}}>New password</label>
          <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} style={{width:'100%',padding:8,marginTop:6}} />
          <div style={{marginTop:8}}>
            <button className="btn" onClick={changePassword}>Change password</button>
          </div>
        </div>
      </div>
    </div>
  )
}
