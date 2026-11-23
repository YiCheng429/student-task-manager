'use strict';
// Synchronizer-token CSRF protection.
// SameSite=Lax cookies already block most cross-site POSTs, but Lax is a browser
// feature we do not control (old browsers, same-site subdomains), so every
// state-changing request must also send the per-session token in X-CSRF-Token.
const crypto = require('node:crypto');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function issueToken(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  return req.session.csrfToken;
}

function verifyCsrf(req, res, next) {
  if (SAFE.has(req.method)) return next();
  const expected = req.session && req.session.csrfToken;
  const got = req.get('x-csrf-token');
  if (!expected || typeof got !== 'string') {
    return res.status(403).json({ error: 'invalid csrf token' });
  }
  // Compare BYTE lengths, not character lengths: timingSafeEqual throws on a
  // length mismatch, and a header full of non-ASCII characters can have the
  // same character length but a different byte length.
  const a = Buffer.from(got, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).json({ error: 'invalid csrf token' });
  }
  next();
}

module.exports = { issueToken, verifyCsrf };
