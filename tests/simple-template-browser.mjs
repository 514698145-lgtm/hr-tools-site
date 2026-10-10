import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {tools,calculate,money} from '../public/assets/calculators.js';
import {templateSheets,matchesHeader} from '../public/assets/import-template.js';
import {simpleTemplate} from '../public/assets/simple-template.js';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const scope={};vm.runInNewContext(await fs.readFile('public/vendor/xlsx.full.min.js','utf8'),scope);const X=scope.XLSX;
const browser=await chromium.launch({headless:true,channel:'msedge'}),page=await browser.newPage();
await fs.mkdir('reports/simple-import',{recursive:true});let checks=0;const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
for(const tool of tools.filter(t=>t.id!=='date-calculator')){
 let idx=0;
 for(const row of templateSheets(tool)[0].rows.slice(1)){
  const data=Object.fromEntries(tool.fields.map((f,i)=>[f.key,f.type==='select'?(f.options.find(o=>o[1]===row[i+1])?.[0]??row[i+1]):row[i+1]]));
  await page.goto('http://127.0.0.1:4321/tools/'+tool.id+'/');
  await page.locator('#single-to-template').waitFor();
  if(data.city){await page.locator('#city-search').fill(data.city);await page.locator('#city-search').press('Enter');}
  await page.evaluate(data=>{const form=document.querySelector('#calculator-form');for(const [k,v]of Object.entries(data))form.elements[k].value=String(v??'');form.dispatchEvent(new Event('input',{bubbles:true}));},data);
  const expected=calculate(tool.id,data),waiting=page.waitForEvent('download');
  await page.locator('#single-to-template').click();const dl=await waiting;
  const path=`reports/simple-import/${tool.id}-${++idx}.xlsx`;await dl.saveAs(path);
  const bytes=await fs.readFile(path);assert.ok(bytes.length<30000);const book=X.read(bytes,{type:'buffer'});assert.equal(book.SheetNames.length,1);assert.equal(book.SheetNames[0],'批量填写');
  const rows=X.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:''});
  const spec=simpleTemplate(tool,data);assert.deepEqual(JSON.parse(JSON.stringify(rows.slice(0,2))),spec.rows);
  // Deliberately change page-only amounts: omitted columns must not borrow these values.
  await page.evaluate(()=>{const f=document.querySelector('#calculator-form');for(const name of ['otherSocialP','otherSocialC','otherFundP','otherFundC'])if(f.elements[name])f.elements[name].value='999';});
  await page.locator('[data-mode=batch]').click();await page.locator('#batch-file').setInputFiles(path);
  await page.locator('#run-batch').waitFor();await page.waitForFunction(()=>!document.querySelector('#run-batch').disabled);
  await page.locator('#run-batch').click();assert.equal(await page.locator('#batch-output td.error-text').count(),0,tool.id+' '+idx);
  assert.equal(await page.locator('#batch-output tbody tr').count(),1);
  assert.ok((await page.locator('#batch-output tbody tr').innerText()).includes(expected.unit==='元'?money(expected.value):String(expected.value)),tool.id+' amount');checks++;
 }
}
await page.goto('http://127.0.0.1:4321/tools/five-insurances-housing-fund/');
assert.ok((await page.locator('#single-fields').innerText()).length<300);
await page.locator('[name=wage]').fill('10000');await page.locator('[data-rate-field=fundRate]').first().fill('8');assert.equal(await page.locator('[data-rate-field=fundRate]').first().evaluate(e=>e.checkValidity()),false);
for(const width of [390,1440]){await page.setViewportSize({width,height:950});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`reports/simple-form-${width}.png`,fullPage:true});}
// Native Excel round-trip and CSV conversion must also remain self-contained.
const native=await fs.readFile('reports/simple-excel/five-insurances-housing-fund-1.xlsx');
const nb=X.read(native,{type:'buffer'}),csv=X.utils.sheet_to_csv(nb.Sheets[nb.SheetNames[0]]);
await page.locator('[name=otherSocialP]').evaluate(e=>e.value='999');
await page.locator('[data-mode=batch]').click();
for(const file of [{name:'native.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:native},{name:'converted.csv',mimeType:'text/csv',buffer:Buffer.from('\ufeff'+csv)}]){
 await page.locator('#batch-file').setInputFiles(file);await page.waitForFunction(()=>!document.querySelector('#run-batch').disabled);await page.locator('#run-batch').click();
 assert.equal(await page.locator('#batch-output tbody tr').count(),2);assert.equal(await page.locator('#batch-output td.error-text').count(),0,file.name+': '+await page.locator('#batch-output').innerText());
 assert.ok((await page.locator('#batch-output tbody tr').first().innerText()).includes('5,103.00'));
}
assert.deepEqual(errors,[]);console.log(`${checks} scenario downloads: one sheet, active columns, carried values and batch results passed; invalid rate, short form and responsive checks passed.`);
}finally{await browser.close();}
