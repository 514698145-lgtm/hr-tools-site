import fs from 'node:fs/promises';import assert from 'node:assert/strict';import vm from 'node:vm';
import {tools,calculate} from '../public/assets/calculators.js';
import {matchesHeader} from '../public/assets/import-template.js';
const scope={};vm.runInNewContext(await fs.readFile('public/vendor/xlsx.full.min.js','utf8'),scope);const X=scope.XLSX;
const folder=process.argv[2]||'public/downloads/import-templates';let count=0;
for(const name of (await fs.readdir(folder)).filter(n=>n.endsWith('.xlsx'))){
 const tool=tools.find(t=>name===t.id+'.xlsx'||name.startsWith(t.id+'-'));assert.ok(tool,name);
 const b=X.read(await fs.readFile(folder+'/'+name),{type:'buffer',cellDates:true});assert.deepEqual(Array.from(b.SheetNames),['批量填写']);
 const s=b.Sheets[b.SheetNames[0]],rows=X.utils.sheet_to_json(s,{header:1,defval:''});
 assert.ok(rows[0].every(h=>['员工【选填】','记录编号【选填】'].includes(h)||tool.fields.some(f=>matchesHeader(h,f))));
 for(const [addr,c]of Object.entries(s))if(!addr.startsWith('!')){assert.notEqual(c.t,'e');assert.ok(!c.f,'Input-only template has no formulas');}
 if(process.argv[2])for(const row of rows.slice(1).filter(r=>r.some(v=>v!==''))){
  const d=Object.fromEntries(tool.fields.map(f=>{const i=rows[0].findIndex(h=>matchesHeader(h,f));let v=i<0?'':row[i];if(v instanceof Date)v=v.toISOString().slice(0,10);return[f.key,v];}));calculate(tool.id,d);count++;
 }
}
console.log(`Single-sheet structure verified; ${count} supplied rows recalculated by website engine.`);
