import React, {useState, useEffect} from 'react'

export default function LanguageToggle(){
  const [lang,setLang] = useState(localStorage.getItem('de_lang') || 'en')

  useEffect(()=>{
    localStorage.setItem('de_lang', lang)
  },[lang])

  return (
    <div style={{display:'flex',gap:8,alignItems:'center'}}>
      <button className="small" onClick={()=>setLang('en')} style={{opacity: lang==='en'?1:0.6}}>EN</button>
      <button className="small" onClick={()=>setLang('ur')} style={{opacity: lang==='ur'?1:0.6}}>اردو</button>
    </div>
  )
}
