import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createFeedbackApi} from '../scripts/feedback-api.mjs';

test('anonymous identities, moderation, notifications, persistence and legacy migration',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'hr-feedback-'));let server;
 try{
  await writeFile(path.join(dir,'feedback.json'),JSON.stringify([{id:'legacy',tool:'income-tax',message:'旧留言保留',createdAt:new Date().toISOString(),hidden:false,replies:[{message:'旧官方回复',createdAt:new Date().toISOString()}]}]));
  let api=await createFeedbackApi({directory:dir,password:'test-only-password'});server=http.createServer((req,res)=>api(req,res,new URL(req.url,'http://localhost'),['income-tax']));await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  const call=(route,body,cookie='',cross=false)=>fetch(origin+route,{method:body!==undefined?'POST':'GET',headers:{'Content-Type':'application/json',Origin:cross?'http://other.test':origin,Cookie:cookie},body:body!==undefined?JSON.stringify(body):undefined});
  const json=async(route,body,cookie)=>{const r=await call(route,body,cookie);assert.ok(r.ok,await r.clone().text());return r.json();};
  const identity=async()=>{const r=await call('/api/identity',{});return {cookie:r.headers.get('set-cookie').split(';')[0],body:await r.json()};};
  assert.equal((await call('/api/admin/feedback')).status,401);assert.equal((await call('/api/identity',{},'',true)).status,403);assert.equal((await call('/api/feedback',{tool:'income-tax',message:'无身份不能发'})).status,400);
  const a=await identity(),b=await identity();assert.notEqual(a.body.identity.id,b.body.identity.id);assert.notEqual(a.body.identity.name,b.body.identity.name);assert.ok(a.body.identity.name.includes(a.body.identity.id));assert.ok(!JSON.stringify(a.body).includes('tokenHash'));
  assert.deepEqual((await json('/api/identity',{},a.cookie)).identity,a.body.identity);
  assert.equal((await call('/api/identity',{name:b.body.identity.name},a.cookie)).status,400);
  assert.equal((await call('/api/identity',{name:'官方客服'},a.cookie)).status,400);await json('/api/identity',{name:'薪资小能手'},a.cookie);
  const item=(await json('/api/feedback',{tool:'income-tax',category:'功能建议',message:'希望增加批量说明 <img src=x onerror=alert(1)>',author:b.body.identity.id},a.cookie)).item;
  assert.equal(item.author.id,a.body.identity.id);assert.equal(item.author.name,'薪资小能手');
  await Promise.all(Array.from({length:3},()=>json('/api/feedback/like',{id:item.id,liked:true},b.cookie)));
  let rows=(await json('/api/feedback?tool=income-tax',undefined,a.cookie)).items;assert.equal(rows[0].likeCount,1);assert.equal(rows[0].liked,false);assert.equal(rows[0].hidden,undefined);assert.equal(rows[0].reportCount,undefined);
  await json('/api/feedback/comment',{id:item.id,message:'我也遇到了这个问题',role:'admin'},b.cookie);
  let am=await json('/api/me',undefined,a.cookie);assert.equal(am.unread,1);assert.equal(am.items[0].replies[0].role,'user');assert.equal((await json('/api/me',undefined,b.cookie)).unread,0);
  await json('/api/notifications/read',{ids:am.notifications.map(x=>x.id)},b.cookie);assert.equal((await json('/api/me',undefined,a.cookie)).unread,1);
  const login=await call('/api/admin/login',{password:'test-only-password'}),admin=login.headers.get('set-cookie').split(';')[0];assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
  const replyId=am.items[0].replies[0].id;
  await json('/api/admin/feedback',{id:item.id,action:'reply',message:'已经收到，正在改进',replyTo:replyId},admin);
  await json('/api/admin/feedback',{id:item.id,action:'status',status:'处理中'},admin);
  assert.equal((await json('/api/me',undefined,a.cookie)).unread,3);assert.equal((await json('/api/me',undefined,b.cookie)).unread,2);
  await json('/api/feedback/report',{id:item.id,replyId},a.cookie);await json('/api/feedback/report',{id:item.id,replyId},a.cookie);
  assert.equal((await json('/api/admin/feedback',undefined,admin)).items[0].replies[0].reportCount,1);
  await json('/api/admin/feedback',{id:item.id,action:'hide',replyId},admin);rows=(await json('/api/feedback?tool=income-tax')).items;assert.equal(rows[0].replies.length,1);assert.equal(rows[0].replies[0].role,'admin');
  assert.equal((await call('/api/feedback/comment',{id:item.id,message:'引用隐藏评论',replyTo:replyId},b.cookie)).status,400);
  await json('/api/admin/feedback',{id:item.id,action:'hide'},admin);assert.equal((await json('/api/me',undefined,a.cookie)).unread,0);assert.equal((await call('/api/feedback/like',{id:item.id,liked:true},b.cookie)).status,400);
  await json('/api/admin/feedback',{id:item.id,action:'restore'},admin);
  api=await createFeedbackApi({directory:dir,password:'test-only-password'});assert.equal((await call('/api/admin/feedback',undefined,admin)).status,401);am=await json('/api/me',undefined,a.cookie);assert.equal(am.identity.id,a.body.identity.id);assert.equal(am.identity.name,'薪资小能手');assert.equal(am.items[0].status,'处理中');
  await json('/api/notifications/read',{ids:am.notifications.map(x=>x.id)},a.cookie);assert.equal((await json('/api/me?summary=1',undefined,a.cookie)).unread,0);
  const legacy=(await json('/api/feedback?tool=income-tax')).items.find(x=>x.id==='legacy');assert.equal(legacy.replies[0].role,'admin');assert.equal(legacy.author.name,'早期匿名用户');
  const stored=JSON.parse(await readFile(path.join(dir,'feedback.json'),'utf8'));assert.equal(stored.version,2);assert.ok(stored.users.every(u=>u.tokenHash.length===64));assert.ok(!JSON.stringify(stored).includes(a.cookie.split('=')[1]));
 }finally{if(server)await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});

