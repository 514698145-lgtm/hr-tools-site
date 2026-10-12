import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRuntimeServer, validateOrigin} from '../scripts/runtime-server.mjs';

test('production API requires HTTPS, serves no files, and preserves origin/cookie protections', async () => {
  for (const value of ['http://example.com','https://localhost','https://example.com/api/','https://example.com/?x=1']) {
    assert.throws(() => validateOrigin(value));
  }
  const directory = await mkdtemp(path.join(os.tmpdir(), 'hr-runtime-'));
  const origin = 'https://hr-tools.example';
  const server = await createRuntimeServer({origin, directory, password:'test-only-password'});
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    assert.equal(server.address().address, '127.0.0.1');
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(base+'/healthz');
    assert.deepEqual(await health.json(), {ok:true});
    assert.equal(health.headers.get('cache-control'), 'no-store');
    assert.equal((await fetch(base+'/admin-password.txt')).status,404);
    assert.equal((await fetch(base+'/config/tools.json')).status,404);
    assert.equal((await fetch(base+'/api/admin/feedback')).status,401);
    const post = source => fetch(base+'/api/identity',{method:'POST',
      headers:{Origin:source,'Content-Type':'application/json'},body:'{}'});
    assert.equal((await post('https://other.example')).status,403);
    const identity = await post(origin);
    assert.equal(identity.status,201);
    assert.match(identity.headers.get('set-cookie'), /; Secure/);
    assert.match(identity.headers.get('set-cookie'), /HttpOnly/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(directory,{recursive:true,force:true});
  }
});
