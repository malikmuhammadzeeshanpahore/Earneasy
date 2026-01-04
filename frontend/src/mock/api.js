// Simple mock API for demo purposes. Uses localStorage to persist demo state.

const STORAGE_KEY = 'dailyearn_demo'

const defaultState = {
  users: [],
  packages: [
    { id: 'basic', name: 'Basic', price: 10, duration: 30, dailyTasks: 5, dailyRate: 0.5 },
    { id: 'premium', name: 'Premium', price: 50, duration: 30, dailyTasks: 10, dailyRate: 1.2 },
    { id: 'vip', name: 'VIP', price: 100, duration: 30, dailyTasks: 20, dailyRate: 3 }
  ],
  transactions: [],
}

function read(){
  const raw = localStorage.getItem(STORAGE_KEY)
  if(!raw) return JSON.parse(JSON.stringify(defaultState))
  try { return JSON.parse(raw) } catch(e){ return JSON.parse(JSON.stringify(defaultState)) }
}

function write(state){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }

export function getPackages(){
  const s = read()
  return s.packages
}

export function createUser({name,email,phone,password}){
  const s = read()
  const exists = s.users.find(u=>u.email===email||u.phone===phone)
  if(exists) throw new Error('User exists')
  const user = { id: 'u'+Date.now(), name, email, phone, password, role:'user', wallet:0, investment:null, referrals:[], createdAt:Date.now() }
  s.users.push(user)
  write(s)
  return user
}

export function signIn({email,password}){
  const s = read()
  const u = s.users.find(x=>x.email===email && x.password===password)
  if(!u) throw new Error('Invalid credentials')
  return u
}

export function buyPackage(userId, packageId){
  const s = read()
  const pkg = s.packages.find(p=>p.id===packageId)
  if(!pkg) throw new Error('Package not found')
  const user = s.users.find(u=>u.id===userId)
  if(!user) throw new Error('User missing')
  user.investment = { packageId:pkg.id, start:Date.now(), expires: Date.now() + pkg.duration*24*3600*1000, completedDays:0 }
  s.transactions.push({id:'t'+Date.now(), userId, type:'purchase', amount: pkg.price, createdAt:Date.now()})
  write(s)
  return user
}

export function creditTaskEarning(userId, amount, reason='task'){
  const s = read()
  const user = s.users.find(u=>u.id===userId)
  if(!user) throw new Error('User missing')
  user.wallet = (user.wallet||0) + amount
  s.transactions.push({id:'t'+Date.now(), userId, type: 'credit', amount, reason, createdAt:Date.now()})
  write(s)
  return user
}

export function getUser(userId){
  const s = read()
  return s.users.find(u=>u.id===userId)
}

export function getTransactions(userId){
  const s = read()
  return s.transactions.filter(t=>t.userId===userId).sort((a,b)=>b.createdAt-a.createdAt)
}

// seed admin for demo
export function seedAdmin(){
  const s=read()
  if(!s.users.find(u=>u.role==='admin')){
    s.users.push({id:'admin', name:'Admin', email:'admin@demo', password:'admin', role:'admin', wallet:0})
    write(s)
  }
}

// initialize on module load
seedAdmin()

export default { getPackages, createUser, signIn, buyPackage, creditTaskEarning, getUser, getTransactions }
