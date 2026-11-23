'use strict';
// In-memory task store (replace with PostgreSQL later - see README "Planned").
const crypto = require('node:crypto');

const PRIORITIES = ['High', 'Medium', 'Low'];

function createTaskStore() {
  const tasks = new Map();

  return {
    listByOwner(ownerId) {
      return [...tasks.values()].filter((t) => t.ownerId === ownerId);
    },
    // Ownership check lives here so a route can never forget it.
    getOwned(id, ownerId) {
      const t = tasks.get(id);
      return t && t.ownerId === ownerId ? t : null;
    },
    create(ownerId, { title, done = false, priority = null }) {
      const now = new Date().toISOString();
      const t = { id: crypto.randomUUID(), ownerId, title, done, priority, createdAt: now, updatedAt: now };
      tasks.set(t.id, t);
      return t;
    },
    update(t, changes) {
      Object.assign(t, changes, { updatedAt: new Date().toISOString() });
      return t;
    },
    remove(id) {
      tasks.delete(id);
    },
    clear() {
      tasks.clear();
    },
  };
}

module.exports = { createTaskStore, PRIORITIES };
