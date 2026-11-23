'use strict';
// Role-based access control. Two roles:
//   student - manage own tasks, read own flag state
//   admin   - everything a student can do + change feature flags
// Admins are listed by numeric GitHub user id in ADMIN_GITHUB_IDS (comma separated).
// We use the numeric id, not the username, because usernames can be renamed/reused.

function parseAdminIds(raw) {
  return new Set(
    String(raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => /^\d+$/.test(s))
  );
}

function roleFor(githubId, adminIds) {
  return adminIds.has(String(githubId)) ? 'admin' : 'student';
}

const PERMISSIONS = {
  student: ['task:read:own', 'task:write:own', 'flags:read'],
  admin: ['task:read:own', 'task:write:own', 'flags:read', 'flags:write'],
};

function can(user, permission) {
  return !!user && (PERMISSIONS[user.role] || []).includes(permission);
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'login required' });
  next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'login required' });
    if (!can(req.user, permission)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

module.exports = { parseAdminIds, roleFor, can, requireAuth, requirePermission, PERMISSIONS };
