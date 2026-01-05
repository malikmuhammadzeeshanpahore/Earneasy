const express = require('express')
const router = express.Router()
const { models } = require('../models')
const { authenticate } = require('../middleware/auth')

router.get('/', async (req,res)=>{
  const pkgs = await models.Package.findAll()
  res.json({ packages: pkgs })
})

router.post('/buy', authenticate, async (req,res)=>{
  try{
    const { packageId } = req.body
    const pkg = await models.Package.findByPk(packageId)
    if(!pkg) return res.status(400).json({ error:'Package not found' })
    // if package is locked, disallow buying
    if(pkg.locked) return res.status(403).json({ error: 'Package is locked', locked: true })

    // if user has enough wallet balance, deduct and activate package
    const user = req.user
    if((user.wallet || 0) < pkg.price){
      return res.status(402).json({ error: 'insufficient_funds', required: pkg.price - (user.wallet || 0) })
    }

    // deduct
    user.wallet = (user.wallet || 0) - pkg.price
    user.currentPackageId = pkg.id
    user.packageActivatedAt = new Date()
    user.packageExpiresAt = new Date(Date.now() + (pkg.duration || 90) * 24 * 60 * 60 * 1000)
    user.isActive = true
    await user.save()

    // record purchase transaction
    const tId = 't'+Date.now()
    await models.Transaction.create({ id:tId, userId: user.id, type:'purchase', amount: pkg.price, meta: { packageId: pkg.id } })

    // referral commissions: level1 10%, level2 5%, level3 1%
    try{
      const pct = [0.10, 0.05, 0.01]
      let refId = user.referredBy
      for(let lvl=0; lvl<3 && refId; lvl++){
        const refUser = await models.User.findByPk(refId)
        if(!refUser) break
        const commission = Math.round((pkg.price * pct[lvl]) * 100) / 100
        if(commission > 0){
          refUser.wallet = (refUser.wallet || 0) + commission
          await refUser.save()
          await models.Transaction.create({ id: 't'+Date.now()+''+lvl, userId: refUser.id, type:'referral', amount: commission, meta: { level: lvl+1, fromUser: user.id, packageId: pkg.id } })
        }
        refId = refUser.referredBy
      }
    }catch(e){ console.error('Referral commission error', e) }

    return res.json({ ok:true, package: pkg, wallet: user.wallet })
  }catch(e){ console.error(e); res.status(500).json({ error:'server' }) }
})

module.exports = router
