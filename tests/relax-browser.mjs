import {createRequire} from 'node:module';
import {mkdtemp,readFile,rm,mkdir,writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createFeedbackApi} from '../scripts/feedback-api.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const directory=await mkdtemp(path.join(os.tmpdir(),'hr-relax-ui-')),password='temporary-test-password';
const api=await createFeedbackApi({directory,password}),root=path.resolve('dist');
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(await api(req,res,url,['relax']))return;try{let f=path.resolve(root,'.'+url.pathname);if(f!==root&&!f.startsWith(root+path.sep))throw Error();if(url.pathname.endsWith('/'))f=path.join(f,'index.html');const data=await readFile(f);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2'}[path.extname(f)]||'application/octet-stream')});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:'msedge'}),context=await browser.newContext({viewport:{width:1440,height:1100}}),p=await context.newPage(),errors=[],checks=[];
p.on('pageerror',e=>errors.push(e.message));
const stored=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('hr-relax-v1')));
const ready=()=>p.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('hr-relax-v1'));return s?.run&&!s.pending;});
try{
 await p.goto(base+'/');assert.equal(await p.locator('.resource-card[href="/relax/"]').count(),1);await p.locator('.resource-card[href="/relax/"]').click();await p.locator('#game-start').click();await ready();
 const initial=await stored();await p.locator('[data-slot="0"]').click();await p.locator('[data-cell="0"]').click();await ready();assert.ok((await stored()).run.state.score>0);
 await p.route('**/api/game/sync',async route=>{await route.fetch();await route.abort();},{times:1});
 const retryAction=await p.evaluate(async()=>{const {placements}=await import('/assets/relax-engine.js');const s=JSON.parse(localStorage.getItem('hr-relax-v1')).run.state;const slot=s.rack.findIndex(Boolean),pos=placements(s,s.rack[slot])[0];return {slot,x:pos[0],y:pos[1]};});
 await p.locator(`[data-slot="${retryAction.slot}"]`).click();await p.locator(`[data-cell="${retryAction.y*8+retryAction.x}"]`).click();await p.locator('#game-retry').waitFor();await p.locator('#game-retry').click();await ready();assert.equal((await stored()).run.state.moves,2);checks.push('lost response retries idempotently without duplicating a move');
 const score=(await stored()).run.state.score;await p.locator('#game-pause').click();await p.locator('#game-resume').waitFor();await p.reload();await p.locator('#game-resume').waitFor();assert.equal((await stored()).run.state.score,score);await p.locator('#game-resume').click();checks.push('homepage entry, click placement, pause/reload preserves exact run');
 await p.locator('[data-slot]').first().click();await p.locator('#game-hold').click();await ready();assert.ok((await stored()).run.state.hold);assert.equal((await stored()).run.state.group,2);checks.push('holding the final piece deals next group');
 // Drag a legal block to a legal anchor, determined from current state.
 const action=await p.evaluate(async()=>{const {placements}=await import('/assets/relax-engine.js');const s=JSON.parse(localStorage.getItem('hr-relax-v1')).run.state;for(let slot=0;slot<4;slot++){const positions=placements(s,slot===3?s.hold:s.rack[slot]);if(positions.length)return {slot,x:positions[0][0],y:positions[0][1]};}});
 const source=await p.locator(`[data-slot="${action.slot}"]`).boundingBox(),dest=await p.locator(`[data-cell="${action.y*8+action.x}"]`).boundingBox();await p.mouse.move(source.x+source.width/2,source.y+source.height/2);await p.mouse.down();await p.mouse.move(dest.x+dest.width/2,dest.y+dest.height/2,{steps:8});await p.mouse.up();await ready();assert.equal((await stored()).run.state.moves,3);checks.push('pointer drag placement');
 await p.screenshot({path:'reports/relax-desktop.png',fullPage:true});
 await p.keyboard.press('Escape');await p.waitForURL(base+'/');await p.goto(base+'/relax/');await p.locator('#game-resume').click();assert.equal((await stored()).run.state.moves,3);checks.push('Escape returns to hall and run can resume');
 // A separate identity receives the score through the event stream without reloading.
 const c2=await browser.newContext(),q=await c2.newPage();await q.goto(base+'/relax/');await p.bringToFront();if(await p.locator('#game-resume').isVisible())await p.locator('#game-resume').click();await p.locator('#game-finish').click();await p.locator('#game-confirm-finish').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('hr-relax-v1')).run.finished);await q.locator('#game-ranking li b').waitFor();assert.equal(await q.locator('#game-ranking li b').count(),1);checks.push('verified score delivered to second browser by SSE');
 await p.goto(base+'/admin/game/');await p.locator('[name=password]').fill(password);await p.locator('.relax-admin-login button').click();await p.locator('[data-action=revoke]').click();await q.locator('.rank-empty').waitFor();await p.locator('[data-action=restore]').click();await q.locator('#game-ranking li b').waitFor();checks.push('admin login, revoke and restore update live board');await c2.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),m=await mobile.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto(base+'/relax/');await m.locator('#game-start').tap();await m.waitForFunction(()=>JSON.parse(localStorage.getItem('hr-relax-v1'))?.run);await m.locator('[data-slot="0"]').tap();await m.locator('[data-cell="0"]').tap();await m.waitForFunction(()=>JSON.parse(localStorage.getItem('hr-relax-v1'))?.run.state.moves===1);assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await m.locator('#game-rank-details').getAttribute('open'),null);await m.screenshot({path:'reports/relax-mobile.png',fullPage:true});checks.push('390px touch placement and no horizontal overflow');
 assert.deepEqual(errors,[]);await mkdir('reports',{recursive:true});await writeFile('reports/relax-review.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(directory,{recursive:true,force:true});}
