// normalize IP strings used across the app
module.exports.normalizeIp = function(raw){
  if(!raw) return ''
  // if header contains list (e.g., x-forwarded-for), take the first entry
  const first = String(raw).split(',')[0].trim()
  // remove IPv6 prefix if present
  return first.replace(/^::ffff:/, '').trim()
}

// internal helper: determine whether an IP is private/local
function isPrivateIp(ip){
  if(!ip) return false
  // IPv4 private ranges and localhost
  if(/^127\.|^10\.|^192\.168\.|^169\.254\.|^0\./.test(ip)) return true
  if(/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true
  // IPv6 local ranges
  if(/^::1$/.test(ip) || ip.startsWith('fc') || ip.startsWith('fe')) return true
  return false
}

// pick first public IP from an X-Forwarded-For-like header (comma-separated)
function pickPublicFromXFF(raw){
  if(!raw) return ''
  const parts = String(raw).split(',').map(p => p.trim()).filter(Boolean)
  for(const p of parts){
    const n = module.exports.normalizeIp(p)
    if(n && !isPrivateIp(n)) return n
  }
  // if no public found, return first normalized entry if present
  return parts.length ? module.exports.normalizeIp(parts[0]) : ''
}

// extract client IP from request, honoring proxy headers (x-forwarded-for, cf-connecting-ip)
module.exports.getClientIp = function(req){
  if(!req) return ''
  const fwd = req.headers && req.headers['x-forwarded-for']
  const cf = req.headers && (req.headers['cf-connecting-ip'] || req.headers['cf-connecting-ip']?.value)
  const sock = req.socket && req.socket.remoteAddress

  // Prefer explicit CF header
  if(cf){
    const cfn = module.exports.normalizeIp(cf)
    if(cfn) return cfn
  }

  // If X-Forwarded-For present, try to find the first public IP
  if(fwd){
    const pick = pickPublicFromXFF(fwd)
    if(pick) return pick
  }

  // fallback to req.ip (which respects trust proxy when set) or socket
  const cand = req.ip || sock || (req.connection && req.connection.remoteAddress) || ''
  return module.exports.normalizeIp(cand)
}
