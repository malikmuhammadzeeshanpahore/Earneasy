const express = require('express')
const router = express.Router()
const { models } = require('../models')
const { authenticate, requireAdmin } = require('../middleware/auth')

// List pending deposits
// Allow admin access either via admin JWT or via admin-secret header. We'll create a small helper.
function allowAdminOrSecret(handler){
  return async (req,res)=>{
    try{
      const secret = process.env.ADMIN_SECRET || 'admintestsecret'
      const headerSecret = req.headers['x-admin-secret'] || req.query.admin_secret
      if(headerSecret && headerSecret === secret){
        // bypass normal auth
        return handler(req,res)
      }
      // otherwise require usual admin flow
      return authenticate(req,res, async ()=> requireAdmin(req,res, handler))
    }catch(e){ console.error(e); return res.status(500).json({ error:'server' }) }
  }
}

router.get('/deposits', allowAdminOrSecret(async (req,res)=>{
  const deposits = await models.Deposit.findAll({ where: { status: 'pending' }, order:[['createdAt','DESC']] })
  res.json({ deposits })
}))

// blocked IPs management
router.get('/blocked', allowAdminOrSecret(async (req,res)=>{
  const list = await models.BlockedIP.findAll({ order:[['blockedAt','DESC']] })
  res.json({ blocked: list })
}))

router.post('/blocked/:ip/unblock', allowAdminOrSecret(async (req,res)=>{
  const ip = req.params.ip
  const b = await models.BlockedIP.findByPk(ip)
  if(!b) return res.status(404).json({ error:'Not found' })
  await b.destroy()
  res.json({ ok:true })
}))

// Approve deposit
router.post('/deposits/:id/approve', authenticate, requireAdmin, async (req,res)=>{
  const id = req.params.id
  const dep = await models.Deposit.findByPk(id)
  if(!dep) return res.status(404).json({ error:'Not found' })
  dep.status = 'approved'
  await dep.save()
  // credit user's wallet
  const user = await models.User.findByPk(dep.userId)
  user.wallet = (user.wallet || 0) + dep.amount
  user.isActive = true // activate account on deposit approval
  await user.save()
  await models.Transaction.create({ id: 't'+Date.now(), userId: user.id, type:'deposit', amount: dep.amount, meta: { depositId: dep.id } })
  res.json({ ok:true })
})

// Reject deposit
router.post('/deposits/:id/reject', authenticate, requireAdmin, async (req,res)=>{
  const id = req.params.id
  const dep = await models.Deposit.findByPk(id)
  if(!dep) return res.status(404).json({ error:'Not found' })
  dep.status = 'rejected'
  await dep.save()
  res.json({ ok:true })
})

// list users
router.get('/users', authenticate, requireAdmin, async (req,res)=>{
  const users = await models.User.findAll({ order:[['createdAt','DESC']] })
  res.json({ users })
})

// list all transactions
router.get('/transactions', authenticate, requireAdmin, async (req,res)=>{
  const txs = await models.Transaction.findAll({ order:[['createdAt','DESC']] })
  res.json({ transactions: txs })
})

// approve withdraw
router.post('/withdraws/:id/approve', authenticate, requireAdmin, async (req,res)=>{
  const id = req.params.id
  const t = await models.Transaction.findByPk(id)
  if(!t) return res.status(404).json({ error:'Not found' })
  if(t.type !== 'withdraw') return res.status(400).json({ error:'Not a withdraw' })
  t.status = 'approved'
  await t.save()
  res.json({ ok:true })
})

// reject withdraw => refund
router.post('/withdraws/:id/reject', authenticate, requireAdmin, async (req,res)=>{
  const id = req.params.id
  const t = await models.Transaction.findByPk(id)
  if(!t) return res.status(404).json({ error:'Not found' })
  if(t.type !== 'withdraw') return res.status(400).json({ error:'Not a withdraw' })
  const user = await models.User.findByPk(t.userId)
  // refund
  user.wallet = (user.wallet || 0) + t.amount
  await user.save()
  t.status = 'rejected'
  await t.save()
  res.json({ ok:true })
})

module.exports = router
