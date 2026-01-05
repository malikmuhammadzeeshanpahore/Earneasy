import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function Admin(){
  const adm = localStorage.getItem('de_user') ? JSON.parse(localStorage.getItem('de_user')) : null
  if(!adm || adm.role !== 'admin') return <div className="card">Admin only (sign in as admin@demo / admin)</div>

  const [deposits, setDeposits] = useState([])
  const [blocked, setBlocked] = useState([])
  const [whitelist, setWhitelist] = useState([])
  const [newIp, setNewIp] = useState('')
  const [newNote, setNewNote] = useState('')
  const [users, setUsers] = useState([])
  const [transactions, setTransactions] = useState([])
  const [withdraws, setWithdraws] = useState([])

  useEffect(()=>{
    async function load(){
      try{
        api.setToken(localStorage.getItem('de_token'))
        const r = await api.adminGetDeposits()
        if(r.deposits) setDeposits(r.deposits)
        const b = await api.adminGetBlocked()
        if(b.blocked) setBlocked(b.blocked)
  const w = await api.adminGetWhitelist()
  if(w.whitelist) setWhitelist(w.whitelist)
        const u = await api.adminGetUsers()
        if(u.users) setUsers(u.users)
        const t = await api.adminGetTransactions()
        if(t.transactions) setTransactions(t.transactions)
        const wds = await api.adminGetWithdraws()
        if(wds.withdraws) setWithdraws(wds.withdraws)
      }catch(e){
        console.error('Failed to load admin data', e)
      }
    }
    load()
  },[])

  async function approveWithdraw(id){
    try{
      await api.adminApproveWithdraw(id)
      const wds = await api.adminGetWithdraws()
      if(wds.withdraws) setWithdraws(wds.withdraws)
    }catch(e){ console.error('Approve withdraw failed', e) }
  }

  async function markSent(id){
    try{
      await api.adminMarkWithdrawSent(id)
      const wds = await api.adminGetWithdraws()
      if(wds.withdraws) setWithdraws(wds.withdraws)
    }catch(e){ console.error('Mark sent failed', e) }
  }

  async function confirmWithdraw(id){
    try{
      await api.adminConfirmWithdraw(id)
      const wds = await api.adminGetWithdraws()
      if(wds.withdraws) setWithdraws(wds.withdraws)
    }catch(e){ console.error('Confirm failed', e) }
  }

  async function approve(id){
    try{
      await api.adminApproveDeposit(id)
      const r = await api.adminGetDeposits()
      if(r.deposits) setDeposits(r.deposits)
    }catch(e){ console.error('Approve failed', e) }
  }

  async function reject(id){
    try{
      await api.adminRejectDeposit(id)
      const r = await api.adminGetDeposits()
      if(r.deposits) setDeposits(r.deposits)
    }catch(e){ console.error('Reject failed', e) }
  }

  async function unblock(ip){
    try{
      await api.adminUnblock(ip)
      const b = await api.adminGetBlocked()
      if(b.blocked) setBlocked(b.blocked)
    }catch(e){ console.error('Unblock failed', e) }
  }

  return (
    <div>
      <h2>Admin Panel (Demo)</h2>
      <div className="grid">
        <div className="card">
          <h3>Pending Deposits</h3>
          {deposits.length===0 ? <div className="small muted">No pending deposits</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {deposits.map(d=> (
                <div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div><strong>${d.amount}</strong> — {d.method}</div>
                    <div className="small muted">Txn: {d.transactionId} • By: {d.userId}</div>
                    {d.screenshot && <div style={{marginTop:8}}>
                      <a href={(import.meta.env.VITE_API_URL||'http://localhost:4000') + d.screenshot} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:8}}>
                        <img src={(import.meta.env.VITE_API_URL||'http://localhost:4000') + d.screenshot} alt="s" style={{maxWidth:140,borderRadius:8}}/>
                        <span className="small muted"><i className="ri-eye-line"></i> Open screenshot</span>
                      </a>
                    </div>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <button className="btn" onClick={()=>approve(d.id)}>Approve</button>
                    <button className="btn ghost" onClick={()=>reject(d.id)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Blocked IPs</h3>
          {blocked.length===0 ? <div className="small muted">No blocked IPs</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {blocked.map(b=> (
                <div key={b.ip} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div className="small muted">{b.ip} — {b.reason}</div>
                  <button className="btn ghost" onClick={()=>unblock(b.ip)}>Unblock</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Whitelisted IPs</h3>
          <div style={{marginBottom:8}}>
            <input placeholder="IP or CIDR" value={newIp} onChange={e=>setNewIp(e.target.value)} style={{width:200,marginRight:8}} />
            <input placeholder="note (optional)" value={newNote} onChange={e=>setNewNote(e.target.value)} style={{width:220,marginRight:8}} />
            <button className="btn" onClick={async ()=>{
              try{
                await api.adminAddWhitelist({ ip: newIp, note: newNote })
                setNewIp('')
                setNewNote('')
                const w = await api.adminGetWhitelist()
                if(w.whitelist) setWhitelist(w.whitelist)
              }catch(err){ console.error('Add whitelist failed', err) }
            }}>Add</button>
          </div>
          {whitelist.length===0 ? <div className="small muted">No whitelisted IPs</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {whitelist.map(w=> (
                <div key={w.ip} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div className="small muted">{w.ip} — {w.note}</div>
                  <button className="btn ghost" onClick={async ()=>{
                    try{
                      await api.adminRemoveWhitelist(w.ip)
                      const nw = await api.adminGetWhitelist()
                      if(nw.whitelist) setWhitelist(nw.whitelist)
                    }catch(err){ console.error('Remove whitelist failed', err) }
                  }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Users</h3>
          {users.length===0 ? <div className="small muted">No users</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {users.map(u=> (
                <div key={u.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div className="small muted">{u.email} — {u.name} — {u.role} — Active: {String(u.isActive)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>All transactions</h3>
          {transactions.length===0 ? <div className="small muted">No transactions</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {transactions.map(tx=> (
                <div key={tx.id} className="small muted">{tx.createdAt} — {tx.type} — Rs {tx.amount} {tx.meta && tx.meta.fee ? `(fee: Rs ${tx.meta.fee} net: Rs ${tx.meta.net})` : ''} — status: {tx.status} — user: {tx.userId}</div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3>Withdraw Requests</h3>
          {withdraws.length===0 ? <div className="small muted">No withdraw requests</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {withdraws.map(w=> (
                <div key={w.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div className="small muted">User: {w.userId} — Requested: Rs {w.amount} — status: {w.status}</div>
                    <div className="small muted">Account: {w.meta && w.meta.account ? w.meta.account : 'N/A'} — Fee: Rs {w.meta && w.meta.fee ? w.meta.fee : '—'} — Net: Rs {w.meta && w.meta.net ? w.meta.net : '—'}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {w.status === 'pending' && <button className="btn" onClick={()=>approveWithdraw(w.id)}>Approve</button>}
                    {w.status === 'approved' && <button className="btn" onClick={()=>markSent(w.id)}>Mark Sent</button>}
                    {w.status === 'sent' && <button className="btn" onClick={()=>confirmWithdraw(w.id)}>Confirm</button>}
                    {(w.status === 'pending' || w.status === 'approved' || w.status === 'sent') && <button className="btn ghost" onClick={()=>api.adminRejectWithdraw(w.id).then(async ()=>{ const wds = await api.adminGetWithdraws(); if(wds.withdraws) setWithdraws(wds.withdraws) }).catch(e=>console.error(e))}>Reject</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
