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

// parse `Forwarded` header (RFC7239) and return first 'for=' value
function parseForwardedHeader(raw){
  if(!raw) return ''
  // example: for=203.0.113.195;proto=https;by=203.0.113.43
  const match = String(raw).match(/for=([^;,\s]+)/i)
  return match ? module.exports.normalizeIp(match[1].replace(/"/g,'')) : ''
}

// extract client IP from request, honoring proxy headers (x-forwarded-for, cf-connecting-ip, x-real-ip, forwarded)
module.exports.getClientIp = function(req){
  if(!req) return ''
  const headers = req.headers || {}
  const fwd = headers['x-forwarded-for']
  const cf = headers['cf-connecting-ip'] || (headers['cf-connecting-ip'] && headers['cf-connecting-ip'].value)
  const xreal = headers['x-real-ip']
  const xclient = headers['x-client-ip'] || headers['x-cluster-client-ip']
  const forwarded = headers['forwarded']
  const sock = req.socket && req.socket.remoteAddress

  // 1) prefer Cloudflare header
  if(cf){ const cfn = module.exports.normalizeIp(cf); if(cfn) return cfn }

  // 2) prefer explicit x-real-ip / x-client-ip if present and valid
  if(xreal){ const xr = module.exports.normalizeIp(xreal); if(xr) return xr }
  if(xclient){ const xc = module.exports.normalizeIp(xclient); if(xc) return xc }

  // 3) X-Forwarded-For: pick first public IP or first entry
  if(fwd){ const pick = pickPublicFromXFF(fwd); if(pick) return pick }

  // 4) Forwarded header RFC7239
  if(forwarded){ const pf = parseForwardedHeader(forwarded); if(pf) return pf }

  // 5) fallback to req.ip (respects `trust proxy`), socket remote address
  const cand = req.ip || sock || (req.connection && req.connection.remoteAddress) || ''
  return module.exports.normalizeIp(cand)
}
