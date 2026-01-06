// IP blocking disabled — middleware kept for compatibility
// This middleware is intentionally a no-op so requests from any IP are allowed.
// If you later want to re-enable IP restrictions, replace this with proper checks.

function ipBlock(req, res, next){
  // No-op: do not block any IPs
  return next()
}

module.exports = { ipBlock }
