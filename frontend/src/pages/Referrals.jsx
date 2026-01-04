import React from 'react'

export default function Referrals(){
  const user = localStorage.getItem('de_user') ? JSON.parse(localStorage.getItem('de_user')) : null
  const code = user ? user.id : 'Sign in to get code'

  return (
    <div className="card">
      <h2>Referrals</h2>
      <p className="muted small">Share your referral code or link to earn commissions when referred users purchase packages.</p>
      <div style={{marginTop:12}}>
        <strong>Code:</strong> <span style={{marginLeft:8}}>{code}</span>
      </div>
      <div style={{marginTop:12}}>
        <p className="small muted">Example commission: 10% of referred user's package purchase</p>
      </div>
    </div>
  )
}
