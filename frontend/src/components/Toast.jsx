import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ToastContext = createContext(null)
let idCounter = 0

export function ToastProvider({ children }){
  const [toasts, setToasts] = useState([])

  const show = useCallback((message, type = 'info', timeout = 3500) => {
    const id = ++idCounter
    setToasts(t => [...t, { id, message, type }])
    setTimeout(()=>{
      setToasts(t => t.filter(x=>x.id !== id))
    }, timeout)
    return id
  }, [])

  const dismiss = useCallback((id) => setToasts(t => t.filter(x=>x.id !== id)), [])

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div style={{position:'fixed', right:12, top:12, zIndex:9999, display:'flex', flexDirection:'column', gap:8}}>
        {toasts.map(t=> (
          <div key={t.id} style={{minWidth:220, padding:'10px 14px', borderRadius:8, color:'#fff', boxShadow:'0 6px 20px rgba(2,6,23,0.08)', background: t.type === 'error' ? '#ef4444' : t.type === 'success' ? '#16a34a' : '#0ea5e9'}}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(){
  const ctx = useContext(ToastContext)
  if(!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
