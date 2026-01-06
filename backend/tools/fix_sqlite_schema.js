const { sequelize, models } = require('../models')

// Non-destructive SQLite schema reconciliation helper
// - Inspects PRAGMA table_info for the given table and adds any missing columns
// - Only supports ADD COLUMN operations which are safe in SQLite
// Usage: node backend/tools/fix_sqlite_schema.js

async function run(){
  await sequelize.authenticate()
  console.log('Connected to DB')

  const table = 'Users'
  const raw = await sequelize.query(`PRAGMA table_info('${table}')`)
  const existing = raw && raw[0] ? raw[0].map(r => r.name) : []
  console.log('Existing columns:', existing.join(', '))

  const attrMap = models.User.rawAttributes
  const expected = Object.keys(attrMap)
  const missing = expected.filter(k => !existing.includes(k))
  if(missing.length === 0){
    console.log('No missing columns on', table)
    process.exit(0)
  }

  console.log('Missing columns:', missing.join(', '))

  // Map Sequelize type to SQLite column definitions (simple and conservative)
  function sqlType(attr){
    const t = String(attr.type)
    if(t.includes('FLOAT') || t.includes('DOUBLE') || t.includes('REAL')) return 'REAL'
    if(t.includes('BOOLEAN')) return 'INTEGER'
    if(t.includes('DATE')) return 'DATETIME'
    if(t.includes('JSON')) return 'TEXT'
    return 'TEXT'
  }

  for(const col of missing){
    const attr = attrMap[col]
    const type = sqlType(attr)
    const stmt = `ALTER TABLE ${table} ADD COLUMN ${col} ${type}`
    try{
      console.log('Adding column:', col, type)
      await sequelize.query(stmt)
      console.log('Added', col)
    }catch(e){
      console.error('Failed to add column', col, e && e.message)
    }
  }

  console.log('Schema fix completed for', table)
  process.exit(0)
}

run().catch(e=>{ console.error('Schema fix failed', e && e.message); process.exit(1) })