const { Sequelize, DataTypes } = require('sequelize')
const path = require('path')
const bcrypt = require('bcrypt')

const sequelize = new Sequelize({ dialect: 'sqlite', storage: path.join(__dirname, 'data.sqlite'), logging: false })

const User = sequelize.define('User', {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true },
  phone: DataTypes.STRING,
  password: DataTypes.STRING,
  role: { type: DataTypes.STRING, defaultValue: 'user' },
  wallet: { type: DataTypes.FLOAT, defaultValue: 0 },
  referralCode: DataTypes.STRING,
  inviteCode: { type: DataTypes.STRING, unique: true },
  referredBy: DataTypes.STRING,
  // payout / withdrawal details
  payoutName: DataTypes.STRING,
  payoutMethod: DataTypes.STRING,
  payoutAccount: DataTypes.STRING,
  // registration bonus tracking
  registrationBonusPending: { type: DataTypes.BOOLEAN, defaultValue: false },
  registrationBonusClaimedAt: DataTypes.DATE,
  currentPackageId: DataTypes.STRING,
  packageActivatedAt: DataTypes.DATE,
  packageExpiresAt: DataTypes.DATE,
  lastClaimedAt: DataTypes.DATE,
  signupIp: DataTypes.STRING,
  isActive: { type: DataTypes.BOOLEAN, defaultValue: false }
})
User.addHook('beforeCreate', (user) => {
  if(!user.id) user.id = 'u' + Date.now()
})

const Package = sequelize.define('Package', {
  id: { type: DataTypes.STRING, primaryKey: true },
  name: DataTypes.STRING,
  price: DataTypes.FLOAT,
  duration: DataTypes.INTEGER,
  dailyClaim: DataTypes.FLOAT,
  locked: { type: DataTypes.BOOLEAN, defaultValue: false }
})

const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.STRING, primaryKey: true },
  userId: DataTypes.STRING,
  type: DataTypes.STRING,
  amount: DataTypes.FLOAT,
  meta: DataTypes.JSON,
  status: { type: DataTypes.STRING, defaultValue: 'completed' }
})

const Deposit = sequelize.define('Deposit', {
  id: { type: DataTypes.STRING, primaryKey: true },
  userId: DataTypes.STRING,
  accountHolder: DataTypes.STRING,
  transactionId: DataTypes.STRING,
  amount: DataTypes.FLOAT,
  method: DataTypes.STRING,
  packageId: DataTypes.STRING,
  screenshot: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  submitIp: DataTypes.STRING
})

// track package purchases per user so a user can own multiple packages
const UserPackage = sequelize.define('UserPackage', {
  id: { type: DataTypes.STRING, primaryKey: true },
  userId: DataTypes.STRING,
  packageId: DataTypes.STRING,
  activatedAt: DataTypes.DATE,
  expiresAt: DataTypes.DATE,
  lastClaimedAt: DataTypes.DATE
})

const BlockedIP = sequelize.define('BlockedIP', {
  ip: { type: DataTypes.STRING, primaryKey: true },
  reason: DataTypes.STRING,
  blockedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
})

const WhitelistedIP = sequelize.define('WhitelistedIP', {
  ip: { type: DataTypes.STRING, primaryKey: true },
  note: DataTypes.STRING,
  addedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
})

const Task = sequelize.define('Task', {
  id: { type: DataTypes.STRING, primaryKey: true },
  title: DataTypes.STRING,
  type: DataTypes.STRING,
  reward: DataTypes.FLOAT,
  meta: DataTypes.JSON
})

// LoginEvent: track logins and signup events (ip, email, phone, geo, user agent)
const LoginEvent = sequelize.define('LoginEvent', {
  id: { type: DataTypes.STRING, primaryKey: true },
  userId: DataTypes.STRING,
  email: DataTypes.STRING,
  phone: DataTypes.STRING,
  ip: DataTypes.STRING,
  geo: DataTypes.JSON,
  userAgent: DataTypes.STRING
})
LoginEvent.addHook('beforeCreate', (le)=>{ if(!le.id) le.id = 'le'+Date.now()+Math.floor(Math.random()*1000) })

