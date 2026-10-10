import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage();
try {
 await page.goto('http://127.0.0.1:4321/tools/five-insurances-housing-fund/');
 await page.locator('#city-search').fill('上海');await page.locator('#city-search').press('Enter');
 assert.match(await page.locator('#policy-panel').innerText(),/下限 2740 元；上限待核验/);
 await page.locator('#city-search').fill('中山');await page.locator('#city-search').press('Enter');
 assert.match(await page.locator('#policy-panel').innerText(),/上限 29430 元；下限\/适用条件待核验/);
 assert.match(await page.locator('#policy-panel').innerText(),/存量职工到2027年度调整/);
 await page.locator('#city-search').fill('上海');await page.locator('#city-search').press('Enter');
 await page.locator('[name=wage]').fill('10000');await page.locator('[name=fundRate]').fill('8');
 assert.equal(await page.locator('[name=fundRate]').evaluate(e=>e.checkValidity()),false);
 assert.match(await page.locator('#range-fundRate').innerText(),/5、6、7%/);
 await page.locator('[name=fundRate]').fill('7');assert.equal(await page.locator('[name=fundRate]').evaluate(e=>e.checkValidity()),true);
 for(const width of [390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`reports/input-rules-${width}.png`,fullPage:true});}
 await page.goto('http://127.0.0.1:4321/tools/five-insurances-housing-fund/?mode=batch');
 await page.locator('#batch-file').setInputFiles('reports/import-excel-cases/five-insurances-housing-fund.xlsx');
 await page.locator('[data-map]').first().waitFor({state:'attached'});await page.locator('#run-batch').click();
 assert.equal(await page.locator('#batch-output tbody tr').count(),6);
 assert.equal(await page.locator('#batch-output td.error-text').count(),2);
 assert.match(await page.locator('#batch-output tbody tr').last().innerText(),/2001.*LAST-ROW/);
 console.log('Policy ranges, mobile/desktop layout, native Excel edits and row 2001 import passed.');
}finally{await browser.close();}
