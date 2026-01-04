import React, {useEffect, useState} from 'react'
import api from '../services/api'

export default function Wallet(){
  const [user,setUser]=useState(null)
  const [txs,setTxs]=useState([])
  const [withdrawAmount,setWithdrawAmount]=useState('')
  const [withdrawAccount,setWithdrawAccount]=useState('')

  useEffect(()=>{
    async function load(){
      const token = localStorage.getItem('de_token')
      if(!token) return
      api.setToken(token)
      const meRes = await api.me()
      if(meRes.user) setUser(meRes.user)
      const txRes = await api.getTransactions()
      if(txRes.transactions) setTxs(txRes.transactions)
    }
    load()
  },[])

  async function requestWithdraw(){
    if(!user) return alert('Please sign in')
    const amount = parseFloat(withdrawAmount)
    if(!amount || amount < 10) return alert('Minimum withdrawal is $10')
    api.setToken(localStorage.getItem('de_token'))
    const r = await api.withdraw({ amount, method: 'bank', account: withdrawAccount })
    if(r.error) return alert(r.error)
    alert('Withdrawal requested — pending')
    const meRes = await api.me()
    if(meRes.user) setUser(meRes.user)
    const txRes = await api.getTransactions()
    if(txRes.transactions) setTxs(txRes.transactions)
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
            <p className="muted small">${user.wallet?.toFixed(2) || '0.00'}</p>
            <div style={{marginTop:8}}>
              <input placeholder="Amount" value={withdrawAmount} onChange={e=>setWithdrawAmount(e.target.value)} style={{padding:8,marginRight:8}} />
              <input placeholder="Account details" value={withdrawAccount} onChange={e=>setWithdrawAccount(e.target.value)} style={{padding:8}} />
            </div>
            <div style={{marginTop:8}}>
              <button className="btn" onClick={requestWithdraw}>Request withdraw</button>
            </div>
          </div>

          <div className="card">
            <h3>Transaction history</h3>
            {txs.length===0 ? <p className="muted small">No transactions yet</p> : (
              <ul className="small muted">
                {txs.map(t=> (
                  <li key={t.id}>{new Date(t.createdAt).toLocaleString()} — {t.type} — ${t.amount}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
