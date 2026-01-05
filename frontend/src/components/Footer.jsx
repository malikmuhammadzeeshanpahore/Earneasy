import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer(){
  return (
    <footer className="footer">
      <Link to="/dashboard" style={{textAlign:'center'}}><i className="ri-home-line" style={{fontSize:20}}></i><div style={{fontSize:12}}>Dashboard</div></Link>
      <Link to="/deposit" style={{textAlign:'center'}}><i className="ri-wallet-line" style={{fontSize:20}}></i><div style={{fontSize:12}}>Deposit</div></Link>
      <Link to="/wallet" style={{textAlign:'center'}}><i className="ri-coins-line" style={{fontSize:20}}></i><div style={{fontSize:12}}>Wallet</div></Link>
      <Link to="/profile" style={{textAlign:'center'}}><i className="ri-user-line" style={{fontSize:20}}></i><div style={{fontSize:12}}>Account</div></Link>
    </footer>
  )
}
