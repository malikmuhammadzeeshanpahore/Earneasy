const express = require('express')
const router = express.Router()
const { models, sequelize } = require('../models')
const { authenticate, requireAdmin } = require('../middleware/auth')

// List pending deposits
// Allow admin access either via admin JWT or via admin-secret header. We'll create a small helper.
function allowAdminOrSecret(handler){
  return async (req,res)=>{
    try{
  // default admin secret (can be overridden with ADMIN_SECRET env var)
  const secret = process.env.ADMIN_SECRET || 'earnandearn'
      const headerSecret = req.headers['x-admin-secret'] || req.query.admin_secret
      if(headerSecret && headerSecret === secret){
        // bypass normal auth
        return handler(req,res)
      }
      // otherwise run authenticate -> requireAdmin -> handler
      return authenticate(req,res, () => {
        return requireAdmin(req,res, () => handler(req,res))
      })
    }catch(e){ console.error(e); return res.status(500).json({ error:'server' }) }
  }
}

router.get('/deposits', allowAdminOrSecret(async (req,res)=>{
  // include user basic info so admin can see who submitted each deposit
  const deposits = await models.Deposit.findAll({ where: { status: 'pending' }, order:[['createdAt','DESC']], include: [{ model: models.User, attributes: ['id','name','email'] }] })
  res.json({ deposits })
}))

// blocked IPs management
router.get('/blocked', allowAdminOrSecret(async (req,res)=>{
  const list = await models.BlockedIP.findAll({ order:[['blockedAt','DESC']] })
  res.json({ blocked: list })
}))

// whitelist management
router.get('/whitelist', allowAdminOrSecret(async (req,res)=>{
  const list = await models.WhitelistedIP.findAll({ order:[['addedAt','DESC']] })
  res.json({ whitelist: list })
}))

router.post('/whitelist', allowAdminOrSecret(async (req,res)=>{
  const { ip, note } = req.body || {}
  if(!ip) return res.status(400).json({ error: 'Missing ip' })
  const { normalizeIp } = require('../utils/ip')
  const n = normalizeIp(ip)
  await models.WhitelistedIP.upsert({ ip: n, note })
  res.json({ ok:true })
}))

router.post('/whitelist/:ip/remove', allowAdminOrSecret(async (req,res)=>{
  const raw = req.params.ip
  const { normalizeIp } = require('../utils/ip')
  const ip = normalizeIp(raw)
  const w = await models.WhitelistedIP.findByPk(ip)
  if(!w) return res.status(404).json({ error: 'Not found' })
  await w.destroy()
  res.json({ ok:true })
}))

router.post('/blocked/:ip/unblock', allowAdminOrSecret(async (req,res)=>{
  const raw = req.params.ip
  const { normalizeIp } = require('../utils/ip')
  const ip = normalizeIp(raw)
  const b = await models.BlockedIP.findByPk(ip)
  if(!b) return res.status(404).json({ error:'Not found' })
  await b.destroy()
  res.json({ ok:true })
}))

// Approve deposit
router.post('/deposits/:id/approve', allowAdminOrSecret(async (req,res)=>{
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

  // REFERRAL BONUSES: distribute up to 3 levels (10%, 5%, 1%) based on referredBy chain
  try{
    const levels = [0.10, 0.05, 0.01]
    let currentRefId = user.referredBy
    for(let lvl=0; lvl<levels.length && currentRefId; lvl++){
      const refUser = await models.User.findByPk(currentRefId)
      if(!refUser){ currentRefId = null; break }
      const bonus = Math.round((dep.amount * levels[lvl]) * 100) / 100
      if(bonus > 0){
        refUser.wallet = (refUser.wallet || 0) + bonus
        await refUser.save()
        await models.Transaction.create({ id: 't'+Date.now()+String(lvl+1), userId: refUser.id, type:'referral', amount: bonus, status: 'completed', meta: { depositId: dep.id, fromUserId: user.id, level: lvl+1 } })
      }
      // move up the chain
      currentRefId = refUser.referredBy
    }
  }catch(e){ console.error('Failed to process referral bonuses', e) }

  res.json({ ok:true })
}))

// Reject deposit
router.post('/deposits/:id/reject', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const dep = await models.Deposit.findByPk(id)
  if(!dep) return res.status(404).json({ error:'Not found' })
  dep.status = 'rejected'
  await dep.save()
  res.json({ ok:true })
}))

// list users
router.get('/users', allowAdminOrSecret(async (req,res)=>{
  const users = await models.User.findAll({ order:[['createdAt','DESC']] })
  res.json({ users })
}))

