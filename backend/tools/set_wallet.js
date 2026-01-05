// Usage: node tools/set_wallet.js userEmail amount
const { sequelize, models } = require('../models')
async function run(){
  const email = process.argv[2]
  const amount = parseFloat(process.argv[3])
  if(!email || !amount){
    console.log('Usage: node tools/set_wallet.js userEmail amount')
    process.exit(1)
  }
  await sequelize.authenticate()
  const user = await models.User.findOne({ where: { email } })
  if(!user){ console.log('User not found'); process.exit(1) }
  user.wallet = amount
  await user.save()
  console.log('Set wallet for', email, 'to', amount)
  process.exit(0)
}
run().catch(e=>{ console.error(e); process.exit(1) })
