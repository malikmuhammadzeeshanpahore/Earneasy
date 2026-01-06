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
  const [userDetails, setUserDetails] = useState(null) // loaded per-user details (transactions, deposits)
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
      <h2>Admin Panel</h2>
      <div className="grid">
        <div className="card">
          <h3>Pending Deposits</h3>
          {deposits.length===0 ? <div className="small muted">No pending deposits</div> : (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {deposits.map(d=> {
                const user = d.User || users.find(u=>u.id===d.userId) || {}
                const time = d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'
                return (
                <div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div><strong>Rs {d.amount}</strong> — {d.method}</div>
                    <div className="small muted">Txn: {d.transactionId} • By: {user.email || d.userId} {user.name ? `(${user.name})` : ''}</div>
                    <div className="small muted">Account holder: {d.accountHolder || '—' } • Time: {time}</div>
                    {d.screenshot && <div style={{marginTop:8}}>
                      <a href={api.assetUrl(d.screenshot)} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:8}}>
                        <img src={api.assetUrl(d.screenshot)} alt="s" style={{maxWidth:140,borderRadius:8}}/>
                        <span className="small muted"><i className="ri-eye-line"></i> Open screenshot</span>
                      </a>
                    </div>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <button className="btn" onClick={()=>approve(d.id)}>Approve</button>
                    <button className="btn ghost" onClick={()=>reject(d.id)}>Reject</button>
                  </div>
                </div>
              )})}
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
                  <div style={{display:'flex',gap:8}}>
                    <button className="btn" onClick={async ()=>{ try{ const d = await api.adminGetUser(u.id); if(d && d.user){ setUserDetails(d) } }catch(e){ console.error('Get user details failed', e) } }}>Details</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {userDetails && userDetails.user && (
            <div style={{marginTop:12,borderTop:'1px solid #eee',paddingTop:12}}>
              <h4>User details</h4>
              <div className="small muted">ID: {userDetails.user.id} — Name: {userDetails.user.name} — Email: {userDetails.user.email} — Phone: {userDetails.user.phone || '—'}</div>
              <div className="small muted">Wallet: Rs {userDetails.user.wallet} — Role: {userDetails.user.role} — Active: {String(userDetails.user.isActive)}</div>
              <div className="small muted">Payout: {userDetails.user.payoutName || '—'} / {userDetails.user.payoutMethod || '—'} / {userDetails.user.payoutAccount || '—'}</div>
              <div style={{marginTop:8}}>
                <h5>Recent Transactions</h5>
                {userDetails.transactions && userDetails.transactions.length>0 ? (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {userDetails.transactions.map(tx=> (
                      <div key={tx.id} className="small muted">{tx.createdAt} — {tx.type} — Rs {tx.amount} {tx.meta && tx.meta.fee ? `(fee: Rs ${tx.meta.fee} net: Rs ${tx.meta.net})` : ''} — status: {tx.status}</div>
                    ))}
                  </div>
                ) : <div className="small muted">No transactions</div>}
              </div>
              <div style={{marginTop:8}}>
                <h5>Deposits</h5>
                {userDetails.deposits && userDetails.deposits.length>0 ? (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {userDetails.deposits.map(dep=> (
                      <div key={dep.id} className="small muted">{dep.createdAt} — Rs {dep.amount} — {dep.method} — Txn: {dep.transactionId} — Account holder: {dep.accountHolder || '—'} {dep.screenshot ? <a href={api.assetUrl(dep.screenshot)} target="_blank" rel="noreferrer"> View</a> : ''} — status: {dep.status}</div>
                    ))}
                  </div>
                ) : <div className="small muted">No deposits</div>}
              </div>
              <div style={{marginTop:8}}>
                <button className="btn ghost" onClick={()=>setUserDetails(null)}>Close</button>
              </div>
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
              {withdraws.map(w=> {
                const u = users.find(x=> x.id === w.userId) || {}
                const created = w.createdAt ? new Date(w.createdAt).toLocaleString() : '—'
                const payoutName = w.meta && w.meta.payoutName ? w.meta.payoutName : (w.meta && w.meta.payoutName === '' ? '' : 'N/A')
                const payoutMethod = w.meta && w.meta.payoutMethod ? w.meta.payoutMethod : 'N/A'
                const payoutAccount = w.meta && w.meta.payoutAccount ? w.meta.payoutAccount : 'N/A'
                const fee = w.meta && w.meta.fee ? w.meta.fee : '—'
                const net = w.meta && w.meta.net ? w.meta.net : '—'
                return (
                <div key={w.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div className="small muted">User: {u.email || w.userId} — {u.name ? u.name : ''} — Requested: Rs {w.amount} — status: {w.status}</div>
                    <div className="small muted">Time: {created}</div>
                    <div className="small muted">Account holder: {payoutName} — Method: {payoutMethod} — Account: {payoutAccount}</div>
                    <div className="small muted">Amount: Rs {w.amount} — Fee: Rs {fee} — Net: Rs {net}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {w.status === 'pending' && <button className="btn" onClick={()=>approveWithdraw(w.id)}>Approve</button>}
                    {w.status === 'approved' && <button className="btn" onClick={()=>markSent(w.id)}>Mark Sent</button>}
                    {w.status === 'sent' && <button className="btn" onClick={()=>confirmWithdraw(w.id)}>Confirm</button>}
                    {(w.status === 'pending' || w.status === 'approved' || w.status === 'sent') && <button className="btn ghost" onClick={()=>api.adminRejectWithdraw(w.id).then(async ()=>{ const wds = await api.adminGetWithdraws(); if(wds.withdraws) setWithdraws(wds.withdraws) }).catch(e=>console.error(e))}>Reject</button>}
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
