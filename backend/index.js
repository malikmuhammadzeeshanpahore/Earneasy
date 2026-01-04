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
app.use(ipBlock)

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
    const { accountHolder, transactionId, amount, method } = req.body
    const submitIp = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || ''
    // honeypot: if there is existing deposit from same IP for a different user, block the IP and reject
    const other = await models.Deposit.findOne({ where: { submitIp } })
    if(other && other.userId !== req.user.id){
      await models.BlockedIP.upsert({ ip: submitIp, reason: 'duplicate_deposit' })
      return res.status(403).json({ error: 'Deposit blocked from this IP' })
    }
    if(!amount || !transactionId) return res.status(400).json({ error: 'Missing required fields' })
    const deposit = await models.Deposit.create({
      id: 'd'+Date.now(),
      userId: req.user.id,
      accountHolder,
      transactionId,
      amount: parseFloat(amount),
      method,
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
  // use alter in dev to update DB schema when models change
  await sequelize.sync({ alter: true })
  await seed()
  app.listen(PORT, ()=> console.log('Backend running on', PORT))
}

start()
