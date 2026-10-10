import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const ctx=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});
const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4321/workspace/');await page.locator('.desk-hero').waitFor();
 await page.screenshot({path:'reports/workspace-empty.png',fullPage:true});
 await page.goto('http://127.0.0.1:4321/tools/take-home-pay/');
 for(const [k,v] of Object.entries({salary:10000,social:1000,fund:500,tax:100}))await page.locator(`[name="${k}"]`).fill(String(v));
 await page.getByRole('button',{name:'开始计算',exact:true}).click();await page.locator('#save-result').click();
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('hr-workspace-v1'));const r=s.records[0];s.favorites=['five-insurances-housing-fund','income-tax','take-home-pay','employment-cost'];s.records=Array.from({length:8},(_,i)=>({...r,id:'qa'+i,title:'实发工资计算 · 示例员工 '+(i+1)}));s.records.push({id:'batchqa',title:'薪酬批量计算',type:'batch',toolId:r.toolId,at:r.at,batch:[]});localStorage.setItem('hr-workspace-v1',JSON.stringify(s));});
 await page.goto('http://127.0.0.1:4321/workspace/');await page.locator('.desk-tool').first().waitFor();assert.equal(await page.locator('.desk-record').count(),6);
 await page.locator('#desk-more').click();assert.equal(await page.locator('.desk-record').count(),9);
 await page.locator('[data-record-filter=batch]').click();assert.equal(await page.locator('.desk-record').count(),1);
 await page.locator('[data-record-filter=single]').click();assert.equal(await page.locator('.desk-record').count(),6);
 const d=page.waitForEvent('download');await page.locator('[data-export]').first().click();assert.ok((await d).suggestedFilename().endsWith('.xlsx'));
 page.once('dialog',d=>d.accept());await page.locator('[data-delete]').first().click();
 await page.locator('[data-favorite]').first().click();assert.equal(await page.locator('.desk-tool').count(),3);
 await page.reload();assert.equal(await page.locator('.desk-tool').count(),3);
 await page.screenshot({path:'reports/workspace-desktop.png',fullPage:true});
 for(const width of [360,390,768,1024,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'overflow '+width);if(width===390)await page.screenshot({path:'reports/workspace-mobile.png',fullPage:true});}
 await page.getByRole('link',{name:'查看',exact:true}).first().click();assert.equal(await page.locator('[name=salary]').inputValue(),'10000');
 assert.deepEqual(errors,[]);console.log('Workspace: empty/populated, favorites, filters, pagination, export, delete, reload, saved input and 5 responsive widths passed.');
}finally{await browser.close();}

