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
  dailyTasks: DataTypes.INTEGER,
  dailyRate: DataTypes.FLOAT
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
  screenshot: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  submitIp: DataTypes.STRING
})

const BlockedIP = sequelize.define('BlockedIP', {
  ip: { type: DataTypes.STRING, primaryKey: true },
  reason: DataTypes.STRING,
  blockedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
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
    { id:'basic', name:'Basic', price:10, duration:30, dailyTasks:5, dailyRate:0.5 },
    { id:'premium', name:'Premium', price:50, duration:30, dailyTasks:10, dailyRate:1.2 },
    { id:'vip', name:'VIP', price:100, duration:30, dailyTasks:20, dailyRate:3 }
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
  const admin = await User.findOne({ where: { email: 'admin@demo' } })
  if(!admin){
    const hashed = await bcrypt.hash('adminpass', 10)
    await User.create({ id:'admin', name:'Admin', email:'admin@demo', password: hashed, role:'admin', wallet:0, isActive: true })
  }
}

module.exports = { sequelize, models: { User, Package, Transaction, Deposit, Task, BlockedIP }, seed }
