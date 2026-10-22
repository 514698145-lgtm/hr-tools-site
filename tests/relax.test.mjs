import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createGame,applyAction,placements,fullLines} from '../public/assets/relax-engine.js';
import {createFeedbackApi} from '../scripts/feedback-api.mjs';
import {createGameApi,gameDay} from '../scripts/game-api.mjs';
const move=s=>{for(let slot=0;slot<4;slot++){const p=slot===3?s.hold:s.rack[slot],where=placements(s,p)[0];if(where)return {type:'place',slot,x:where[0],y:where[1]};}return null;};
test('random runs, deterministic replay, legal moves, hold, and increasing difficulty',()=>{
 const a=createGame(42),b=createGame(99);assert.notDeepEqual(a.rack,b.rack);assert.deepEqual(a,createGame(42));
 const held=applyAction(a,{type:'hold',slot:0});assert.deepEqual(held.hold,a.rack[0]);assert.equal(held.score,0);assert.throws(()=>applyAction(held,{type:'hold',slot:1}));
 assert.throws(()=>applyAction(a,{type:'place',slot:0,x:8,y:0}));assert.throws(()=>applyAction(a,{type:'place',slot:0,x:.2,y:0}));
 let s=a,t=createGame(42);for(let i=0;i<25&&!s.over;i++){const action=move(s);s=applyAction(s,action);t=applyAction(t,action);}assert.deepEqual(s,t);assert.equal(a.score,0);
 const high=createGame(2);high.group=60;high.rack=[{cells:[[0,0]],color:1},null,null];const advanced=applyAction(high,{type:'place',slot:0,x:0,y:0});assert.equal(advanced.level,7);assert.equal(advanced.rack.length,3);
 const nextRush=createGame(4);nextRush.group=nextRush.nextRush-1;nextRush.rack=[{cells:[[0,0]],color:1},null,null];assert.equal(applyAction(nextRush,{type:'place',slot:0,x:0,y:0}).rush,true);
});
test('simultaneous lines, combo, clear board and terminal scoring',()=>{
 const s=createGame(8);s.board.fill(0);for(let i=1;i<8;i++){s.board[i]=2;s.board[i*8]=3;}s.rack=[{cells:[[0,0]],color:1},null,null];
 const end=applyAction(s,{type:'place',slot:0,x:0,y:0});assert.equal(end.lines,2);assert.equal(end.score,701);assert.equal(end.lastClear.length,15);assert.ok(end.board.every(x=>!x));
 assert.equal(fullLines(Array(64).fill(1)).count,16);
 const combo=createGame(2);combo.board.fill(0);for(let i=0;i<7;i++)combo.board[i]=1;combo.board[63]=2;combo.rack[0]={cells:[[0,0]],color:1};combo.combo=8;assert.equal(applyAction(combo,{type:'place',slot:0,x:7,y:0}).lastGain,201);
 const dead=createGame(3);dead.board.fill(1);dead.board[0]=0;dead.rack=[{cells:[[0,0],[1,0]],color:1},null,null];dead.over=true;assert.throws(()=>applyAction(dead,{type:'hold',slot:0}));
});
test('authenticated scores, replay validation, idempotency, ranks, SSE, admin and restart',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'hr-game-'));let server,reader;
 try{
  let handler=await createFeedbackApi({directory:dir,password:'test-password'});
  server=http.createServer((req,res)=>handler(req,res,new URL(req.url,'http://localhost'),[]));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const req=(route,body,cookie='',otherOrigin=false)=>fetch(origin+route,{method:body===undefined?'GET':'POST',headers:{Origin:otherOrigin?'http://other.test':origin,Cookie:cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const json=async(route,body,cookie)=>{const r=await req(route,body,cookie);assert.equal(r.ok,true,await r.clone().text());return r.json();};
  const identity=async()=>{const r=await req('/api/identity',{});return r.headers.get('set-cookie').split(';')[0];};
  const a=await identity(),b=await identity();assert.equal((await req('/api/game/start',{})).status,400);assert.equal((await req('/api/game/start',{},a,true)).status,403);
  let ar=(await json('/api/game/start',{},a)).run;assert.deepEqual(ar,(await json('/api/game/start',{},a)).run);
  assert.equal((await req('/api/game/sync',{id:ar.id,seq:0,actions:[],finish:true},b)).status,400);
  assert.equal((await req('/api/game/sync',{id:ar.id,seq:0,actions:[{type:'place',slot:0,x:100,y:0}],finish:false},a)).status,400);
  const stream=await req('/api/game/events');reader=stream.body.getReader();assert.match(new TextDecoder().decode((await reader.read()).value),/event: change/);
  const action=move(ar.state),expected=applyAction(ar.state,action);const body={id:ar.id,seq:0,actions:[action],finish:true,score:999999};
  const first=await json('/api/game/sync',body,a);assert.equal(first.run.state.score,expected.score);assert.equal(first.run.ranked,true);
  assert.deepEqual(first.run,(await json('/api/game/sync',body,a)).run);assert.match(new TextDecoder().decode((await reader.read()).value),/event: change/);
  await json('/api/identity',{name:'排行榜新昵称'},a);assert.match(new TextDecoder().decode((await reader.read()).value),/event: change/);
  assert.equal((await json('/api/game/board',undefined,a)).items[0].person.name,'排行榜新昵称');
  await reader.cancel();reader=null;
  let board=await json('/api/game/board',undefined,a);assert.equal(board.items.length,1);assert.equal(board.mine.rank,1);assert.equal((await json('/api/game/board',undefined,b)).mine,null);
  const current=(await json('/api/game/start',{},a)).run;assert.notEqual(ar.id,current.id);assert.notEqual(ar.state.rng,current.state.rng);
  await json('/api/game/sync',{id:current.id,seq:0,actions:[],finish:true},a);assert.equal((await json('/api/game/board',undefined,a)).items.length,1);
  assert.equal((await req('/api/admin/game')).status,401);const login=await req('/api/admin/login',{password:'test-password'});const admin=login.headers.get('set-cookie').split(';')[0];
  await json('/api/admin/game',{id:ar.id,action:'revoke'},admin);assert.equal((await json('/api/game/board')).items.length,0);
  await json('/api/admin/game',{id:ar.id,action:'restore'},admin);assert.equal((await json('/api/game/board')).items.length,1);
  handler=await createFeedbackApi({directory:dir,password:'test-password'});assert.equal((await json('/api/game/board',undefined,a)).mine.score,expected.score);assert.equal((await req('/api/admin/game',undefined,admin)).status,401);
  const db=JSON.parse(await readFile(path.join(dir,'game.json'),'utf8'));assert.equal(db.runs[0].state.score,expected.score);
 }finally{if(reader)await reader.cancel();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await rm(dir,{recursive:true,force:true});}
});
test('Shanghai midnight seals previous day, same score shares rank, only top 20',async()=>{
 assert.equal(gameDay(Date.parse('2026-10-04T15:59:59Z')),'2026-10-04');assert.equal(gameDay(Date.parse('2026-10-04T16:00:00Z')),'2026-10-05');
 const dir=await mkdtemp(path.join(os.tmpdir(),'hr-game-date-'));let time=Date.parse('2026-10-04T15:59:00Z');
 try{const handler=await createGameApi({directory:dir,person:id=>({id,name:'HR'}),now:()=>time});
 const call=async(route,body,user='user')=>{let result;await handler({req:{method:body===undefined?'GET':'POST'},res:{},url:new URL(route,'http://localhost'),body,user:{id:user},admin:false,send:(_,status,data)=>{assert.equal(status<400,true);result=data;},requireUser:()=>{},throttle:()=>{}});return result;};
 const r=(await call('/api/game/start',{})).run;time+=120000;
 const finished=await call('/api/game/sync',{id:r.id,seq:0,actions:[move(r.state)],finish:true});assert.equal(finished.run.ranked,false);assert.equal((await call('/api/game/board')).items.length,0);
 for(let i=0;i<22;i++){const run=(await call('/api/game/start',{},'u'+i)).run;await call('/api/game/sync',{id:run.id,seq:0,actions:[move(run.state)],finish:true},'u'+i);}
 const board=await call('/api/game/board');assert.equal(board.items.length,20);assert.equal(board.total,22);for(let i=1;i<20;i++)if(board.items[i].score===board.items[i-1].score)assert.equal(board.items[i].rank,board.items[i-1].rank);
 }finally{await rm(dir,{recursive:true,force:true});}
});
