import React, { useEffect, useState } from 'react'

export default function JoinChannelModal(){
  const [open, setOpen] = useState(false)

  useEffect(()=>{
    try{
      const dismissed = localStorage.getItem('join_channel_dismissed')
      if(!dismissed) setOpen(true)
    }catch(e){ setOpen(true) }
  },[])

  function join(){
    // open channel and mark dismissed
    window.open('https://whatsapp.com/channel/0029VbCMWJc6BIEZ4v0Sp82r','_blank')
    localStorage.setItem('join_channel_dismissed','1')
    setOpen(false)
  }
  function dismiss(){ localStorage.setItem('join_channel_dismissed','1'); setOpen(false) }

  if(!open) return null
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Join our WhatsApp channel</h3>
        <p>Get announcements, support updates and exclusive offers. Tap Join Us to follow our channel.</p>
        <div className="modal-actions">
          <button className="btn" onClick={join}>Join Us</button>
          <button className="btn-ghost" onClick={dismiss}>Maybe later</button>
        </div>
      </div>
    </div>
  )
}
