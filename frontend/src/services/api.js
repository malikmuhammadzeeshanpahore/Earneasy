// Environment-aware API base selection
// Goals:
// - development: use http://localhost:4000/api
// - production: use relative path /api (so nginx or same-origin proxy works)
// - allow optional runtime override via window.__API_BASE__ for special cases
const runtimeBase = (typeof window !== 'undefined' && window.__API_BASE__) ? window.__API_BASE__ : null
const isDev = import.meta.env.MODE === 'development'

let configured = null
if (runtimeBase) {
  configured = runtimeBase
} else if (isDev) {
  configured = 'http://localhost:4000'
} else {
  // production: use relative API root so requests go to same origin -> /api
  configured = '' // empty signals use of relative path
}

const BASE = (configured && configured.endsWith('/api'))
  ? configured
  : (configured ? configured + '/api' : '/api')

if (isDev) console.info('[api] running in development mode, API base =', BASE)

let token = localStorage.getItem('de_token') || null
let adminSecret = null

function authHeaders(){
  return token ? { 'Authorization': 'Bearer ' + token } : {}
}

export async function signup({name,email,phone,password}){
  const res = await fetch(BASE + '/auth/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name,email,phone,password}) })
  return res.json()
}

export async function login({email,password}){
  const res = await fetch(BASE + '/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email,password}) })
  return res.json()
}

export async function me(){
  const res = await fetch(BASE + '/auth/me', { headers: { ...authHeaders() } })
  return res.json()
}

export async function getPackages(){
  const res = await fetch(BASE + '/packages')
  return res.json()
}

export async function buyPackage(packageId){
  const res = await fetch(BASE + '/packages/buy', { method:'POST', headers: { 'Content-Type':'application/json', ...authHeaders() }, body: JSON.stringify({ packageId }) })
  return res.json()
}

export async function getTasks(){
  const res = await fetch(BASE + '/tasks')
  return res.json()
}

export async function completeTask(taskId){
  const res = await fetch(BASE + '/tasks/complete', { method:'POST', headers: { 'Content-Type':'application/json', ...authHeaders() }, body: JSON.stringify({ taskId }) })
  return res.json()
}

export async function getBalance(){
  const res = await fetch(BASE + '/wallet/balance', { headers: { ...authHeaders() } })
  return res.json()
}

export async function getTransactions(){
  const res = await fetch(BASE + '/wallet/transactions', { headers: { ...authHeaders() } })
  return res.json()
}

export async function withdraw({amount,method,account}){
  const res = await fetch(BASE + '/wallet/withdraw', { method:'POST', headers: { 'Content-Type':'application/json', ...authHeaders() }, body: JSON.stringify({ amount }) })
  return res.json()
}

export async function updateMe(payload){
  const res = await fetch(BASE + '/auth/me', { method: 'PUT', headers: { 'Content-Type':'application/json', ...authHeaders() }, body: JSON.stringify(payload) })
  return res.json()
}

export async function changePassword({ oldPassword, newPassword }){
  const res = await fetch(BASE + '/auth/change-password', { method: 'POST', headers: { 'Content-Type':'application/json', ...authHeaders() }, body: JSON.stringify({ oldPassword, newPassword }) })
  return res.json()
}

export async function claimDaily(){
  const res = await fetch(BASE + '/wallet/claim', { method: 'POST', headers: { ...authHeaders() } })
  return res.json()
}

export async function claimRegistration(){
  const res = await fetch(BASE + '/wallet/claim-registration', { method: 'POST', headers: { ...authHeaders() } })
  return res.json()
}

export async function submitDeposit({accountHolder, transactionId, amount, method, screenshotFile}){
  const form = new FormData()
  form.append('accountHolder', accountHolder)
  form.append('transactionId', transactionId)
  form.append('amount', amount)
  form.append('method', method)
  if(arguments[0].packageId) form.append('packageId', arguments[0].packageId)
  if(screenshotFile) form.append('screenshot', screenshotFile)
  const res = await fetch(BASE + '/deposits', { method:'POST', headers: { ...authHeaders() }, body: form })
  return res.json()
}

// helper to build asset URLs (screenshots served by backend). In production this will be relative '/api/uploads/..' if configured accordingly.
export function assetUrl(path){
  if(!path) return ''
  // configured may be '' (for relative) or a host (http://host:4000)
  return (configured ? configured : '') + path
}

export async function getMyDeposits(){
  const res = await fetch(BASE + '/deposits', { headers: { ...authHeaders() } })
  return res.json()
}

// admin
export async function adminApproveDeposit(id){
  const res = await fetch(BASE + `/admin/deposits/${id}/approve`, { method:'POST', headers: { ...authHeaders() } })
  return res.json()
}

export async function adminRejectDeposit(id){
  const res = await fetch(BASE + `/admin/deposits/${id}/reject`, { method:'POST', headers: { ...authHeaders() } })
  return res.json()
}

export function setAdminSecret(s){ adminSecret = s }

function adminHeaders(){
  const h = { ...authHeaders() }
  if(adminSecret) h['x-admin-secret'] = adminSecret
  return h
}

// override admin APIs to include adminHeaders
export async function adminGetDeposits(){
  const res = await fetch(BASE + '/admin/deposits', { headers: { ...adminHeaders() } })
  return res.json()
}

export async function adminGetBlocked(){
  const res = await fetch(BASE + '/admin/blocked', { headers: { ...adminHeaders() } })
  return res.json()
}

export async function adminUnblock(ip){
  const res = await fetch(BASE + `/admin/blocked/${encodeURIComponent(ip)}/unblock`, { method:'POST', headers: { ...adminHeaders() } })
  return res.json()
}

export async function adminGetWhitelist(){
  const res = await fetch(BASE + '/admin/whitelist', { headers: { ...adminHeaders() } })
  return res.json()
}

export async function adminAddWhitelist({ip,note}){
  const res = await fetch(BASE + '/admin/whitelist', { method: 'POST', headers: { 'Content-Type':'application/json', ...adminHeaders() }, body: JSON.stringify({ ip, note }) })
  return res.json()
}

export async function adminRemoveWhitelist(ip){
  const res = await fetch(BASE + `/admin/whitelist/${encodeURIComponent(ip)}/remove`, { method: 'POST', headers: { ...adminHeaders() } })
  return res.json()
}

export async function adminGetUsers(){
  const res = await fetch(BASE + '/admin/users', { headers: { ...adminHeaders() } })
  return res.json()
}

export async function adminGetTransactions(){
  const res = await fetch(BASE + '/admin/transactions', { headers: { ...adminHeaders() } })
  return res.json()
}

export async function adminApproveWithdraw(id){
  const res = await fetch(BASE + `/admin/withdraws/${id}/approve`, { method:'POST', headers: { ...adminHeaders() } })
  return res.json()
}

export async function adminRejectWithdraw(id){
  const res = await fetch(BASE + `/admin/withdraws/${id}/reject`, { method:'POST', headers: { ...adminHeaders() } })
  return res.json()
}

export async function adminGetWithdraws(){
  const res = await fetch(BASE + '/admin/withdraws', { headers: { ...adminHeaders() } })
  return res.json()
}

export async function adminMarkWithdrawSent(id){
  const res = await fetch(BASE + `/admin/withdraws/${id}/sent`, { method:'POST', headers: { ...adminHeaders() } })
  return res.json()
}

export async function adminConfirmWithdraw(id){
  const res = await fetch(BASE + `/admin/withdraws/${id}/complete`, { method:'POST', headers: { ...adminHeaders() } })
  return res.json()
}

export function setToken(t){ token = t; if(t) localStorage.setItem('de_token', t); else localStorage.removeItem('de_token') }

export default {
  signup, login, me, getPackages, buyPackage, getTasks, completeTask,
  getBalance, getTransactions, withdraw, submitDeposit, getMyDeposits,
  claimDaily,
  updateMe,
  // admin helpers
  adminGetDeposits, adminApproveDeposit, adminRejectDeposit,
  adminGetBlocked, adminUnblock, adminGetUsers, adminGetTransactions,
  adminGetWhitelist, adminAddWhitelist, adminRemoveWhitelist,
  adminGetWithdraws, adminMarkWithdrawSent, adminConfirmWithdraw,
  adminApproveWithdraw, adminRejectWithdraw,
  // secrets & auth
  setAdminSecret, setToken
}
