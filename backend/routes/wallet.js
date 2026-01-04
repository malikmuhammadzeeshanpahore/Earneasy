const express = require('express')
const router = express.Router()
const { models } = require('../models')
const { authenticate } = require('../middleware/auth')

router.get('/balance', authenticate, async (req,res)=>{
  return res.json({ wallet: req.user.wallet })
})

router.get('/transactions', authenticate, async (req,res)=>{
  const txs = await models.Transaction.findAll({ where: { userId: req.user.id }, order: [['createdAt','DESC']] })
  return res.json({ transactions: txs })
})

// request withdrawal (demo: creates a transaction with status pending in real app)
router.post('/withdraw', authenticate, async (req,res)=>{
  const { amount, method, account } = req.body
  if(!req.user.isActive) return res.status(403).json({ error: 'Account not active. Withdrawals not allowed.' })
  if(!amount || amount < 10) return res.status(400).json({ error:'Minimum withdraw is 10' })
  if(req.user.wallet < amount) return res.status(400).json({ error:'Insufficient balance' })
  // For demo: create pending withdrawal transaction and reduce wallet immediately; admin can approve/reject (reject will refund)
  req.user.wallet = req.user.wallet - amount
  await req.user.save()
  const tid = 't'+Date.now()
  await models.Transaction.create({ id: tid, userId: req.user.id, type:'withdraw', amount, status: 'pending' })
  return res.json({ ok:true, wallet: req.user.wallet })
})

module.exports = router
