import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'}),ctx=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),p=await ctx.newPage();
const errors=[];p.on('pageerror',e=>errors.push(e.message));
const base=process.env.TRIAL_URL||'http://127.0.0.1:4321';
try{
 await p.goto(base+'/enterprise-services/');await p.locator('.enterprise-card').first().waitFor();assert.equal(await p.locator('.enterprise-card').count(),5);assert.equal(await p.locator('form').count(),0);assert.equal(await p.locator('.contact-details a').count(),0);
 await p.screenshot({path:'reports/services-desktop.png',fullPage:true});
 for(const w of [360,390,768,1024,1440]){await p.setViewportSize({width:w,height:950});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+w);if(w===390)await p.screenshot({path:'reports/services-mobile.png',fullPage:true});}
 const consultation=p.getByRole('link',{name:'联系咨询',exact:true});assert.equal(await consultation.getAttribute('href'),'https://u5n7cbfm.jsjform.com/f/NRMKJD');assert.equal(await consultation.getAttribute('target'),'_blank');
 for(const route of ['/','/workspace/','/templates/','/policies/','/insights/','/contract-reminders/','/feedback/','/tools/five-insurances-housing-fund/']){const r=await p.goto(base+route);assert.equal(r.status(),200,route);}
 await p.goto(base+'/tools/take-home-pay/');for(const [k,v]of Object.entries({salary:10000,social:1000,fund:500,tax:100}))await p.locator(`[name=${k}]`).fill(String(v));await p.getByRole('button',{name:'开始计算',exact:true}).click();assert.ok((await p.locator('.result-total').innerText()).includes('8,400.00'));await p.locator('#save-result').click();
 await p.goto(base+'/tools/employment-cost/?mode=batch');const csv='员工,人均月工资,人均单位社保,人均单位公积金,人均其他月支出,人数,测算月数\n示例,10000,2000,700,300,10,12';await p.locator('#batch-file').setInputFiles({name:'test.csv',mimeType:'text/csv',buffer:Buffer.from('\ufeff'+csv)});await p.locator('[data-map=salary]').waitFor({state:'attached'});await p.locator('#run-batch').click();assert.ok((await p.locator('#batch-output').innerText()).includes('1,560,000.00'));const d=p.waitForEvent('download');await p.locator('#batch-export').click();assert.ok((await d).suggestedFilename().endsWith('.xlsx'));
 await p.goto(base+'/relax/');await p.locator('#game-start').click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('hr-relax-v1'))?.run);await p.locator('[data-slot="0"]').click();await p.locator('[data-cell="0"]').click();await p.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('hr-relax-v1'));return s?.run?.seq===1&&!s.pending;});
 assert.equal((await ctx.request.get(base+'/api/game/board')).status(),200);
 if(process.env.TRIAL_URL){
 for(const route of ['/admin/feedback/','/admin/game/','/api/admin/feedback','/.local/admin-password.txt','/%61dmin/feedback/'])assert.equal((await ctx.request.get(base+route)).status(),404,route);
 const bad=await ctx.request.post(base+'/api/identity',{headers:{Origin:'https://other.invalid'},data:{}});assert.equal(bad.status(),403);
 const cookies=await ctx.cookies();assert.ok(cookies.some(c=>c.name==='hr_anon'&&c.secure&&c.httpOnly));
 }
 assert.deepEqual(errors,[]);console.log('Enterprise responsive layout and contact links; site routes; single and batch calculation/export; anonymous identity; game sync; public admin isolation and origin checks passed.');
}finally{await browser.close();}
