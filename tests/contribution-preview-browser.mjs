import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4321/tools/five-insurances-housing-fund/');
 const selectCity=async city=>{await page.locator('#city-search').fill(city);await page.locator('#city-search').press('Enter');};
 await selectCity('北京');await page.locator('[name=wage]').fill('50000');await page.locator('[name=fundRate]').fill('7');
 assert.match(await page.locator('#policy-panel').innerText(),/36,348.00 元 · 按上限封顶/);
 assert.equal(await page.locator('[name=fundBase]').isVisible(),false);
 await page.locator('[name=wage]').fill('1000');assert.match(await page.locator('#policy-panel').innerText(),/2,540.00 元 · 按下限保底/);
 await page.locator('[name=wage]').fill('10000');assert.match(await page.locator('#policy-panel').innerText(),/10,000.00 元 · 按员工缴费工资/);
 await page.locator('#advanced-parameters summary').click();await page.locator('[name=fundWage]').fill('15000');
 assert.match(await page.locator('#policy-panel').innerText(),/15,000.00 元 · 按员工缴费工资/);
 await page.getByRole('button',{name:'开始计算',exact:true}).click();assert.match(await page.locator('#result-panel').innerText(),/1,050.00/);
 await selectCity('深圳');assert.equal(await page.locator('[name=medicalPlan]').inputValue(),'');
 await page.locator('[name=medicalPlan]').selectOption('sz2');assert.match(await page.locator('#policy-panel').innerText(),/深圳 · 职工医保二档/);
 await page.getByRole('button',{name:'开始计算',exact:true}).click();assert.match(await page.locator('#result-panel').innerText(),/150.00/);
 await selectCity('苏州');assert.equal(await page.locator('[name=medicalPlan]').inputValue(),'');await page.locator('[name=medicalPlan]').selectOption('wj');assert.match(await page.locator('#policy-panel').innerText(),/吴江/);
 await selectCity('北京');await page.locator('[name=wage]').fill('50000');
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#policy-panel').screenshot({path:`reports/contribution-policy-${width}.png`});}
 assert.deepEqual(errors,[]);console.log('Live base preview, independent wage, limits, city/plan reset and responsive checks passed.');
}finally{await browser.close();}
