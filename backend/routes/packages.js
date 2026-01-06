const express = require('express')
const router = express.Router()
const { sequelize, models } = require('../models')
const { authenticate } = require('../middleware/auth')

router.get('/', async (req,res)=>{
  const pkgs = await models.Package.findAll()
  res.json({ packages: pkgs })
})

router.post('/buy', authenticate, async (req,res)=>{
  // Make this operation atomic: if any step fails, rollback the wallet deduction and created records.
  const tx = await sequelize.transaction()
  try{
    const { packageId } = req.body
    const pkg = await models.Package.findByPk(packageId, { transaction: tx })
    if(!pkg){ await tx.rollback(); return res.status(400).json({ error:'Package not found' }) }
    if(pkg.locked){ await tx.rollback(); return res.status(403).json({ error: 'Package is locked', locked: true }) }

    const user = await models.User.findByPk(req.user.id, { transaction: tx })
    if((user.wallet || 0) < pkg.price){ await tx.rollback(); return res.status(402).json({ error: 'insufficient_funds', required: pkg.price - (user.wallet || 0) }) }

    // deduct and save inside transaction
    user.wallet = (user.wallet || 0) - pkg.price
    user.isActive = true
    user.currentPackageId = pkg.id
    await user.save({ transaction: tx })

    const now = new Date()
    const expires = new Date(now.getTime() + (pkg.duration || 90) * 24 * 60 * 60 * 1000)
    const upId = 'up'+Date.now()
    await models.UserPackage.create({ id: upId, userId: user.id, packageId: pkg.id, activatedAt: now, expiresAt: expires }, { transaction: tx })

    // record purchase transaction
    const tId = 't'+Date.now()
    await models.Transaction.create({ id:tId, userId: user.id, type:'purchase', amount: pkg.price, meta: { packageId: pkg.id, userPackageId: upId } }, { transaction: tx })

    // referral commissions: level1 10%, level2 5%, level3 1%
    const pct = [0.10, 0.05, 0.01]
    let refId = user.referredBy
    for(let lvl=0; lvl<3 && refId; lvl++){
      const refUser = await models.User.findByPk(refId, { transaction: tx })
      if(!refUser) break
      const commission = Math.round((pkg.price * pct[lvl]) * 100) / 100
      if(commission > 0){
        refUser.wallet = (refUser.wallet || 0) + commission
        await refUser.save({ transaction: tx })
        await models.Transaction.create({ id: 't'+Date.now()+''+lvl, userId: refUser.id, type:'referral', amount: commission, meta: { level: lvl+1, fromUser: user.id, packageId: pkg.id, userPackageId: upId } }, { transaction: tx })
      }
      refId = refUser.referredBy
    }

    await tx.commit()
    return res.json({ ok:true, package: pkg, wallet: user.wallet, userPackageId: upId })
  }catch(e){
    try{ await tx.rollback() }catch(err){}
    console.error('Buy package failed', e)
    return res.status(500).json({ error:'server' })
  }
})

// list logged-in user's purchased packages
router.get('/mine', authenticate, async (req,res)=>{
  try{
    // Fetch existing user packages
    let ups = await models.UserPackage.findAll({ where: { userId: req.user.id }, include: [{ model: models.Package }] , order:[['activatedAt','DESC']] })

    // If none found, attempt to reconcile from past 'purchase' transactions (fix for earlier partial failures)
    if(!ups || ups.length === 0){
      try{
        const purchases = await models.Transaction.findAll({ where: { userId: req.user.id, type: 'purchase' }, order:[['createdAt','ASC']] })
        for(const p of purchases){
          const upId = p.meta && p.meta.userPackageId
          const pkgId = p.meta && p.meta.packageId
          if(!upId || !pkgId) continue
          const exists = await models.UserPackage.findByPk(upId)
          if(!exists){
            const pkg = await models.Package.findByPk(pkgId)
            const activatedAt = p.createdAt || new Date()
            const expiresAt = pkg ? new Date(new Date(activatedAt).getTime() + (pkg.duration || 90) * 24 * 60 * 60 * 1000) : null
            try{
              await models.UserPackage.create({ id: upId, userId: req.user.id, packageId: pkgId, activatedAt, expiresAt })
            }catch(err){ console.error('Could not create UserPackage during reconciliation', upId, err && err.message) }
          }
        }
      }catch(err){ console.error('Reconciliation step failed', err && err.message) }

      // re-fetch after reconciliation attempt
      ups = await models.UserPackage.findAll({ where: { userId: req.user.id }, include: [{ model: models.Package }] , order:[['activatedAt','DESC']] })
    }

    return res.json({ userPackages: ups })
  }catch(e){ console.error('Get my packages failed', e); return res.status(500).json({ error:'server' }) }
})

// claim daily for a specific purchased package
router.post('/:id/claim', authenticate, async (req,res)=>{
  try{
    const id = req.params.id
    const up = await models.UserPackage.findByPk(id)
    if(!up || up.userId !== req.user.id) return res.status(404).json({ error:'Not found' })
    const pkg = await models.Package.findByPk(up.packageId)
    if(!pkg) return res.status(400).json({ error:'Package not found' })
    // check expiry
    if(up.expiresAt && new Date(up.expiresAt) < new Date()) return res.status(400).json({ error:'Package expired' })
    // only one claim per day per userPackage (UTC day)
    const now = new Date()
    const last = up.lastClaimedAt ? new Date(up.lastClaimedAt) : null
    const sameDay = last && last.getUTCFullYear() === now.getUTCFullYear() && last.getUTCMonth() === now.getUTCMonth() && last.getUTCDate() === now.getUTCDate()
    if(sameDay) return res.status(400).json({ error:'Already claimed today for this package' })
    const amount = pkg.dailyClaim || 0
    if(!amount || amount <= 0) return res.status(400).json({ error:'No daily reward for this package' })
    // credit user
    req.user.wallet = (req.user.wallet || 0) + amount
    await req.user.save()
    up.lastClaimedAt = now
    await up.save()
    await models.Transaction.create({ id: 't'+Date.now(), userId: req.user.id, type:'daily', amount, meta: { packageId: pkg.id, userPackageId: up.id } })
    return res.json({ ok:true, wallet: req.user.wallet, amount })
  }catch(e){ console.error('Claim package failed', e); return res.status(500).json({ error:'server' }) }
})

module.exports = router
