import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base='http://127.0.0.1:4321';
async function walk(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else if(e.name.endsWith('.html'))out.push(p);}return out;}
const files=await walk('dist');const routes=files.map(p=>'/'+p.replaceAll('\\','/').replace(/^dist\//,'').replace(/index\.html$/,''));
const browser=await chromium.launch({headless:true,channel:'msedge'});const report=[];const failures=[];let cursor=0;
const pictures=new Set(['/','/workspace/','/enterprise-services/','/tools/five-insurances-housing-fund/','/tools/income-tax/','/policies/','/templates/','/relax/','/admin/feedback/','/insights/']);
await fs.mkdir('reports/typography',{recursive:true});
try{
 await Promise.all(Array.from({length:3},async()=>{
  const context=await browser.newContext(),page=await context.newPage();
  page.on('pageerror',e=>failures.push({route:page.url(),error:e.message}));
  page.on('response',r=>{if(r.url().includes('/fonts/')&&!r.ok())failures.push({font:r.url(),status:r.status()});});
  while(cursor<routes.length){const route=routes[cursor++];const entry={route,widths:[],fonts:[]};
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await page.goto(base+route,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
    const result=await page.evaluate(()=>{
     const visible=e=>e.getClientRects().length>0;
     const headings=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map(e=>({text:e.textContent.trim().slice(0,50),weight:getComputedStyle(e).fontWeight,family:getComputedStyle(e).fontFamily}));
     const badFamily=[...document.querySelectorAll('body *')].filter(e=>visible(e)&&e.firstChild?.nodeType===3&&e.firstChild.textContent.trim()&&!getComputedStyle(e).fontFamily.includes('HR Workspace Sans')).map(e=>e.tagName);
     return {headings,badFamily,overflow:document.documentElement.scrollWidth>innerWidth+1,fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>({family:f.family,weight:f.weight}))};
    });
    entry.widths.push({width,...result});
    if(result.overflow||result.badFamily.length||result.headings.some(h=>h.weight!=='500'))failures.push({route,width,...result});
    if(pictures.has(route))await page.screenshot({path:'reports/typography/'+(route==='/'?'home':route.replaceAll('/','-'))+'-'+width+'.png',fullPage:true});
   }
   {
    const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'h1'});if(nodeId)entry.fonts=(await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts;if(entry.fonts.some(f=>!f.isCustomFont))failures.push({route,renderedFonts:entry.fonts});await cdp.detach();
   }
   report.push(entry);if(report.length%20===0)console.log('Checked pages:',report.length);
  }
  await context.close();
 }));
 await fs.writeFile('reports/typography/audit.json',JSON.stringify({pages:report.length,failures,report},null,2));
 assert.deepEqual(failures,[]);console.log(`Typography: ${report.length} pages at desktop and mobile, heading weights, family and overflow checks passed.`);
}finally{await browser.close();}
