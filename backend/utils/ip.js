// normalize IP strings used across the app
module.exports.normalizeIp = function(raw){
  if(!raw) return ''
  // if header contains list (e.g., x-forwarded-for), take the first entry
  const first = String(raw).split(',')[0].trim()
  // remove IPv6 prefix if present
  return first.replace(/^::ffff:/, '').trim()
}
