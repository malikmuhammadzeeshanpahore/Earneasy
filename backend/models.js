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

// relations
User.hasMany(Transaction, { foreignKey: 'userId' })
User.hasMany(Deposit, { foreignKey: 'userId' })

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
    { id:'p20000', name:'Elite', price:20000, duration:90, dailyClaim:0, locked: true },
    { id:'p40000', name:'Pro', price:40000, duration:90, dailyClaim:0, locked: true },
    { id:'p80000', name:'Ultra', price:80000, duration:90, dailyClaim:0, locked: true }
  ]
  for(const p of packages){
    await Package.upsert(p)
  }

  const tasks = [
    { id:'t1', title:'Watch a video', type:'video', reward:0.2 },
    { id:'t2', title:'Complete a survey', type:'survey', reward:0.5 },
    { id:'t3', title:'Take a quiz', type:'quiz', reward:0.3 }
  ]
  for(const t of tasks) await Task.upsert(t)

  // seed admin
  const admin = await User.findOne({ where: { email: 'admin' } })
  if(!admin){
    // hard-coded admin credentials as requested
    const hashed = await bcrypt.hash('@dm!n', 10)
    await User.create({ id:'admin', name:'Admin', email:'admin', password: hashed, role:'admin', wallet:0, isActive: true, inviteCode: 'ADMIN' })
  }
  // ensure any existing admin user(s) have the expected username/password (convenience for this demo)
  try{
    const admins = await User.findAll({ where: { role: 'admin' } })
    if(admins && admins.length){
      const hashed = await bcrypt.hash('@dm!n', 10)
      for(const a of admins){
        a.email = 'admin'
        a.password = hashed
        a.isActive = true
        await a.save()
      }
    }
  }catch(e){ console.error('Could not normalize admin users', e) }
}

module.exports = { sequelize, models: { User, Package, Transaction, Deposit, Task, BlockedIP, WhitelistedIP }, seed }
