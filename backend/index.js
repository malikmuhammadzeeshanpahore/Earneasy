const express = require('express')
const cors = require('cors')
const path = require('path')
const multer = require('multer')
const { sequelize, models, seed } = require('./models')
const authRoutes = require('./routes/auth')
const packageRoutes = require('./routes/packages')
const taskRoutes = require('./routes/tasks')
const walletRoutes = require('./routes/wallet')
const adminRoutes = require('./routes/admin')

const app = express()
app.use(cors())
app.use(express.json())

// file uploads (screenshots)
const uploadDir = path.join(__dirname, 'uploads')
const fs = require('fs')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'_'))
})
const upload = multer({ storage })

// expose uploaded images
app.use('/uploads', express.static(uploadDir))

// IP block middleware (honeypot)
const { ipBlock } = require('./middleware/ipBlock')
// Honeypot middleware can interfere with testing. Allow disabling via env var DISABLE_HONEYPOT=1
if(process.env.DISABLE_HONEYPOT === '1'){
  console.log('Honeypot middleware disabled via DISABLE_HONEYPOT=1')
}else{
  app.use(ipBlock)
}

// routes
app.use('/api/auth', authRoutes)
app.use('/api/packages', packageRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/admin', adminRoutes)

// deposit upload endpoint (authenticated)
const { authenticate } = require('./middleware/auth')
app.post('/api/deposits', authenticate, upload.single('screenshot'), async (req, res) => {
  try{
  const { accountHolder, transactionId, amount, method, packageId } = req.body
    const submitIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''
    // honeypot: if there is existing deposit from same IP for a different user, block the IP and reject
    const other = await models.Deposit.findOne({ where: { submitIp } })
    if(other && other.userId !== req.user.id){
      // if IP is whitelisted, allow instead of blocking
      const wh = submitIp ? await models.WhitelistedIP.findByPk(submitIp) : null
      if(wh){
        console.log('Deposit submitIp is whitelisted, skipping block:', submitIp)
      }else{
        await models.BlockedIP.upsert({ ip: submitIp, reason: 'duplicate_deposit' })
        return res.status(403).json({ error: 'Deposit blocked from this IP' })
      }
    }
    if(!amount || !transactionId) return res.status(400).json({ error: 'Missing required fields' })
    const deposit = await models.Deposit.create({
      id: 'd'+Date.now(),
      userId: req.user.id,
      accountHolder,
      transactionId,
      amount: parseFloat(amount),
      method,
      packageId: packageId || null,
      screenshot: req.file ? '/uploads/' + req.file.filename : null,
      status: 'pending',
      submitIp
    })
    // do not activate user until admin approval
    return res.json({ deposit })
  }catch(e){
    console.error(e)
    return res.status(500).json({ error: 'Server error' })
  }
})

// user's deposits
app.get('/api/deposits', authenticate, async (req,res)=>{
  const deps = await models.Deposit.findAll({ where: { userId: req.user.id }, order:[['createdAt','DESC']] })
  res.json({ deposits: deps })
})

// health
app.get('/api/health', (req,res)=> res.json({ ok:true }))

const PORT = process.env.PORT || 4000
async function start(){
  // try to use alter in dev to update DB schema when models change
  try{
    await sequelize.sync({ alter: true })
  }catch(err){
    console.error('Sequelize sync with { alter: true } failed:', err && err.message || err)
    console.error('Falling back to sequelize.sync() (no alter).')
    console.error('If you need to apply model schema changes, consider removing the SQLite file at backend/data.sqlite to recreate the schema (make a backup first).')
    try{
      await sequelize.sync()
    }catch(err2){
      console.error('Fallback sequelize.sync() also failed:', err2)
      console.error('Cannot start server. To reset the database, remove backend/data.sqlite and restart. Exiting.')
      process.exit(1)
    }
  }

  await seed()
  // ensure new columns exist on older DB files (e.g. packageId added later)
  try{
    const qi = sequelize.getQueryInterface()
    const DataTypes = require('sequelize').DataTypes
    const desc = await qi.describeTable('Deposits').catch(()=>null)
    if(desc && !desc.packageId){
      console.log('Adding missing column `packageId` to Deposits table')
      await qi.addColumn('Deposits','packageId',{ type: DataTypes.STRING, allowNull: true })
    }
  }catch(e){
    console.error('Could not ensure Deposits.packageId column:', e && e.message || e)
  }

  // Listen on all interfaces so the server is reachable from external hosts
  app.listen(PORT, '0.0.0.0', ()=> console.log('Backend running on', PORT, 'and bound to 0.0.0.0'))
}

start()
