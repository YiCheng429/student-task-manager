'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createFlagStore } = require('../src/flags');
const { tempFlags } = require('./helpers');

test('kill switch: enabled=false is OFF for everyone even at 100% rollout', () => {
  const store = createFlagStore(tempFlags({ priority_labels: { enabled: false, rollout: 100 } }));
  for (let i = 0; i < 200; i++) assert.equal(store.isOn('priority_labels', `gh:${i}`), false);
});

test('unknown flag is OFF', () => {
  const store = createFlagStore(tempFlags({}));
  assert.equal(store.isOn('does_not_exist', 'gh:1'), false);
});

test('rollout is deterministic per user and roughly matches the percentage', () => {
  const store = createFlagStore(tempFlags({ priority_labels: { enabled: true, rollout: 20 } }));
  let on = 0;
  for (let i = 0; i < 2000; i++) {
    const a = store.isOn('priority_labels', `gh:${i}`);
    assert.equal(store.isOn('priority_labels', `gh:${i}`), a, 'same user -> same answer');
    if (a) on++;
  }
  const pct = (on / 2000) * 100;
  assert.ok(pct > 15 && pct < 25, `expected ~20%, got ${pct}%`);
});

test('rollout 0 is OFF for everyone, rollout 100 is ON for everyone', () => {
  const none = createFlagStore(tempFlags({ priority_labels: { enabled: true, rollout: 0 } }));
  const all = createFlagStore(tempFlags({ priority_labels: { enabled: true, rollout: 100 } }));
  for (let i = 0; i < 200; i++) {
    assert.equal(none.isOn('priority_labels', `gh:${i}`), false);
    assert.equal(all.isOn('priority_labels', `gh:${i}`), true);
  }
});

test('anonymous visitors (no user id) only get a flag at 100% rollout', () => {
  const partial = createFlagStore(tempFlags({ dark_mode: { enabled: true, rollout: 99 } }));
  const full = createFlagStore(tempFlags({ dark_mode: { enabled: true, rollout: 100 } }));
  assert.equal(partial.isOn('dark_mode', undefined), false);
  assert.equal(partial.isOn('dark_mode', null), false);
  assert.equal(full.isOn('dark_mode', undefined), true);
});

test('update validates input', () => {
  const store = createFlagStore(tempFlags({ dark_mode: { enabled: true, rollout: 100 } }));
  assert.throws(() => store.update('dark_mode', { rollout: 150 }), /rollout/);
  assert.throws(() => store.update('dark_mode', { rollout: -1 }), /rollout/);
  assert.throws(() => store.update('dark_mode', { rollout: 12.5 }), /rollout/);
  assert.throws(() => store.update('dark_mode', { enabled: 'yes' }), /enabled/);
  assert.throws(() => store.update('not_a_flag', { enabled: true }), /unknown flag/);
  // a rejected update must not change the stored flag
  assert.deepEqual(store.getConfig().dark_mode, { enabled: true, rollout: 100 });
});

test('update persists to disk and keeps the other fields', () => {
  const file = tempFlags({ dark_mode: { enabled: true, rollout: 100, description: 'Dark theme' } });
  const store = createFlagStore(file);
  store.update('dark_mode', { rollout: 25 });
  assert.deepEqual(store.getConfig().dark_mode, { enabled: true, rollout: 25, description: 'Dark theme' });
  // a fresh store reads the new value back from the file
  assert.deepEqual(createFlagStore(file).getConfig().dark_mode, { enabled: true, rollout: 25, description: 'Dark theme' });
});

test('getConfig returns a copy, so callers cannot mutate the flag state', () => {
  const store = createFlagStore(tempFlags({ priority_labels: { enabled: false, rollout: 0 } }));
  const config = store.getConfig();
  config.priority_labels.enabled = true;
  config.priority_labels.rollout = 100;
  assert.equal(store.isOn('priority_labels', 'gh:2002'), false);
  assert.equal(store.getConfig().priority_labels.enabled, false);
});
