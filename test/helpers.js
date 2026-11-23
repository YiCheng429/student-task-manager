'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../src/app');

const ADMIN_ID = '1001';
const STUDENT_ID = '2002';
const STUDENT2_ID = '3003';

function tempFlags(flags) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stm-flags-'));
  const file = path.join(dir, 'flags.json');
  fs.writeFileSync(file, JSON.stringify(flags));
  return file;
}

function makeApp(flags = {
  dark_mode: { enabled: true, rollout: 100 },
  priority_labels: { enabled: false, rollout: 0 },
}) {
  return createApp({
    flagsPath: tempFlags(flags),
    env: { NODE_ENV: 'test', ADMIN_GITHUB_IDS: ADMIN_ID, SESSION_SECRET: 'test-secret-test-secret-test-secret' },
  });
}

// Logs in through the test-only route and returns { agent, csrf }.
async function login(app, githubId, login = `u${githubId}`) {
  const agent = request.agent(app);
  await agent.post('/auth/dev-login').send({ githubId, login }).expect(200);
  const { body } = await agent.get('/api/csrf-token').expect(200);
  return { agent, csrf: body.csrfToken };
}

module.exports = { makeApp, login, tempFlags, ADMIN_ID, STUDENT_ID, STUDENT2_ID };
