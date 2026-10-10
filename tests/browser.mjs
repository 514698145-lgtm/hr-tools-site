import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1080},acceptDownloads:true});
const page=await context.newPage();const failures=[];page.on('pageerror',error=>failures.push(error.message));
const base='http://127.0.0.1:4321';let checks=0;
try{
 await page.goto(base);await page.locator('.tool-card').first().waitFor();assert.equal(await page.locator('.tool-card').count(),7);assert.equal(await page.locator('.tool-card a[href="/tools/date-calculator/"]').count(),0);checks++;
 await page.getByRole('button',{name:'企业成本',exact:true}).click();assert.equal(await page.locator('.tool-card').count(),2);checks++;
 await page.getByRole('button',{name:'全部工具',exact:true}).click();await page.locator('#tool-search').fill('个税计算器');assert.equal(await page.locator('.tool-card').count(),1);checks++;
 await page.locator('[data-favorite]').click();await page.goto(base+'/workspace/');await page.locator('.desk-tool').waitFor();assert.equal(await page.locator('.desk-tool').count(),1);checks++;
 await page.goto(base+'/tools/income-tax/');for(const [k,v]of Object.entries({income:120000,deduction:60000,relief:100,paid:2000}))await page.locator(`[name="${k}"]`).fill(String(v));await page.getByRole('button',{name:'开始计算',exact:true}).click();assert.ok((await page.locator('.result-total').innerText()).includes('1,380.00'));checks++;
 await page.locator('#save-result').click();await page.goto(base+'/workspace/');await page.locator('.desk-record').waitFor();assert.equal(await page.locator('.desk-record').count(),1);await page.getByRole('link',{name:'查看',exact:true}).click();assert.equal(await page.locator('[name=income]').inputValue(),'120000');checks++;
 await page.locator('[name=income]').fill('130000');assert.equal(await page.locator('#save-result').count(),0);checks++;
 await page.goto(base+'/tools/employment-cost/?mode=batch');await page.locator('#batch-mode').waitFor({state:'visible'});
 const csv='记录编号,人均月工资,人均单位社保,人均单位公积金,人均其他月支出,人数,测算月数\nA,10000,2000,700,300,10,12\nB,,2000,700,300,10,12\nC,10000,2000,700,300,2,1';
 await page.locator('#batch-file').setInputFiles({name:'test.csv',mimeType:'text/csv',buffer:Buffer.from('\ufeff'+csv)});await page.locator('[data-map="salary"]').waitFor({state:'attached'});await page.locator('#run-batch').click();assert.equal(await page.locator('#batch-output tbody tr').count(),3);assert.ok((await page.locator('#batch-output').innerText()).includes('1,560,000.00'));assert.ok((await page.locator('#batch-output').innerText()).includes('请填写人均月工资'));checks++;
 const downloadPromise=page.waitForEvent('download');await page.locator('#batch-export').click();const download=await downloadPromise;await download.saveAs('reports/batch-export.xlsx');const exported=await page.evaluate(async()=>{const X=window.XLSX;const wb=X.utils.book_new();X.utils.book_append_sheet(wb,X.utils.aoa_to_sheet([['记录编号','人均月工资','人均单位社保','人均单位公积金','人均其他月支出','人数','测算月数'],['X',10000,2000,700,300,1,1]]),'Sheet1');return Array.from(new Uint8Array(X.write(wb,{bookType:'xlsx',type:'array'})));});checks++;
 await page.locator('#batch-file').setInputFiles({name:'test.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(exported)});await page.locator('[data-map="salary"]').waitFor({state:'attached'});await page.locator('#run-batch').click();assert.ok((await page.locator('#batch-output').innerText()).includes('13,000.00'));await page.locator('#save-batch').click();checks++;
 await page.screenshot({path:'reports/batch-desktop.png',fullPage:true});
 await page.goto(base+'/insights/');await page.locator('#article-search').fill('不存在的标题');assert.ok(await page.locator('#article-empty').isVisible());await page.locator('#article-search').fill('批量');await page.locator('.news-card:visible').first().click();assert.equal(await page.locator('h1').count(),1);checks++;
 for(const width of [360,390,768,1280,1440]){
  await page.setViewportSize({width,height:900});for(const route of ['/','/tools/five-insurances-housing-fund/','/workspace/','/insights/','/insights/batch-calculation-guide/']){await page.goto(base+route);await page.waitForTimeout(150);const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));assert.ok(dims.scroll<=dims.width+1,`${route} overflows at ${width}: ${dims.scroll}`);checks++;}
 }
 await page.setViewportSize({width:390,height:844});await page.goto(base);await page.screenshot({path:'reports/home-mobile.png',fullPage:true});
 await page.goto(base+'/tools/employment-cost/?mode=batch');await page.locator('#batch-file').setInputFiles({name:'mobile.csv',mimeType:'text/csv',buffer:Buffer.from('\ufeff'+csv)});await page.locator('[data-map="salary"]').waitFor({state:'attached'});await page.locator('#run-batch').click();assert.equal(await page.locator('#batch-output tbody tr').count(),3);const mobileDownloadPromise=page.waitForEvent('download');await page.locator('#batch-export').click();assert.ok((await mobileDownloadPromise).suggestedFilename().endsWith('.xlsx'));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'reports/batch-mobile.png',fullPage:true});checks++;
 await page.goto(base+'/tools/take-home-pay/');for(const [k,v]of Object.entries({salary:10000,social:1000,fund:500,tax:100,other:0}))await page.locator(`[name="${k}"]`).fill(String(v));await page.getByRole('button',{name:'开始计算',exact:true}).click();assert.ok((await page.locator('.result-total').innerText()).includes('8,400.00'));await page.screenshot({path:'reports/calculator-mobile.png',fullPage:true});checks++;
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/tools/take-home-pay/');for(const [k,v]of Object.entries({salary:10000,social:1000,fund:500,tax:100,other:0}))await page.locator(`[name="${k}"]`).fill(String(v));await page.getByRole('button',{name:'开始计算',exact:true}).click();await page.screenshot({path:'reports/calculator-desktop.png',fullPage:true});
 await page.goto(base);await page.screenshot({path:'reports/home-desktop.png',fullPage:true});
 const response=await page.goto(base+'/not-a-real-page/');assert.equal(response.status(),404);checks++;assert.deepEqual(failures,[]);checks++;
 await fs.writeFile('reports/browser-check.json',JSON.stringify({checks,failures,viewports:[360,390,768,1280,1440]},null,2));console.log(`Browser checks passed: ${checks}`);
}finally{await browser.close();}