test('legacy defaults migrate once, chosen names survive, and concurrent visitors get distinct persistent names',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'hr-names-'));let server;
 try{
  const users=['认真工作的HR','认真工作的HR','我的自选昵称'].map((name,i)=>({id:'user-'+i,publicId:'ABC0000'+i,name,tokenHash:createHash('sha256').update('test-token-'+i).digest('hex'),createdAt:'2026-01-01T00:00:00Z'}));
  await writeFile(path.join(dir,'feedback.json'),JSON.stringify({version:2,users,items:[],events:[]}));
  let handler=await createFeedbackApi({directory:dir,password:'test-only-password'});
  server=http.createServer((req,res)=>handler(req,res,new URL(req.url,'http://localhost'),[]));await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  const identity=async(cookie='',body={})=>{const response=await fetch(origin+'/api/identity',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});return {status:response.status,cookie:response.headers.get('set-cookie')?.split(';')[0],data:await response.json()};};
  const a=await identity('hr_anon=test-token-0'),b=await identity('hr_anon=test-token-1'),custom=await identity('hr_anon=test-token-2');
  assert.notEqual(a.data.identity.name,b.data.identity.name);assert.notEqual(a.data.identity.name,'认真工作的HR');assert.equal(custom.data.identity.name,'我的自选昵称');
  const visitors=await Promise.all(Array.from({length:10},()=>identity()));
  assert.ok(visitors.every(v=>v.status===201&&v.data.identity.name.length<=18));
  assert.equal(new Set(visitors.map(v=>v.data.identity.name)).size,10);
  const rename=await Promise.all([identity(visitors[0].cookie,{name:'并发自选昵称'}),identity(visitors[1].cookie,{name:'并发自选昵称'})]);
  assert.deepEqual(rename.map(x=>x.status).sort(),[200,400]);
  handler=await createFeedbackApi({directory:dir,password:'test-only-password'});
  assert.deepEqual((await identity('hr_anon=test-token-0')).data.identity,a.data.identity);
  const stored=JSON.parse(await readFile(path.join(dir,'feedback.json'),'utf8'));
  assert.equal(stored.users[0].id,users[0].id);assert.equal(stored.users[0].tokenHash,users[0].tokenHash);assert.equal(stored.users[2].name,users[2].name);
 }finally{if(server)await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
