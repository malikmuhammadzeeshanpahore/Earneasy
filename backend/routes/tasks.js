const express = require('express')
const router = express.Router()
const { models } = require('../models')
const { authenticate } = require('../middleware/auth')

// list tasks
router.get('/', async (req,res)=>{
  const tasks = await models.Task.findAll()
  res.json({ tasks })
})

// complete a task (demo: auto-credit)
router.post('/complete', authenticate, async (req,res)=>{
  try{
    const { taskId } = req.body
    const task = await models.Task.findByPk(taskId)
    if(!task) return res.status(400).json({ error:'Task not found' })
    // ensure account activated
    if(!req.user.isActive) return res.status(403).json({ error: 'Account not active. Make a deposit and wait for admin approval.' })
    // credit wallet
    const amount = parseFloat(task.reward || 0)
    req.user.wallet = (req.user.wallet || 0) + amount
    await req.user.save()
    const tId = 't'+Date.now()
    await models.Transaction.create({ id: tId, userId: req.user.id, type:'credit', amount, meta: { taskId } })
    return res.json({ ok:true, wallet: req.user.wallet })
  }catch(e){ console.error(e); res.status(500).json({ error:'server' }) }
})

module.exports = router
