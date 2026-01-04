const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api'

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
  const res = await fetch(BASE + '/wallet/withdraw', { method:'POST', headers: { 'Content-Type':'application/json', ...authHeaders() }, body: JSON.stringify({ amount, method, account }) })
  return res.json()
}

export async function submitDeposit({accountHolder, transactionId, amount, method, screenshotFile}){
  const form = new FormData()
  form.append('accountHolder', accountHolder)
  form.append('transactionId', transactionId)
  form.append('amount', amount)
  form.append('method', method)
  if(screenshotFile) form.append('screenshot', screenshotFile)
  const res = await fetch(BASE + '/deposits', { method:'POST', headers: { ...authHeaders() }, body: form })
  return res.json()
}

export async function getMyDeposits(){
  const res = await fetch(BASE + '/deposits', { headers: { ...authHeaders() } })
  return res.json()
}

// admin
export async function adminGetDeposits(){
  const res = await fetch(BASE + '/admin/deposits', { headers: { ...authHeaders() } })
  return res.json()
}

export async function adminApproveDeposit(id){
  const res = await fetch(BASE + `/admin/deposits/${id}/approve`, { method:'POST', headers: { ...authHeaders() } })
  return res.json()
}

export async function adminRejectDeposit(id){
  const res = await fetch(BASE + `/admin/deposits/${id}/reject`, { method:'POST', headers: { ...authHeaders() } })
  return res.json()
}

export async function adminGetBlocked(){
  const res = await fetch(BASE + '/admin/blocked', { headers: { ...authHeaders() } })
  return res.json()
}

export async function adminUnblock(ip){
  const res = await fetch(BASE + `/admin/blocked/${encodeURIComponent(ip)}/unblock`, { method:'POST', headers: { ...authHeaders() } })
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

export function setToken(t){ token = t; if(t) localStorage.setItem('de_token', t); else localStorage.removeItem('de_token') }

export default { signup, login, me, getPackages, buyPackage, getTasks, completeTask, getBalance, getTransactions, withdraw, submitDeposit, getMyDeposits, adminGetDeposits, adminApproveDeposit, adminRejectDeposit, setToken }
