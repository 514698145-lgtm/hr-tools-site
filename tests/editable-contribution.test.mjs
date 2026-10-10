import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,tools} from '../public/assets/calculators.js';
import {simpleTemplate} from '../public/assets/simple-template.js';
import {cityPolicy} from '../public/assets/city-policies.js';
const id='five-insurances-housing-fund',d={city:'北京',month:'2026-09',wage:10000,fundRate:7,injuryRate:.2};
test('表格修改费率、零费率、核定基数参与计算，清空恢复预填',()=>{
 const row=data=>calculate(id,data).contribution.rows[0];
 assert.equal(row({...d,pensionC:15}).company,1500);
 assert.equal(row({...d,pensionC:0}).company,0);
 assert.equal(row({...d,pensionBase:8000}).company,1280);
 assert.equal(row({...d,pensionBase:'',pensionC:''}).company,1600);
 assert.equal(cityPolicy(d.city,d.month).values.pensionC,16);
 assert.throws(()=>calculate(id,{...d,pensionBase:1}),/应在/);
 assert.throws(()=>calculate(id,{...d,pensionC:-1}),/数字/);
});
test('单Sheet只携带显式修改值，往返计算与单条一致',()=>{
 const tool=tools.find(t=>t.id===id),data={...d,pensionC:15,pensionBase:8000,fixedP:0};
 const template=simpleTemplate(tool,data);
 assert.ok(template.fields.some(f=>f.key==='pensionC'));
 assert.ok(!template.fields.some(f=>f.key==='medicalC'));
 const restored=Object.fromEntries(template.fields.map((f,i)=>[f.key,template.rows[1][i+1]]));
 assert.equal(calculate(id,restored).value,calculate(id,data).value);
});
