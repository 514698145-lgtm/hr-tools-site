// Isolated integration drill. Never opens the production data directory.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp, mkdir, readFile, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRuntimeServer} from '../scripts/runtime-server.mjs';
import {placements} from '../public/assets/relax-engine.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const python = process.env.HR_TEST_PYTHON || (process.platform === 'win32' ? path.join(root, '.venv/Scripts/python.exe') : 'python3');
const directory = await mkdtemp(path.join(os.tmpdir(), 'hr-restore-drill-'));
const data = path.join(directory, 'source'), restored = path.join(directory, 'restored');
const archive = path.join(directory, 'runtime.tar.gz');
const origin = 'https://hrtoolkit.cn', password = 'isolated-drill-only';
let server, base;
const start = async store => {
  server = await createRuntimeServer({origin, directory: store, password});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
};
const stop = async () => {
  if (server) {server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); server = null;}
};
const call = async (route, body, cookie = '') => {
  const response = await fetch(base + route, {method: body === undefined ? 'GET' : 'POST',
    headers: {'Content-Type': 'application/json', Origin: origin, Cookie: cookie},
    body: body === undefined ? undefined : JSON.stringify(body)});
  const value = await response.json();
  assert.ok(response.ok, JSON.stringify(value));
  return {value, cookie: response.headers.get('set-cookie')?.split(';')[0]};
};
const archiveCommand = (...args) => {
  const result = spawnSync(python, [path.join(root, 'scripts/runtime_archive.py'), ...args], {encoding: 'utf8'});
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return JSON.parse(result.stdout);
};
try {
  await mkdir(data, {mode: 0o700});
  await start(data);
  const user = await call('/api/identity', {});
  const item = (await call('/api/feedback', {tool: 'income-tax', message: '隔离恢复演练，非真实用户反馈'}, user.cookie)).value.item;
  const admin = await call('/api/admin/login', {password});
  await call('/api/admin/feedback', {id: item.id, action: 'reply', message: '隔离演练回复'}, admin.cookie);
  await call('/api/admin/feedback', {id: item.id, action: 'status', status: '已解决'}, admin.cookie);
  const run = (await call('/api/game/start', {}, user.cookie)).value.run;
  let action;
  for (let slot = 0; slot < 3 && !action; slot++) {
    const where = placements(run.state, run.state.rack[slot])[0];
    if (where) action = {type: 'place', slot, x: where[0], y: where[1]};
  }
  assert.ok(action);
  await call('/api/game/sync', {id: run.id, seq: 0, actions: [action], finish: true}, user.cookie);
  const beforeMe = (await call('/api/me', undefined, user.cookie)).value;
  const beforeBoard = (await call('/api/game/board', undefined, user.cookie)).value;
  assert.equal(beforeBoard.items.length, 1);
  await stop();
  archiveCommand('snapshot', data, archive);
  const inspected = archiveCommand('inspect', archive);
  const recovered = archiveCommand('restore', archive, restored);
  assert.equal(inspected.checksumsVerified, true);
  assert.equal(recovered.checksumsVerified, true);
  for (const file of ['feedback.json', 'game.json']) {
    assert.deepEqual(await readFile(path.join(data, file)), await readFile(path.join(restored, file)));
  }
  await start(restored);
  assert.deepEqual((await call('/api/me', undefined, user.cookie)).value, beforeMe);
  const board = (await call('/api/game/board', undefined, user.cookie)).value;
  assert.deepEqual(board.items, beforeBoard.items);
  assert.deepEqual(board.mine, beforeBoard.mine);
  const oldSession = await fetch(base + '/api/admin/feedback', {headers: {Cookie: admin.cookie}});
  assert.equal(oldSession.status, 401);
  const freshAdmin = await call('/api/admin/login', {password});
  assert.equal((await call('/api/admin/feedback', undefined, freshAdmin.cookie)).value.items[0].status, '已解决');
  console.log(JSON.stringify({ok: true, isolated: true, checksumsVerified: true,
    identityPreserved: true, repliesAndUnreadPreserved: true, rankingPreserved: true,
    oldAdminSessionRejected: true, adminCanLoginAgain: true}));
} finally {
  await stop();
  if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) || !path.basename(directory).startsWith('hr-restore-drill-')) {
    throw Error('Unexpected cleanup directory');
  }
  await rm(directory, {recursive: true, force: true});
}
