import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {calculate,tools} from '../public/assets/calculators.js';
import {cityEntryPreset,exampleInput} from '../public/assets/tool-presets.js';

test('city links only import a known city and valid month, never payroll or rate overrides',()=>{
 const tool='five-insurances-housing-fund';
 assert.deepEqual(cityEntryPreset('?city=北京&month=2026-10&wage=1&pensionP=0',tool),{city:'北京',month:'2026-10'});
 for(const search of ['?city=香港','?city=<script>','?city=北京&month=2026-13','?city=北京&record=old'])assert.equal(cityEntryPreset(search,tool),null);
 assert.equal(cityEntryPreset('?city=北京','income-tax'),null);
});

test('public fictional examples reconcile independently checked amounts and contribution components',async()=>{
 const examples=JSON.parse(await readFile(new URL('../public/data/tool-examples.json',import.meta.url),'utf8'));
 const expected={'beijing-monthly':4703,'salary-withholding':3480,'annual-bonus':1080,'severance-n':35000};
 for(const example of examples){
  const tool=tools.find(t=>t.id===example.toolId);
  const input=exampleInput(examples,example.id,tool),result=calculate(tool.id,input);
  assert.equal(result.value,expected[example.id]);
  assert.equal(result.partial??false,false);
  if(result.contribution){assert.equal(result.contribution.personal,1553);assert.equal(result.contribution.company,3150);assert.equal(result.contribution.rows.find(x=>x.label==='住房公积金').personal,500);}
 }
 const tool=tools.find(t=>t.id==='severance');
 assert.throws(()=>exampleInput([{id:'bad',input:{__bad:'value'}}],'bad',tool),/字段/);
 assert.throws(()=>exampleInput([{id:'bad',input:{formula:'unknown'}}],'bad',tool),/选项/);
});
