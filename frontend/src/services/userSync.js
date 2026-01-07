import api from './api'

let intervalId = null
let lastKnown = null

export function startUserSync(pollIntervalMs = 10000) {
  // ensure api token is set from localStorage
  const token = localStorage.getItem('de_token')
  if(token) api.setToken(token)
  // initial fetch
  fetchAndBroadcast()
  // set up interval
  if(intervalId) clearInterval(intervalId)
  intervalId = setInterval(fetchAndBroadcast, pollIntervalMs)
}

export function stopUserSync(){ if(intervalId) clearInterval(intervalId); intervalId = null }

async function fetchAndBroadcast(){
  try{
    const token = localStorage.getItem('de_token')
    if(!token) return
    api.setToken(token)
    const res = await api.me()
    if(!res || !res.user) return
    const user = res.user
    const prev = lastKnown || JSON.parse(localStorage.getItem('de_user') || 'null')
    // store updated user in localStorage for persistence
    localStorage.setItem('de_user', JSON.stringify(user))
    // broadcast if wallet or updatedAt changed (or first time)
    const walletChanged = !prev || (prev.wallet !== user.wallet)
    const updatedAtChanged = !prev || (prev.updatedAt !== user.updatedAt)
    if(walletChanged || updatedAtChanged){
      lastKnown = user
      window.dispatchEvent(new CustomEvent('userUpdate', { detail: user }))
    }
  }catch(e){ console.error('userSync fetch failed', e) }
}
