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
    // require active account
    if(!req.user.isActive) return res.status(403).json({ error: 'Account not active. Please submit a deposit and wait for admin approval before buying packages.' })
    // in real app: charge user via payment gateway. Here we create transaction and set user's wallet/investment
    const tId = 't'+Date.now()
    await models.Transaction.create({ id:tId, userId: req.user.id, type:'purchase', amount: pkg.price })
    // For demo, we don't deduct money, just return success
    return res.json({ ok:true, package: pkg })
  }catch(e){ console.error(e); res.status(500).json({ error:'server' }) }
})

module.exports = router
