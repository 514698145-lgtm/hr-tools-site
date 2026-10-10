// Recalculate downloaded files in the artifact spreadsheet engine, without modifying deliveries.
import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {SpreadsheetFile,FileBlob}=await import(pathToFileURL(require.resolve('@oai/artifact-tool',{paths:[process.env.NODE_PATH||'outputs/hr-templates/node_modules']})));
const cases=[
 ['payroll-check',{C:10000,D:2000,E:500,G:800,H:700,I:300,J:0},'K',10700],
 ['annual-leave',{D:10,E:12},'F',-2],
 ['timeoff-ledger',{B:8,D:4,E:5},'F',7],
 ['benefit-budget',{E:1000,F:1250},'G',250],
 ['asset-return',{D:3,E:4},'J',-1],
 ['channel-review',{F:5,G:4,H:2000},'M',500]
];
let count=0;
for(const [id,inputs,result,expected] of cases){const w=await SpreadsheetFile.importXlsx(await FileBlob.load('public/downloads/hr-templates/'+id+'.xlsx'));const s=w.worksheets.getItemAt(w.worksheets.items.length-1);
 for(const row of [8,36]){for(const [c,v] of Object.entries(inputs))s.getRange(c+row).values=[[v]];w.recalculate();assert.equal(s.getRange(result+row).values[0][0],expected,id+' normal');count++;
 for(const c of Object.keys(inputs))s.getRange(c+row).values=[[0]];w.recalculate();assert.equal(s.getRange(result+row).values[0][0],id==='channel-review'?'不适用':0,id+' zero');count++;
 for(const c of Object.keys(inputs))s.getRange(c+row).clear({applyTo:'contents'});w.recalculate();assert.equal(s.getRange(result+row).values[0][0],'',id+' blank');count++;}
}
const w=await SpreadsheetFile.importXlsx(await FileBlob.load('public/downloads/hr-templates/shift-roster.xlsx'));const s=w.worksheets.getItemAt(0);s.getRange('C8:I8').values=[['早','中','晚','日','日','休','休']];w.recalculate();assert.equal(s.getRange('J8').values[0][0],5);assert.equal(s.getRange('K8').values[0][0],2);count+=2;
const p=await SpreadsheetFile.importXlsx(await FileBlob.load('public/downloads/hr-templates/payroll-check.xlsx'));const detail=p.worksheets.getItemAt(1);for(const [c,v] of Object.entries({C:10000,D:2000,E:500,G:800,H:700,I:300,J:0}))detail.getRange(c+'8').values=[[v]];p.recalculate();assert.equal(p.worksheets.getItemAt(0).getRange('B11').values[0][0],10700);count++;
console.log('Downloaded workbook recalculation checks: '+count);
