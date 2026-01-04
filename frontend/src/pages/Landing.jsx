import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing(){
  return (
    <div>
      <div className="card" style={{padding:24,marginBottom:16}}>
        <div className="spaced flex">
          <div>
            <h1>DailyEarn Pro</h1>
            <p className="muted small">Earn daily by completing simple tasks. Purchase investment packages to increase earnings and unlock more tasks.</p>
            <div style={{marginTop:12}}>
              <Link to="/auth" className="btn">Get Started</Link>
              <Link to="/packages" style={{marginLeft:12}} className="small muted">View Packages</Link>
            </div>
          </div>
          <div style={{minWidth:240}}>
            <div className="card">
              <h3 className="small">Daily Tasks</h3>
              <p className="muted small">Watch videos, complete surveys, quiz and more. Task limits depend on your package.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>How it works</h3>
          <ol className="small muted">
            <li>Sign up and buy a package.</li>
            <li>Complete daily tasks and earn credit.</li>
            <li>Withdraw to your preferred method after minimum threshold.</li>
          </ol>
        </div>

        <div className="card">
          <h3>Referral program</h3>
          <p className="small muted">Share your referral code and earn commissions when they purchase packages.</p>
        </div>

        <div className="card">
          <h3>Security</h3>
          <p className="small muted">We recommend using 2FA and strong passwords. This demo uses mock payment flows.</p>
        </div>
      </div>
    </div>
  )
}
