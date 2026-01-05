import React, {useState} from 'react'
import { Link, useNavigate } from 'react-router-dom'
// language is English only now

export default function Header(){
  const navigate = useNavigate()
  const auth = !!localStorage.getItem('de_user')
  const [open, setOpen] = useState(false)

  function handleSignOut(){
    localStorage.removeItem('de_user')
    navigate('/')
  }

  const user = localStorage.getItem('de_user') ? JSON.parse(localStorage.getItem('de_user')) : null

  return (
    <header className="container header">
      <div className="brand">
        <Link to="/">
          <div className="logo">EE</div>
        </Link>
        <div className="title">Earneasy</div>
      </div>

      <div className="nav-actions">
        {/* Removed Recharge & Withdraw buttons as requested */}
      </div>
    </header>
  )
}
