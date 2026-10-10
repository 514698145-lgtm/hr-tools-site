import {createRequire} from 'node:module';import assert from 'node:assert/strict';
import {cityOptions,medicalPlans} from '../public/assets/city-policies.js';
import {contributionTool} from '../public/assets/contribution-engine.js';
import {fieldsFor} from '../public/assets/hr-tools.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1440,height:1000}});let count=0;
try{
 await page.goto('http://127.0.0.1:4321/tools/five-insurances-housing-fund/');await page.locator('[name=month]').fill('2026-10');
 for(const [city]of cityOptions){
  await page.locator('#city-search').fill(city);await page.locator('#city-search').press('Enter');
  for(const [medicalPlan]of [[''],...(medicalPlans[city]||[])]){
   if(medicalPlans[city])await page.locator('[name=medicalPlan]').selectOption(medicalPlan);
   const expected=fieldsFor(contributionTool,{city,month:'2026-10',medicalPlan}).map(f=>f.key).sort();
   const actual=await page.locator('#calculator-form [name]:enabled').evaluateAll(es=>es.map(e=>e.name).sort());assert.deepEqual(actual,expected,city+'/'+medicalPlan);count++;
  }
 }
 await page.locator('#city-search').fill('北京');await page.locator('#city-search').press('Enter');assert.equal(await page.locator('[data-rate-field=medicalC]').inputValue(),'8.8');assert.equal(await page.locator('[data-rate-field=medicalExtraC]').inputValue(),'1');
 await page.locator('[name=wage]').fill('10000');await page.locator('[data-rate-field=fundRate]').first().fill('7');await page.locator('[data-rate-field=injuryRate]').first().fill('.2');await page.locator('[data-rate-field=otherSocialP]').first().fill('12');await page.locator('[data-rate-field=otherSocialC]').first().fill('34');await page.getByRole('button',{name:'开始计算',exact:true}).click();
 assert.match(await page.locator('#result-panel').innerText(),/5,149.00/);
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`reports/field-audit-${width}.png`,fullPage:true});}
 console.log(`${count} actual city/plan form states, inline field coverage, split fees and responsive layout passed.`);
}finally{await browser.close();}
