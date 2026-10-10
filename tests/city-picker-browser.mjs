import {createRequire} from 'node:module';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4321/tools/five-insurances-housing-fund/');
 assert.equal(await page.locator('#insurance-province').inputValue(),'上海市');
 await page.locator('#insurance-province').selectOption('江苏省');assert.equal(await page.locator('[name=city]').inputValue(),'');assert.equal(await page.locator('[name=city] option').count(),14);
 await page.locator('[name=city]').selectOption('苏州');assert.match(await page.locator('#policy-panel').innerText(),/苏州/);
 await page.locator('#city-search').fill('广州');await page.getByRole('button',{name:'广东省 · 广州',exact:true}).click();assert.equal(await page.locator('#insurance-province').inputValue(),'广东省');assert.equal(await page.locator('[name=city]').inputValue(),'广州');
 await page.locator('#city-search').fill('不存在城市');assert.match(await page.locator('#city-search-results').innerText(),/没有找到/);assert.equal(await page.locator('[name=city]').inputValue(),'广州');
 await page.locator('#city-search').fill('北京');await page.locator('#city-search').press('Enter');assert.equal(await page.locator('[name=city]').inputValue(),'北京');
 await page.locator('[name=wage]').fill('10000');await page.getByRole('button',{name:'开始计算',exact:true}).click();await page.locator('#save-result').click();
 await page.goto('http://127.0.0.1:4321/workspace/');await page.getByRole('link',{name:'查看',exact:true}).first().click();assert.equal(await page.locator('#insurance-province').inputValue(),'北京市');assert.equal(await page.locator('[name=city]').inputValue(),'北京');
 await page.locator('#insurance-province').selectOption('浙江省');assert.equal(await page.locator('#save-result').count(),0);assert.match(await page.locator('#policy-panel').innerText(),/请选择参保城市/);
 await page.getByRole('button',{name:'重置',exact:true}).click();await page.waitForTimeout(100);assert.equal(await page.locator('[name=city]').inputValue(),'上海');assert.equal(await page.locator('#insurance-province').inputValue(),'上海市');
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`reports/city-picker-${width}.png`,fullPage:false});}
 assert.deepEqual(errors,[]);console.log('Province/city search, selection, policy refresh, saved record, reset and responsive checks passed.');
}finally{await browser.close();}
