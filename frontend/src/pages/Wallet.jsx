import React, {useEffect, useState} from 'react'
import api from '../services/api'

export default function Wallet(){
  const [user,setUser]=useState(null)
  const [txs,setTxs]=useState([])
  const [withdrawAmount,setWithdrawAmount]=useState('')
  const [withdrawAccount,setWithdrawAccount]=useState('')
  const [canWithdrawToday,setCanWithdrawToday]=useState(true)

  useEffect(()=>{
    async function load(){
      try{
        const token = localStorage.getItem('de_token')
        if(!token) return
        api.setToken(token)
        const meRes = await api.me()
        if(meRes.user) setUser(meRes.user)
        const txRes = await api.getTransactions()
        if(txRes.transactions) setTxs(txRes.transactions)
        // determine if user already made a withdraw today
        if(txRes.transactions){
          const now = new Date()
          const hasToday = txRes.transactions.some(t=> t.type === 'withdraw' && (()=>{ const d=new Date(t.createdAt); return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth() && d.getDate()===now.getDate() })())
          setCanWithdrawToday(!hasToday)
        }
      }catch(e){
        console.error('Failed to load wallet data', e)
      }
    }
    load()
  },[])

  async function requestWithdraw(){
    if(!user) return alert('Please sign in')
    const amount = parseFloat(withdrawAmount)
    if(!amount || amount < 200) return alert('Minimum withdrawal is Rs 200')
    if(!canWithdrawToday) return alert('Only one withdrawal is allowed per day')
    // check local time window (client-side hint) - server will enforce as well
    const now = new Date(); const hour = now.getHours();
    if(!(hour >= 12 && hour < 24)) return alert('Withdrawals are allowed between 12:00 PM and 12:00 AM only')
    try{
      api.setToken(localStorage.getItem('de_token'))
      const r = await api.withdraw({ amount, method: 'bank', account: withdrawAccount })
      if(r.error) return alert(r.error)
      alert('Withdrawal requested — pending. Fee: Rs ' + (r.fee||0) + ', Net: Rs ' + (r.net||0))
      const meRes = await api.me()
      if(meRes.user) setUser(meRes.user)
      const txRes = await api.getTransactions()
      if(txRes.transactions) setTxs(txRes.transactions)
      // update canWithdrawToday
      setCanWithdrawToday(false)
    }catch(e){
      console.error('Withdraw request failed', e)
      alert('Server error')
    }
  }

  return (
    <div>
      <h2>Wallet</h2>
      {!user ? (
        <div className="card">Sign in to view wallet.</div>
      ) : (
        <div className="grid">
          <div className="card">
            <h3>Main balance</h3>
            <p className="muted small">Rs {user.wallet?.toFixed(2) || '0.00'}</p>
            <div style={{marginTop:8}}>
              <input placeholder="Amount" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} style={{padding:8, marginRight:8, width:'40%'}} />
              <input placeholder="Account details" value={withdrawAccount} onChange={e=>setWithdrawAccount(e.target.value)} style={{padding:8, width:'55%'}} />

              {withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && (() => {
                const a = parseFloat(withdrawAmount)
                const fee = Math.round((a * 0.20) * 100) / 100
                const net = Math.round((a - fee) * 100) / 100
                return (
                  <div>
                    <div style={{marginTop:8}} className="small muted">Fee (20%): Rs {fee} — Net: Rs {net}</div>
                    <div style={{marginTop:8}}>
                      <button className="btn" onClick={requestWithdraw} disabled={!canWithdrawToday}>Request withdraw</button>
                    </div>
                  </div>
                )
              })()}

              <div style={{marginTop:8}} className="small muted">{!canWithdrawToday ? 'You have already made a withdrawal today.' : 'Withdrawals allowed between 12:00 PM and 12:00 AM.'}</div>

              <div style={{marginTop:12}}>
                <strong>Withdrawal Instructions:</strong>
                <div className="small muted" style={{marginTop:6}}>
                  <ol>
                    <li>Minimum withdrawal amount is Rs200. Only one withdrawal can be made per day.</li>
                    <li>Withdrawal processing time is from 12:00 PM to 12:00 AM. Please complete your withdrawal within the specified time.</li>
                    <li>Withdrawal processing time is 1 to 24 hours, and may take up to 72 hours in special circumstances.</li>
                    <li>A 20% management fee will be charged for platform maintenance.</li>
                    <li>Equipment must be purchased to activate the withdrawal function.</li>
                  </ol>
                </div>
              </div>
            </div>

          </div>

          <div className="card">
            <h3>Transaction history</h3>
            {txs.length===0 ? <p className="muted small">No transactions yet</p> : (
              <ul className="small muted">
                {txs.map(t=> (
                  <li key={t.id} style={{color: t.type === 'deposit' ? '#007bff' : t.type === 'withdraw' ? 'green' : 'inherit'}}>
                    {new Date(t.createdAt).toLocaleString()} — {t.type} — {t.type === 'withdraw' ? '-' : '+'} Rs {t.amount}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
