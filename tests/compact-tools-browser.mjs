import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4321/tools/five-insurances-housing-fund/');
 await page.locator('[name=wage]').fill('10000');
 await page.locator('#city-search').fill('北京');await page.locator('#city-search').press('Enter');
 const editor=k=>page.locator(`[data-rate-field="${k}"]`).first();
 assert.equal(await editor('pensionC').inputValue(),'16');
 assert.equal(await page.locator('[name=fundRate]').isVisible(),false);
 await editor('fundRate').fill('7');await editor('injuryRate').fill('0.2');
 await editor('pensionC').fill('15');await editor('pensionBase').fill('8000');
 await page.getByRole('button',{name:'开始计算',exact:true}).click();
 assert.match(await page.locator('#result-panel').innerText(),/1,200.00/);
 await editor('pensionBase').fill('1');assert.equal(await editor('pensionBase').getAttribute('aria-invalid'),'true');
 await editor('pensionBase').fill('');await editor('pensionC').fill('');
 await page.getByRole('button',{name:'开始计算',exact:true}).click();assert.match(await page.locator('#result-panel').innerText(),/1,600.00/);
 await editor('fundRate').fill('4');assert.equal(await editor('fundRate').getAttribute('aria-invalid'),'true');await editor('fundRate').fill('7');
 await editor('pensionC').fill('14');await page.locator('[name=month]').fill('2026-10');await page.locator('[name=wage]').click();assert.equal(await editor('pensionC').inputValue(),'16');
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`reports/editable-contribution-${width}.png`,fullPage:true});}
 for(const id of ['income-tax','take-home-pay','employment-cost','salary-budget','hr-metrics','severance']){
  await page.goto('http://127.0.0.1:4321/tools/'+id+'/');await page.locator('#single-to-template').waitFor();
  if(id!=='severance'){assert.equal(await page.locator('#advanced-parameters').getAttribute('open'),null);await page.locator('#advanced-parameters summary').click();assert.notEqual(await page.locator('#advanced-parameters').getAttribute('open'),null);}
  assert.equal(await page.locator('details.method').count(),1);
 }
 await page.goto('http://127.0.0.1:4321/policies/');await page.screenshot({path:'reports/policy-library-current.png',fullPage:true});
 assert.equal(await page.locator('.policy-item').count(),10);
 await page.locator('#policy-search').fill('年休假');assert.equal(await page.locator('.policy-item:visible').count(),2);await page.locator('#policy-search').fill('xyz-no-result');assert.equal(await page.locator('#policy-empty').isVisible(),true);await page.locator('#policy-search').fill('');await page.locator('#policy-category').selectOption('合同与试用期');assert.equal(await page.locator('.policy-item:visible').count(),2);await page.locator('.policy-item:visible').first().click();assert.ok(await page.locator('.policy-sources a').count()>0);assert.deepEqual(errors,[]);console.log('Inline editing, range errors, reset, city-month isolation, 6 compact tools, policy library and responsive layout passed');
}finally{await browser.close();}
