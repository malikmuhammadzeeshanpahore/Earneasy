import React, {useState} from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

function SignUp({onSigned}){
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [phone,setPhone]=useState('')
  const [referral,setReferral]=useState(new URLSearchParams(window.location.search).get('ref') || '')
  const [err,setErr]=useState(null)

  async function submit(e){
    e.preventDefault()
    try{
      // include referral code from URL if present, preferring manual input if provided
      const urlRef = new URLSearchParams(window.location.search).get('ref')
      const useRef = referral || urlRef || null
      const r = await api.signup({ name, email, phone, password, referral: useRef })
      if(r.error) return setErr(r.error)
      // save token, fetch full profile, and handle registration bonus
      api.setToken(r.token)
      localStorage.setItem('de_token', r.token)
      // fetch full profile from server (includes inviteCode, registrationBonusPending)
      const me = await api.me()
      if(me && me.user){
        // if registration bonus pending, try to claim immediately
        try{ if(me.user.registrationBonusPending){ await api.claimRegistration(); const refreshed = await api.me(); if(refreshed && refreshed.user) localStorage.setItem('de_user', JSON.stringify(refreshed.user)) }
        }catch(e){ /* ignore claim errors */ }
        // store final user
        const finalUser = await api.me()
        localStorage.setItem('de_user', JSON.stringify(finalUser.user))
        onSigned(finalUser.user)
      }else{
        localStorage.setItem('de_user', JSON.stringify(r.user))
        onSigned(r.user)
      }
    }catch(e){setErr('Server error')}
  }

  return (
    <form onSubmit={submit} className="card">
      <h3>Create account</h3>
      {err && <div style={{color:'red'}}>{err}</div>}
      <input placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} style={{display:'block',width:'100%',margin:'8px 0',padding:8}} />
      <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',margin:'8px 0',padding:8}} />
      <input placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} style={{display:'block',width:'100%',margin:'8px 0',padding:8}} />
      <input placeholder="Referral code (optional)" value={referral} onChange={e=>setReferral(e.target.value)} style={{display:'block',width:'100%',margin:'8px 0',padding:8}} />
      <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{display:'block',width:'100%',margin:'8px 0',padding:8}} />
      <button className="btn">Sign up</button>
    </form>
  )
}

function SignIn({onSigned}){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [err,setErr]=useState(null)

  async function submit(e){
    e.preventDefault()
    try{
      const r = await api.login({ email, password })
      if(r.error) return setErr(r.error)
      api.setToken(r.token)
      localStorage.setItem('de_token', r.token)
      // fetch full profile and store
      const me = await api.me()
      if(me && me.user){
        // if registration bonus pending, claim it
        try{ if(me.user.registrationBonusPending){ await api.claimRegistration(); }
        }catch(e){}
        const finalUser = await api.me()
        localStorage.setItem('de_user', JSON.stringify(finalUser.user))
        onSigned(finalUser.user)
      }else{
        localStorage.setItem('de_user', JSON.stringify(r.user))
        onSigned(r.user)
      }
    }catch(e){setErr('Server error')}
  }

  return (
    <form onSubmit={submit} className="card">
      <h3>Sign in</h3>
      {err && <div style={{color:'red'}}>{err}</div>}
      <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{display:'block',width:'100%',margin:'8px 0',padding:8}} />
      <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{display:'block',width:'100%',margin:'8px 0',padding:8}} />
      <button className="btn">Sign in</button>
    </form>
  )
}

export default function Auth(){
  const navigate = useNavigate()
  const [tab,setTab]=useState('signin')

  function onSigned(){
    navigate('/dashboard')
  }

  return (
    <div className="grid">
      <div className="card">
        <h2>Account</h2>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <button className="small" onClick={()=>setTab('signin')}>Sign in</button>
          <button className="small" onClick={()=>setTab('signup')}>Sign up</button>
        </div>
        {tab==='signin' ? <SignIn onSigned={onSigned} /> : <SignUp onSigned={onSigned} />}
      </div>

      <div className="card">
        <h3 className="small">Why sign up?</h3>
        <ul className="small muted">
          <li>Buy packages to unlock daily tasks.</li>
          <li>Track earnings and withdraw funds.</li>
          <li>Referral rewards and bonuses.</li>
        </ul>
      </div>
    </div>
  )
}
