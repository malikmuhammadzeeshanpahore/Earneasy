import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { useToast } from '../components/Toast'

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
  const toast = useToast()
  const [packages, setPackages] = useState([])
  const [activatePackageId, setActivatePackageId] = useState(null)
  const [activateCharge, setActivateCharge] = useState('none')
  const [activationEmail, setActivationEmail] = useState('')
  const [linkReferredByEmail, setLinkReferredByEmail] = useState('')
  const [linkRefereeEmail, setLinkRefereeEmail] = useState('')
  const [linkReferredByEmailGlobal, setLinkReferredByEmailGlobal] = useState('')
  const [linkRefereeEmailGlobal, setLinkRefereeEmailGlobal] = useState('')

  async function activateByEmail(){
    if(!activationEmail) { toast.show('Enter user email', 'info'); return }
    try{
      // find user by email
      const u = users.find(x => x.email === activationEmail)
      if(!u){ toast.show('User not found', 'error'); return }
      const r = await api.adminActivatePackage(u.id, { packageId: activatePackageId, charge: activateCharge })
      if(r && r.ok){ toast.show('Package activated for ' + u.email, 'success'); const uu = await api.adminGetUsers(); if(uu.users) setUsers(uu.users) }
      else if(r && r.error) toast.show(r.error, 'error')
      else toast.show('Activation failed', 'error')
    }catch(e){ console.error('Activate by email failed', e); toast.show('Server error', 'error') }
  }

  async function linkReferralGlobal(){
    if(!linkReferredByEmailGlobal || !linkRefereeEmailGlobal){ toast.show('Enter both emails', 'info'); return }
    try{
      const r = await api.adminLinkReferral({ referredByEmail: linkReferredByEmailGlobal, refereeEmail: linkRefereeEmailGlobal, force: true })
      if(r && r.ok){ toast.show('Referral linked', 'success'); const uu = await api.adminGetUsers(); if(uu.users) setUsers(uu.users) }
      else if(r && r.error) toast.show(r.error, 'error')
      else toast.show('Failed to link', 'error')
    }catch(e){ console.error('Link referral global failed', e); toast.show('Server error', 'error') }
  }

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
        const p = await api.getPackages()
        if(p.packages) setPackages(p.packages)
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

  async function adminActivatePackageForUser(userId){
    if(!activatePackageId){ toast.show('Select a package first', 'info'); return }
    try{
      const r = await api.adminActivatePackage(userId, { packageId: activatePackageId, charge: activateCharge })
      if(r && r.ok){
        toast.show('Package activated', 'success')
        const d = await api.adminGetUser(userId); if(d && d.user) setUserDetails(d)
        const u = await api.adminGetUsers(); if(u.users) setUsers(u.users)
      }else if(r && r.error) toast.show(r.error, 'error')
      else toast.show('Activation failed', 'error')
    }catch(e){ console.error('Admin activate failed', e); toast.show('Server error', 'error') }
  }

  const [manualGrantAssignToReferrer, setManualGrantAssignToReferrer] = useState(true)

  async function grantManualBonusForUser(email){
    if(!email) { toast.show('Missing user email', 'info'); return }
    if(!manualBonusAmount || isNaN(Number(manualBonusAmount)) || Number(manualBonusAmount) <= 0){ toast.show('Enter valid amount', 'info'); return }
    try{
      const r = await api.adminManualReferralBonus({ email, amount: manualBonusAmount, note: manualBonusNote, idempotencyKey: 'manual:'+email+':'+Date.now(), assignToReferrer: manualGrantAssignToReferrer })
      if(r && r.ok){
        if(r.skipped){ toast.show('Already applied, skipped', 'info') }
        else toast.show(`Granted Rs ${r.bonus} to ${r.recipient && r.recipient.email ? r.recipient.email : 'recipient'}`, 'success')
        // refresh user data
        const u = await api.adminGetUser(userDetails.user.id); if(u && u.user) setUserDetails(u)
      }else if(r && r.error) toast.show(r.error, 'error')
      else toast.show('Grant failed', 'error')
    }catch(e){ console.error('Grant manual bonus failed', e); toast.show('Server error', 'error') }
  }

  const [manualGlobalAssignToReferrer, setManualGlobalAssignToReferrer] = useState(true)

  async function grantManualBonusGlobal(){
    if(!manualTargetEmail){ toast.show('Enter target user email', 'info'); return }
    if(!manualTargetAmount || isNaN(Number(manualTargetAmount)) || Number(manualTargetAmount) <= 0){ toast.show('Enter valid amount', 'info'); return }
    try{
      const r = await api.adminManualReferralBonus({ email: manualTargetEmail, amount: manualTargetAmount, note: null, idempotencyKey: 'manual:'+manualTargetEmail+':'+Date.now(), assignToReferrer: manualGlobalAssignToReferrer })
      if(r && r.ok){
        if(r.skipped){ toast.show('Already applied, skipped', 'info'); setGlobalGrantMessage('Already applied') }
        else { toast.show(`Granted Rs ${r.bonus} to ${r.recipient && r.recipient.email ? r.recipient.email : 'recipient'}`, 'success'); setGlobalGrantMessage(`Granted Rs ${r.bonus} to ${r.recipient && r.recipient.email ? r.recipient.email : 'recipient'}`) }
        const uu = await api.adminGetUsers(); if(uu && uu.users) setUsers(uu.users)
      }else if(r && r.error){ toast.show(r.error, 'error'); setGlobalGrantMessage(r.error) }
      else { toast.show('Grant failed', 'error'); setGlobalGrantMessage('Grant failed') }
    }catch(e){ console.error('Global grant failed', e); toast.show('Server error', 'error'); setGlobalGrantMessage('Server error') }
  }

  const [manualTargetEmail, setManualTargetEmail] = useState('')
  const [manualTargetAmount, setManualTargetAmount] = useState('')
  const [globalGrantMessage, setGlobalGrantMessage] = useState('')
  const [selectedPackageForEdit, setSelectedPackageForEdit] = useState(null)
  const [packageDailyClaim, setPackageDailyClaim] = useState('')
  const [geoInfo, setGeoInfo] = useState(null)

  async function adminLinkReferralAction(){
    if(!linkReferredByEmail || !linkRefereeEmail){ toast.show('Enter both emails', 'info'); return }
    try{
      const r = await api.adminLinkReferral({ referredByEmail: linkReferredByEmail, refereeEmail: linkRefereeEmail, force: true })
      if(r && r.ok){
        toast.show('Referral linked', 'success')
        // refresh users and user details if relevant
        const u = await api.adminGetUsers(); if(u.users) setUsers(u.users)
        if(userDetails && userDetails.user && userDetails.user.email === linkRefereeEmail){ const d = await api.adminGetUser(userDetails.user.id); if(d && d.user) setUserDetails(d) }
      }else if(r && r.error) toast.show(r.error, 'error')
      else toast.show('Failed to link', 'error')
    }catch(e){ console.error('Link referral failed', e); toast.show('Server error', 'error') }
  }

  const [manualBonusAmount, setManualBonusAmount] = useState('')
  const [manualBonusNote, setManualBonusNote] = useState('')

  async function runReconcile(userId, dryRun){
    try{
      const r = await api.adminReconcileReferralBonuses({ dryRun: !!dryRun, userId })
      if(r && r.ok){
        toast.show(`Reconcile: created ${r.created} skipped ${r.skipped}`, 'success')
        if(!dryRun){ const d = await api.adminGetUser(userId); if(d && d.user) setUserDetails(d); const u = await api.adminGetUsers(); if(u.users) setUsers(u.users) }
      }else if(r && r.error) toast.show(r.error, 'error')
      else toast.show('Reconcile failed', 'error')
    }catch(e){ console.error('Run reconcile failed', e); toast.show('Server error', 'error') }
  }

  async function runGlobalReconcile(dryRun){
    try{
      const r = await api.adminReconcileReferralBonuses({ dryRun: !!dryRun })
      if(r && r.ok){
        toast.show(`Global reconcile: created ${r.created} skipped ${r.skipped}`, 'success')
      } else if(r && r.error){
        toast.show(r.error,'error')
      } else {
        toast.show('Reconcile failed','error')
      }
    }catch(e){ console.error('Global reconcile failed', e); toast.show('Server error', 'error') }
  }

  return (
    <div>
      <h2>Admin Panel</h2>
      <div style={{marginBottom:12,display:'flex',gap:12,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <input placeholder="user email" value={activationEmail} onChange={e=>setActivationEmail(e.target.value)} style={{width:200}} />
          <select value={activatePackageId || ''} onChange={e=>setActivatePackageId(e.target.value)} style={{minWidth:220}}>
            <option value="">-- select package --</option>
            {packages.map(p=> <option key={p.id} value={p.id}>{p.name} — Rs {p.price}</option>)}
          </select>
          <select value={activateCharge} onChange={e=>setActivateCharge(e.target.value)}>
            <option value="none">Grant (no charge)</option>
            <option value="wallet">Charge user's wallet</option>
            <option value="external">Mark as external payment</option>
          </select>
          <button className="btn" onClick={activateByEmail}>Activate by email</button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <input placeholder="referredBy email" value={linkReferredByEmailGlobal} onChange={e=>setLinkReferredByEmailGlobal(e.target.value)} style={{width:220}} />
          <input placeholder="referee email" value={linkRefereeEmailGlobal} onChange={e=>setLinkRefereeEmailGlobal(e.target.value)} style={{width:220}} />
          <button className="btn ghost" onClick={linkReferralGlobal}>Link referral</button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <button className="btn ghost" onClick={()=>runGlobalReconcile(true)} style={{marginRight:8}}>Global reconcile (dry-run)</button>
          <button className="btn" onClick={()=>{ if(!confirm('Run global reconcile? This will credit wallets when applied. Are you sure?')) return; runGlobalReconcile(false) }}>Global reconcile (apply)</button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <input placeholder="target user email" value={manualTargetEmail} onChange={e=>setManualTargetEmail(e.target.value)} style={{width:220}} />
          <input placeholder="investment amount" value={manualTargetAmount} onChange={e=>setManualTargetAmount(e.target.value)} style={{width:180}} />
          <label style={{display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={manualGlobalAssignToReferrer} onChange={e=>setManualGlobalAssignToReferrer(e.target.checked)} /> Assign to referrer (if present)</label>
          <button className="btn" onClick={async ()=>{ try{ await grantManualBonusGlobal() }catch(e){ console.error(e) } }}>Grant 10% bonus (global)</button>
          <div className="small muted">{globalGrantMessage}</div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <select value={selectedPackageForEdit || ''} onChange={e=>setSelectedPackageForEdit(e.target.value)} style={{minWidth:220}}>
            <option value="">-- select package to edit --</option>
            {packages.map(p=> <option key={p.id} value={p.id}>{p.name} — Rs {p.price}</option>)}
          </select>
          <input placeholder="daily claim" value={packageDailyClaim || ''} onChange={e=>setPackageDailyClaim(e.target.value)} style={{width:140}} />
          <button className="btn" onClick={async ()=>{ if(!selectedPackageForEdit){ toast.show('Choose package', 'info'); return } try{ const r = await api.adminUpdatePackage(selectedPackageForEdit, { dailyClaim: Number(packageDailyClaim) }); if(r && r.ok){ toast.show('Package updated', 'success'); const pList = await api.getPackages(); if(pList && pList.packages) setPackages(pList.packages) } }catch(e){ console.error(e); toast.show('Update failed','error') } }}>Update package</button>
        </div>
      </div>
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
                    <button className="btn" onClick={async ()=>{ try{ const d = await api.adminGetUser(u.id); if(d && d.user){ setUserDetails(d); setGeoInfo(null); if(d.user && d.user.signupIp){ try{ const res = await fetch('https://ipapi.co/'+encodeURIComponent(d.user.signupIp) + '/json/'); const data = await res.json(); setGeoInfo(data) }catch(err){ /* ignore geo errors */ } } } }catch(e){ console.error('Get user details failed', e) } }}>Details</button>
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
                <h5>User Packages</h5>
                {userDetails.userPackages && userDetails.userPackages.length>0 ? (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {userDetails.userPackages.map(up=> (
                      <div key={up.id} className="small muted">{up.activatedAt} — {up.Package ? up.Package.name : up.packageId} — Expires: {up.expiresAt || '—'} — ID: {up.id}</div>
                    ))}
                  </div>
                ) : <div className="small muted">No packages</div>}
              </div>

              <div style={{marginTop:8}}>
                <h5>Referrals</h5>
                {userDetails.referrals && userDetails.referrals.length>0 ? (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {userDetails.referrals.map(r=> (
                      <div key={r.id} className="small muted">{r.email} — {r.name || '—'} — Joined: {r.createdAt}</div>
                    ))}
                  </div>
                ) : <div className="small muted">No referrals</div>}
              </div>

              <div style={{marginTop:8}}>
                <h5>IP & Geolocation</h5>
                <div className="small muted">Email: {userDetails.user.email} — Phone: {userDetails.user.phone || '—'}</div>
                <div className="small muted">Signup IP: {userDetails.user.signupIp || '—'}</div>
                <div style={{marginTop:6,display:'flex',alignItems:'center',gap:8}}>
                  <button className="btn ghost" onClick={async ()=>{
                    const ip = userDetails.user.signupIp
                    if(!ip){ toast.show('No signup IP available', 'info'); return }
                    try{
                      const res = await fetch('https://ipapi.co/'+encodeURIComponent(ip) + '/json/')
                      const data = await res.json()
                      setGeoInfo(data)
                    }catch(e){ console.error('Geo lookup failed', e); toast.show('Geo lookup failed', 'error') }
                  }}>Lookup geo for signup IP</button>
                  <div className="small muted">{geoInfo ? `${geoInfo.country_name || ''}${geoInfo.region ? ' / '+geoInfo.region : ''}${geoInfo.city ? ' / '+geoInfo.city : ''}` : '(no geo data yet)'}</div>
                </div>

                <h5 style={{marginTop:10}}>Recent Login Events</h5>
                {userDetails.loginEvents && userDetails.loginEvents.length>0 ? (
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {userDetails.loginEvents.map(ev=> (
                      <div key={ev.id} className="small muted">{ev.createdAt} — IP: {ev.ip || '—'}{ev.geo && ev.geo.country ? ` — ${ev.geo.country}${ev.geo.region ? ' / '+ev.geo.region : ''}${ev.geo.city ? ' / '+ev.geo.city : ''}` : ''}{ev.userAgent ? ` — UA: ${ev.userAgent.substring(0,80)}${ev.userAgent.length>80 ? '...' : ''}` : ''}</div>
                    ))}
                  </div>
                ) : <div className="small muted">No login events (showing signup IP above)</div>}
              </div>
              <div style={{marginTop:8}}>
                <h5>Admin Actions</h5>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <div>
                    <div className="small muted">Activate package for this user</div>
                    <select value={activatePackageId || ''} onChange={e=>setActivatePackageId(e.target.value)} style={{minWidth:220,marginRight:8}}>
                      <option value="">-- select package --</option>
                      {packages.map(p=> <option key={p.id} value={p.id}>{p.name} — Rs {p.price}</option>)}
                    </select>
                    <select value={activateCharge} onChange={e=>setActivateCharge(e.target.value)} style={{marginRight:8}}>
                      <option value="none">Grant (no charge)</option>
                      <option value="wallet">Charge user's wallet</option>
                      <option value="external">Mark as external payment</option>
                    </select>
                    <button className="btn" onClick={async ()=>{ try{ await adminActivatePackageForUser(userDetails.user.id) }catch(e){ console.error(e) } }}>Activate</button>
                    <button className="btn ghost" onClick={async ()=>{ if(!confirm('Reset claims for this user?')) return; try{ const r = await api.adminResetPackageClaims(userDetails.user.id); if(r && r.ok) { toast.show('Reset done: ' + r.updated, 'success'); const d = await api.adminGetUser(userDetails.user.id); if(d && d.user) setUserDetails(d) } }catch(e){ console.error(e); toast.show('Reset failed','error') } }}>Reset claims</button>
                  </div>
                  <div>
                    <div className="small muted">Link referral (referredBy → referee)</div>
                    <input placeholder="referredBy email" value={linkReferredByEmail} onChange={e=>setLinkReferredByEmail(e.target.value)} style={{width:220,marginRight:8}} />
                    <input placeholder="referee email" value={linkRefereeEmail} onChange={e=>setLinkRefereeEmail(e.target.value)} style={{width:220,marginRight:8}} />
                    <button className="btn ghost" onClick={async ()=>{ try{ await adminLinkReferralAction() }catch(e){ console.error(e) } }}>Link</button>
                  </div>

                  <div>
                    <div className="small muted">Grant manual referral bonus (admin: 10%)</div>
                    <input placeholder="target user email" value={manualTargetEmail || (userDetails && userDetails.user && userDetails.user.email) || ''} onChange={e=>setManualTargetEmail(e.target.value)} style={{width:220,marginRight:8}} />
                    <input placeholder="investment amount" value={manualTargetAmount || ''} onChange={e=>setManualTargetAmount(e.target.value)} style={{width:180,marginRight:8}} />
                    <label style={{display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={manualGlobalAssignToReferrer} onChange={e=>setManualGlobalAssignToReferrer(e.target.checked)} /> Assign to referrer (if present)</label>
                    <button className="btn" onClick={async ()=>{ try{ await grantManualBonusGlobal() }catch(e){ console.error(e) } }}>Grant 10% bonus</button>
                  </div>
                  <div>
                    <div className="small muted">Reconcile referral bonuses for this user</div>
                    <button className="btn ghost" onClick={async ()=>{ try{ await runReconcile(userDetails.user.id, true) }catch(e){ console.error(e) } }}>Dry run</button>
                    <button className="btn" onClick={async ()=>{ if(!confirm('Apply reconcile for this user?')) return; try{ await runReconcile(userDetails.user.id, false) }catch(e){ console.error(e) } }}>Apply</button>
                  </div>

                  <div>
                    <div className="small muted">Manual referral bonus (10% of provided investment)</div>
                    <input placeholder="investment amount (PKR)" value={manualBonusAmount || ''} onChange={e=>setManualBonusAmount(e.target.value)} style={{width:180,marginRight:8}} />
                    <input placeholder="note (optional)" value={manualBonusNote || ''} onChange={e=>setManualBonusNote(e.target.value)} style={{width:220,marginRight:8}} />
                    <label style={{display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={manualGrantAssignToReferrer} onChange={e=>setManualGrantAssignToReferrer(e.target.checked)} /> Assign to referrer (if present) — otherwise grant to this user</label>
                    <button className="btn" onClick={async ()=>{ try{ await grantManualBonusForUser(userDetails.user.email) }catch(e){ console.error(e) } }}>Grant 10% bonus</button>
                  </div>
                </div>
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