// relations
User.hasMany(Transaction, { foreignKey: 'userId' })
User.hasMany(Deposit, { foreignKey: 'userId' })
User.hasMany(UserPackage, { foreignKey: 'userId' })
User.hasMany(LoginEvent, { foreignKey: 'userId' })
LoginEvent.belongsTo(User, { foreignKey: 'userId' })
Deposit.belongsTo(User, { foreignKey: 'userId' })
UserPackage.belongsTo(User, { foreignKey: 'userId' })
UserPackage.belongsTo(Package, { foreignKey: 'packageId' })
Package.hasMany(UserPackage, { foreignKey: 'packageId' })

// Exported models will include BlockedIP

// expose BlockedIP for admin


// helpers
async function seed(){
  // seed packages, admin and some tasks
  const packages = [
    { id:'p700', name:'Starter', price:700, duration:90, dailyClaim:130 },
    { id:'p1600', name:'Bronze', price:1600, duration:90, dailyClaim:280 },
    { id:'p2000', name:'Silver', price:2000, duration:90, dailyClaim:350 },
    { id:'p4000', name:'Gold', price:4000, duration:90, dailyClaim:720 },
    { id:'p8000', name:'Platinum', price:8000, duration:90, dailyClaim:1450 },
    { id:'p12000', name:'Diamond', price:12000, duration:90, dailyClaim:2200 },
    { id:'p20000', name:'Elite', price:20000, duration:90, dailyClaim:3600, locked: false },
    { id:'p40000', name:'Pro', price:40000, duration:90, dailyClaim:7200, locked: false },
    { id:'p80000', name:'Ultra', price:80000, duration:90, dailyClaim:0, locked: true },
    { id:'p100000', name:'Mega', price:100000, duration:90, dailyClaim:0, locked: true }
  ]
  for(const p of packages){
    try{ await Package.upsert(p) }catch(e){ console.error('Package upsert failed for', p.id, e && e.message) }
  }

  const tasks = [
    { id:'t1', title:'Watch a video', type:'video', reward:0.2 },
    { id:'t2', title:'Complete a survey', type:'survey', reward:0.5 },
    { id:'t3', title:'Take a quiz', type:'quiz', reward:0.3 }
  ]
  for(const t of tasks) try{ await Task.upsert(t) }catch(e){ console.error('Task upsert failed for', t.id, e && e.message) }

  // seed admin (idempotent and tolerant)
  try{
    const hashed = await bcrypt.hash('@dm!n', 10)
    const [admin, created] = await User.findOrCreate({ where: { email: 'admin' }, defaults: { id:'admin', name:'Admin', email:'admin', password: hashed, role:'admin', wallet:0, isActive: true, inviteCode: 'ADMIN' } })
    if(!created){
      // ensure admin fields are normalized (convenience for this demo)
      admin.email = 'admin'
      admin.password = hashed
      admin.isActive = true
      if(!admin.inviteCode) admin.inviteCode = 'ADMIN'
      try{ await admin.save() }catch(e){ console.error('Could not normalize existing admin user', e && e.message) }
    }
  }catch(e){
    // tolerate seed errors (e.g., schema mismatch) and continue startup
    console.error('Admin seed failed (continuing):', e && e.message)
  }

  // ensure all existing users have an invite code (for referral links)
  try{
    const { Op } = require('sequelize')
    const missing = await User.findAll({ where: { [Op.or]: [{ inviteCode: null }, { inviteCode: '' }] } })
    for(const u of missing){
      u.inviteCode = 'INV' + Math.random().toString(36).substring(2,8).toUpperCase()
      try{ await u.save() }catch(e){ console.error('Could not save inviteCode for user', u.id, e && e.message) }
    }
  }catch(e){ console.error('Could not assign invite codes to existing users', e && e.message) }
}



module.exports = { sequelize, models: { User, Package, Transaction, Deposit, UserPackage, Task, BlockedIP, WhitelistedIP, LoginEvent }, seed }
