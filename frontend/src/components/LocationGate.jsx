import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { useToast } from './Toast'

export default function LocationGate(){
  const [perm, setPerm] = useState(null)
  const [visible, setVisible] = useState(false)
  const toast = useToast()

  useEffect(()=>{
    let showedToast = false
    async function check(){
      try{
        if(!('geolocation' in navigator)){
          setPerm('unsupported')
          setVisible(true)
          if(!showedToast){ toast.show('Geolocation not supported in this browser. Enable in browser or use a supported browser.', 'error'); showedToast = true }
          return
        }
        if(navigator.permissions && navigator.permissions.query){
          const ps = await navigator.permissions.query({ name: 'geolocation' })
          setPerm(ps.state)
          setVisible(ps.state !== 'granted')
          ps.onchange = () => { setPerm(ps.state); setVisible(ps.state !== 'granted') }
          if(ps.state !== 'granted' && !showedToast){ toast.show('Please allow location to open the website', 'error'); showedToast = true }
          if(ps.state === 'granted') requestLocation(true)
        }else{
          // permissions API not available, show gate and try to request
          setPerm('prompt')
          setVisible(true)
          if(!showedToast){ toast.show('Please allow location to open the website', 'error'); showedToast = true }
        }
      }catch(e){ console.error('LocationGate check failed', e); setPerm('prompt'); setVisible(true); if(!showedToast){ toast.show('Please allow location to open the website', 'error'); showedToast = true } }
    }
    check()
  },[])

  function requestLocation(silent){
    if(!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition((pos)=>{
      try{
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }
        localStorage.setItem('de_location_allowed','1')
        setVisible(false)
        toast.show('Location allowed — thanks!', 'success')
        // post location event to backend for admin visibility
        try{ api.postEvent({ type: 'location', geo: coords, meta: { grantedAt: new Date().toISOString() } }) }catch(e){}
      }catch(e){ console.error('Failed to handle location success', e) }
    }, (err)=>{
      console.warn('Geolocation error', err)
      if(err && err.code === 1){ // PERMISSION_DENIED
        setPerm('denied')
        setVisible(true)
        toast.show('Location permission denied. Please enable location permissions in your browser settings and reload the page.', 'error')
      }else{
        toast.show('Could not obtain location. Please try again.', 'error')
      }
    }, { timeout: 10000 })
  }

  if(!visible) return null

  // Overlay UI
  return (
    <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', padding:24, maxWidth:480, borderRadius:8, boxShadow:'0 8px 24px rgba(0,0,0,0.3)' }}>
        <h3 style={{marginTop:0}}>Location required</h3>
        <p>Please allow location access to continue using this site. Until you allow it, the website will remain blocked.</p>
        {perm === 'denied' && <p style={{color:'#b33'}}>Permission is denied — open your browser settings to enable location and then reload this page.</p>}
        <div style={{display:'flex',gap:8, marginTop:12}}>
          <button className="btn" onClick={()=>requestLocation(false)}>Enable location</button>
          <button className="btn muted" onClick={()=>{ toast.show('Please allow location to open the website', 'warning') }}>Remind me</button>
        </div>
      </div>
    </div>
  )
}