// get user details (transactions and deposits) for admin view
router.get('/users/:id', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const user = await models.User.findByPk(id, { attributes: ['id','name','email','phone','role','wallet','payoutName','payoutMethod','payoutAccount','isActive','inviteCode','referredBy','createdAt'] })
  if(!user) return res.status(404).json({ error: 'Not found' })
  const transactions = await models.Transaction.findAll({ where: { userId: id }, order: [['createdAt','DESC']] })
  const deposits = await models.Deposit.findAll({ where: { userId: id }, order: [['createdAt','DESC']] })
  // include user's packages and direct referrals (level 1)
  const userPackages = await models.UserPackage.findAll({ where: { userId: id }, include: [{ model: models.Package }], order: [['activatedAt','DESC']] })
  const referrals = await models.User.findAll({ where: { referredBy: id }, attributes: ['id','name','email','createdAt'] })
  res.json({ user, transactions, deposits, userPackages, referrals })
}))

// list all transactions
router.get('/transactions', allowAdminOrSecret(async (req,res)=>{
  const txs = await models.Transaction.findAll({ order:[['createdAt','DESC']] })
  res.json({ transactions: txs })
}))

// Reconcile missing UserPackage records from purchase transactions
router.post('/reconcile-purchases', allowAdminOrSecret(async (req,res)=>{
  try{
    const purchases = await models.Transaction.findAll({ where: { type: 'purchase' }, order:[['createdAt','ASC']] })
    let created = 0, skipped = 0, errors = 0
    for(const p of purchases){
      try{
        const upId = p.meta && p.meta.userPackageId
        const pkgId = p.meta && p.meta.packageId
        if(!upId || !pkgId){ skipped++; continue }
        const exists = await models.UserPackage.findByPk(upId)
        if(exists){ skipped++; continue }
        const pkg = await models.Package.findByPk(pkgId)
        const activatedAt = p.createdAt || new Date()
        const expiresAt = pkg ? new Date(new Date(activatedAt).getTime() + (pkg.duration || 90) * 24 * 60 * 60 * 1000) : null
        await models.UserPackage.create({ id: upId, userId: p.userId, packageId: pkgId, activatedAt, expiresAt })
        created++
      }catch(e){ console.error('Reconcile error for tx', p.id, e && e.message); errors++ }
    }
    res.json({ ok:true, created, skipped, errors })
  }catch(e){ console.error('Reconcile operation failed', e); res.status(500).json({ error: 'server' }) }
}))

// approve withdraw
router.post('/withdraws/:id/approve', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const t = await models.Transaction.findByPk(id)
  if(!t) return res.status(404).json({ error:'Not found' })
  if(t.type !== 'withdraw') return res.status(400).json({ error:'Not a withdraw' })
  t.status = 'approved'
  await t.save()
  res.json({ ok:true })
}))

// list withdraw requests (for admin UI)
router.get('/withdraws', allowAdminOrSecret(async (req,res)=>{
  const txs = await models.Transaction.findAll({ where: { type: 'withdraw' }, order:[['createdAt','DESC']] })
  res.json({ withdraws: txs })
}))

// mark withdraw as sent (admin indicates they have sent the payment externally)
router.post('/withdraws/:id/sent', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const t = await models.Transaction.findByPk(id)
  if(!t) return res.status(404).json({ error:'Not found' })
  if(t.type !== 'withdraw') return res.status(400).json({ error:'Not a withdraw' })
  t.status = 'sent'
  await t.save()
  res.json({ ok:true })
}))

// confirm withdraw completed (admin confirms funds were delivered)
router.post('/withdraws/:id/complete', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const t = await models.Transaction.findByPk(id)
  if(!t) return res.status(404).json({ error:'Not found' })
  if(t.type !== 'withdraw') return res.status(400).json({ error:'Not a withdraw' })
  t.status = 'completed'
  await t.save()
  res.json({ ok:true })
}))

// reject withdraw => refund
router.post('/withdraws/:id/reject', allowAdminOrSecret(async (req,res)=>{
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
}))

