const express = require('express')
const router = express.Router()
const { models } = require('../models')
const { Op } = require('sequelize')
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
  const { amount } = req.body
  if(!req.user.isActive) return res.status(403).json({ error: 'Account not active. Withdrawals not allowed.' })
  // require payout details to be configured on profile
  if(!req.user.payoutName || !req.user.payoutMethod || !req.user.payoutAccount) return res.status(400).json({ error: 'Please add withdrawal account details in your profile before requesting a withdrawal.' })
  // minimum withdraw is 200 PKR
  if(!amount || amount < 200) return res.status(400).json({ error:'Minimum withdraw is 200' })
  if(req.user.wallet < amount) return res.status(400).json({ error:'Insufficient balance' })

  // allow only one withdrawal per calendar day (server local date)
  try{
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0)
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59)
    const todayWithdraws = await models.Transaction.count({ where: { userId: req.user.id, type: 'withdraw', createdAt: { [Op.between]: [start, end] } } })
    if(todayWithdraws && todayWithdraws > 0) return res.status(400).json({ error: 'Only one withdrawal allowed per day' })
    // allowed time window: 12:00 (noon) to 24:00 (midnight)
    const hour = now.getHours()
    if(!(hour >= 12 && hour < 24)) return res.status(400).json({ error: 'Withdrawals are allowed between 12:00 PM and 12:00 AM only' })
  }catch(e){ console.error('Withdraw check failed', e); return res.status(500).json({ error: 'server' }) }

  // apply 20% tax/fee
  const fee = Math.round((amount * 0.20) * 100) / 100
  const net = Math.round((amount - fee) * 100) / 100
  // create pending withdrawal transaction and reduce wallet immediately; admin can approve/reject (reject will refund)
  req.user.wallet = Math.round(((req.user.wallet || 0) - amount) * 100) / 100
  await req.user.save()
  const tid = 't'+Date.now()
  // store the payout details that will be used by admin to process the payment
  await models.Transaction.create({ id: tid, userId: req.user.id, type:'withdraw', amount, status: 'pending', meta: { payoutName: req.user.payoutName, payoutMethod: req.user.payoutMethod, payoutAccount: req.user.payoutAccount, fee, net } })
  return res.json({ ok:true, wallet: req.user.wallet, fee, net })
})

// claim registration bonus
router.post('/claim-registration', authenticate, async (req,res)=>{
  try{
    const user = req.user
    if(!user.registrationBonusPending) return res.status(400).json({ error: 'No registration bonus available' })
    const bonus = 50
    user.wallet = (user.wallet || 0) + bonus
    user.registrationBonusPending = false
    user.registrationBonusClaimedAt = new Date()
    await user.save()
    await models.Transaction.create({ id: 't'+Date.now(), userId: user.id, type:'registration_bonus', amount: bonus, meta: {} })
    return res.json({ ok:true, wallet: user.wallet, amount: bonus })
  }catch(e){ console.error('Claim registration failed', e); return res.status(500).json({ error: 'server' }) }
})

// daily claim
router.post('/claim', authenticate, async (req,res)=>{
  try{
    const user = req.user
    if(!user.currentPackageId) return res.status(400).json({ error: 'No active package' })
    const pkg = await models.Package.findByPk(user.currentPackageId)
    if(!pkg) return res.status(400).json({ error: 'Package not found' })
    const now = new Date()
    const last = user.lastClaimedAt ? new Date(user.lastClaimedAt) : null
    // allow one claim per day (UTC date)
    const sameDay = last && last.getUTCFullYear() === now.getUTCFullYear() && last.getUTCMonth() === now.getUTCMonth() && last.getUTCDate() === now.getUTCDate()
    if(sameDay) return res.status(400).json({ error: 'Already claimed today' })
    // check package expiry
    if(user.packageExpiresAt && new Date(user.packageExpiresAt) < now) return res.status(400).json({ error: 'Package expired' })
    const amount = pkg.dailyClaim || 0
    if(!amount || amount <= 0) return res.status(400).json({ error: 'No daily reward for this package' })
    user.wallet = (user.wallet || 0) + amount
    user.lastClaimedAt = now
    await user.save()
    await models.Transaction.create({ id: 't'+Date.now(), userId: user.id, type:'daily', amount, meta: { packageId: pkg.id } })
    return res.json({ ok:true, wallet: user.wallet, amount })
  }catch(e){ console.error('Claim error', e); return res.status(500).json({ error: 'server' }) }
})

module.exports = router
