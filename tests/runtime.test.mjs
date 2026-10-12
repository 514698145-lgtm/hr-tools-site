import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, symlink, unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
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

test('runtime starts when current release directory is a symlink', {skip:process.platform==='win32'}, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'hr-runtime-entry-'));
  const link = path.join(directory,'current');
  await symlink(fileURLToPath(new URL('../',import.meta.url)),link,'dir');
  const probe = http.createServer();
  await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
  const port=probe.address().port;
  await new Promise(resolve=>probe.close(resolve));
  const child=spawn(process.execPath,[path.join(link,'scripts/runtime-server.mjs')],{
    env:{...process.env,PORT:String(port),HR_PUBLIC_ORIGIN:'https://hr-tools.example',
      FEEDBACK_DATA_DIR:path.join(directory,'data'),HR_ADMIN_PASSWORD:'test-only-password'},
    stdio:['ignore','pipe','pipe']});
  try {
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(Error('Runtime did not start')),10000);
      child.once('error',e=>{clearTimeout(timer);reject(e);});
      child.once('exit',code=>{clearTimeout(timer);reject(Error('Early runtime exit '+code));});
      child.stdout.on('data',data=>{if(String(data).includes('HR runtime listening')){clearTimeout(timer);resolve();}});
    });
    assert.deepEqual(await (await fetch(`http://127.0.0.1:${port}/healthz`)).json(),{ok:true});
  } finally {
    if(child.exitCode===null){await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}
    await unlink(link);
    await rm(directory,{recursive:true,force:true});
  }
});