// Admin: manually activate package for a user
// body: { packageId, charge: 'none'|'wallet'|'external' }
router.post('/users/:id/activate-package', allowAdminOrSecret(async (req,res)=>{
  const id = req.params.id
  const { packageId, charge = 'none' } = req.body || {}
  if(!packageId) return res.status(400).json({ error: 'Missing packageId' })
  const user = await models.User.findByPk(id)
  if(!user) return res.status(404).json({ error: 'Not found' })
  const pkg = await models.Package.findByPk(packageId)
  if(!pkg) return res.status(404).json({ error: 'Invalid package' })
  const upId = 'up'+Date.now()+Math.floor(Math.random()*1000)
  const activatedAt = new Date()
  const expiresAt = pkg ? new Date(activatedAt.getTime() + (pkg.duration || 90) * 24 * 60 * 60 * 1000) : null
  try{
    await sequelize.transaction(async (tx)=>{
      await models.UserPackage.create({ id: upId, userId: user.id, packageId: pkg.id, activatedAt, expiresAt }, { transaction: tx })
      if(charge === 'wallet'){
        if((user.wallet || 0) < pkg.price) throw new Error('insufficient_funds')
        user.wallet = (user.wallet || 0) - pkg.price
        await user.save({ transaction: tx })
        await models.Transaction.create({ id: 't'+Date.now(), userId: user.id, type:'purchase', amount: pkg.price, meta: { packageId: pkg.id, userPackageId: upId, adminActivated: true } }, { transaction: tx })
        // distribute referral commissions (10%,5%,1%) up the chain
        try{
          const levels = [0.10,0.05,0.01]
          let refId = user.referredBy
          for(let lvl=0; lvl<levels.length && refId; lvl++){
            const refUser = await models.User.findByPk(refId)
            if(!refUser){ refId = null; break }
            const commission = Math.round((pkg.price * levels[lvl]) * 100) / 100
            if(commission > 0){
              refUser.wallet = (refUser.wallet || 0) + commission
              await refUser.save({ transaction: tx })
              await models.Transaction.create({ id: 't'+Date.now()+String(lvl+1), userId: refUser.id, type:'referral', amount: commission, meta: { level: lvl+1, fromUser: user.id, packageId: pkg.id, userPackageId: upId, adminActivated: true } }, { transaction: tx })
            }
            refId = refUser.referredBy
          }
        }catch(e){ console.error('Failed to distribute referral commissions during admin activation', e) }
      }
    })
    return res.json({ ok:true, userPackageId: upId })
  }catch(e){
    if(e && e.message === 'insufficient_funds') return res.status(400).json({ error: 'insufficient_funds' })
    console.error('Admin activate package failed', e)
    return res.status(500).json({ error: 'server' })
  }
}))

// Admin: link referral manually by emails (referredByEmail -> refereeEmail)
// body: { referredByEmail, refereeEmail, force }
router.post('/users/link-referral', allowAdminOrSecret(async (req,res)=>{
  const { referredByEmail, refereeEmail, force } = req.body || {}
  if(!referredByEmail || !refereeEmail) return res.status(400).json({ error: 'Missing emails' })
  const referred = await models.User.findOne({ where: { email: referredByEmail } })
  const referee = await models.User.findOne({ where: { email: refereeEmail } })
  if(!referred || !referee) return res.status(404).json({ error: 'User(s) not found' })
  if(referee.referredBy && !force && referee.referredBy !== referred.id) return res.status(400).json({ error: 'referee_already_has_referrer' })
  referee.referredBy = referred.id
  await referee.save()
  res.json({ ok:true })
}))

// Admin: reconcile referral bonuses for approved deposits
// body: { dryRun: true|false, userId: optional }
router.post('/reconcile-referral-bonuses', allowAdminOrSecret(async (req,res)=>{
  try{
    const { dryRun, userId } = req.body || {}
    const where = { status: 'approved' }
    if(userId) where.userId = userId
    const deposits = await models.Deposit.findAll({ where })
    let created = 0, skipped = 0, errors = 0
    for(const dep of deposits){
      try{
        const depositor = await models.User.findByPk(dep.userId)
        if(!depositor) { skipped++; continue }
        const levels = [0.10,0.05,0.01]
        let currentRefId = depositor.referredBy
        for(let lvl=0; lvl<levels.length && currentRefId; lvl++){
          const refUser = await models.User.findByPk(currentRefId)
          if(!refUser){ currentRefId = null; break }
          const amount = Math.round((dep.amount * levels[lvl]) * 100) / 100
          // look for existing referral tx for this deposit/level by searching matching meta in JS
          const existing = (await models.Transaction.findAll({ where: { type: 'referral', userId: refUser.id } })).find(t => t.meta && t.meta.depositId === dep.id && String(t.meta.level) === String(lvl+1) && t.meta.fromUserId === dep.userId)
          if(existing){ skipped++; } else {
            if(!dryRun){
              refUser.wallet = (refUser.wallet || 0) + amount
              await refUser.save()
              await models.Transaction.create({ id: 't'+Date.now()+String(lvl+1), userId: refUser.id, type:'referral', amount, status: 'completed', meta: { depositId: dep.id, fromUserId: dep.userId, level: lvl+1 } })
            }
            created++
          }
          currentRefId = refUser.referredBy
        }
      }catch(e){ console.error('reconcile-referral error for deposit', dep.id, e); errors++ }
    }
    res.json({ ok:true, created, skipped, errors, dryRun: !!dryRun })
  }catch(e){ console.error('reconcile-referral-bonuses failed', e); res.status(500).json({ error: 'server' }) }
}))

module.exports = router
