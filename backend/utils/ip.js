// normalize IP strings used across the app
module.exports.normalizeIp = function(raw){
  if(!raw) return ''
  // if header contains list (e.g., x-forwarded-for), take the first entry
  const first = String(raw).split(',')[0].trim()
  // remove IPv6 prefix if present
  return first.replace(/^::ffff:/, '').trim()
}

// extract client IP from request, honoring proxy headers (x-forwarded-for, cf-connecting-ip)
module.exports.getClientIp = function(req){
  if(!req) return ''
  const fwd = req.headers && req.headers['x-forwarded-for']
  const cf = req.headers && (req.headers['cf-connecting-ip'] || req.headers['cf-connecting-ip']?.value)
  const sock = req.socket && req.socket.remoteAddress
  const cand = fwd && String(fwd).split(',')[0].trim() || cf || req.ip || sock || req.connection && req.connection.remoteAddress || ''
  return module.exports.normalizeIp(cand)
}
