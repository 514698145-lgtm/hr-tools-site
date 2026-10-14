import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {reduceObservation,policyIssues,runWatch,publicAddress,visibleText,relevantLinks} from '../scripts/policy-watch.mjs';

test('failed fetch never erases pending changes or becomes a verified baseline',()=>{
 let x=reduceObservation({}, {digest:'a'},'2026-10-01');assert.equal(x.status,'baseline');
 x=reduceObservation(x,{digest:'b'},'2026-10-02');assert.equal(x.pending,true);
 x=reduceObservation(x,{error:'http-403'},'2026-10-03');assert.equal(x.digest,'b');assert.equal(x.pending,true);assert.equal(x.status,'failed');
 x=reduceObservation(x,{digest:'b'},'2026-10-04');assert.equal(x.pending,true);assert.equal(x.status,'unchanged');
});
test('historical, future and unofficial repost numbers do not mask current gaps',()=>{
 const r=(from,to,values,status='已核验')=>({city:'测试市',from,to,values,status,source:{url:'https://example.com/'}});
 const rows=[r('2025-01','2025-12',{pensionMin:10}),r('2027-01','2027-12',{pensionMin:20}),r('2026-01','2026-12',{fundMax:30},'转载待复核'),r('2026-01','2026-10',{pensionP:8})];
 const issues=policyIssues(rows,new Date('2026-10-14T01:00:00Z'));
 assert.ok(issues.some(x=>x.field==='pensionMin'&&x.status==='no-current-value'));
 assert.ok(issues.some(x=>x.field==='fundMax'&&x.status==='coverage-gap'));
 assert.ok(issues.some(x=>x.field==='pensionP'&&x.status==='expires-soon'));
});
test('crawler strips script noise, identifies policy links and refuses private addresses',()=>{
 assert.equal(visibleText('<script>random 123</script><p>缴费 基数</p>'),'缴费 基数');
 assert.equal(relevantLinks('<a href="/news/1">缴费基数调整通知</a><a href="/login">登录</a>','https://www.gov.cn/')[0].url,'https://www.gov.cn/news/1');
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.2.1','192.168.1.2','::1','::ffff:127.0.0.1','fc00::1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('8.8.8.8'),true);
});
test('persistent runs distinguish baseline/change/failure and require exact reviewed digest',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'hr-policy-watch-'));
 const source={url:'https://www.gov.cn/',files:['content/policies/a.md'],discovery:true};
 const manifest={sources:[source],files:[{path:'a'}],reviews:[],policyRecords:[],discoveryTasks:[]};
 try{
   await runWatch({manifest,stateDir:dir,fetcher:async()=>({digest:'a',links:[]})});
   let r=await runWatch({manifest,stateDir:dir,fetcher:async()=>({digest:'b',links:[]})});assert.equal(r.summary.pending,1);
   r=await runWatch({manifest,stateDir:dir,fetcher:async()=>{throw Error('network failure');}});assert.equal(r.summary.failures,1);assert.equal(r.summary.pending,1);
   await writeFile(path.join(dir,'reviewed.json'),JSON.stringify({sources:{[source.url]:{digest:'a',reviewedAt:'2026-10-14',evidence:'official notice reviewed'}}}));
   r=await runWatch({manifest,stateDir:dir,fetcher:async()=>({digest:'b',links:[]})});assert.equal(r.summary.pending,1);
   await writeFile(path.join(dir,'reviewed.json'),JSON.stringify({sources:{[source.url]:{digest:'b',reviewedAt:'2026-10-14',evidence:'official notice reviewed'}}}));
   r=await runWatch({manifest,stateDir:dir,fetcher:async()=>({digest:'b',links:[]})});assert.equal(r.summary.pending,0);
   assert.equal(JSON.parse(await readFile(path.join(dir,'latest.json'),'utf8')).summary.sources,1);
 }finally{await rm(dir,{recursive:true,force:true});}
});
