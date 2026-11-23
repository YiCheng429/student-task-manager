'use strict';
// Homemade feature-flag module (JS port of the course starter).
// - "enabled: false" is the kill switch: the flag is OFF for everybody.
// - "rollout" (0-100) puts a stable percentage of users in the ON group.
//   sha256(flag:userId) keeps each user in the same bucket every time.
const fs = require('node:fs');
const crypto = require('node:crypto');

const KNOWN_FLAGS = ['dark_mode', 'priority_labels'];

function createFlagStore(filePath) {
  let flags = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  function bucketOf(flag, userId) {
    const h = crypto.createHash('sha256').update(`${flag}:${userId}`).digest('hex');
    // first 8 hex chars are plenty for a uniform 0-99 bucket
    return parseInt(h.slice(0, 8), 16) % 100;
  }

  function isOn(flag, userId) {
    const f = flags[flag];
    if (!f || f.enabled !== true) return false; // unknown flag or kill switch
    const rollout = Number.isInteger(f.rollout) ? f.rollout : 100;
    if (userId === undefined || userId === null) return rollout >= 100;
    return bucketOf(flag, String(userId)) < rollout;
  }

  function evaluateAll(userId) {
    const out = {};
    for (const name of KNOWN_FLAGS) out[name] = isOn(name, userId);
    return out;
  }

  function getConfig() {
    return structuredClone(flags);
  }

  // Only called from the admin route. Validates input and persists to disk.
  function update(flag, { enabled, rollout }) {
    if (!KNOWN_FLAGS.includes(flag)) {
      const err = new Error('unknown flag');
      err.status = 404;
      throw err;
    }
    const next = { ...flags[flag] };
    if (enabled !== undefined) {
      if (typeof enabled !== 'boolean') throw badRequest('enabled must be boolean');
      next.enabled = enabled;
    }
    if (rollout !== undefined) {
      if (!Number.isInteger(rollout) || rollout < 0 || rollout > 100) {
        throw badRequest('rollout must be an integer 0-100');
      }
      next.rollout = rollout;
    }
    flags = { ...flags, [flag]: next };
    fs.writeFileSync(filePath, JSON.stringify(flags, null, 2) + '\n');
    return next;
  }

  return { isOn, evaluateAll, getConfig, update, bucketOf };
}

function badRequest(msg) {
  const err = new Error(msg);
  err.status = 400;
  return err;
}

module.exports = { createFlagStore, KNOWN_FLAGS };
