import test from 'node:test';
import assert from 'node:assert/strict';
import {regions,cityPolicy} from '../public/assets/city-policies.js';
import {contributionBases} from '../public/assets/contribution-engine.js';
import {calculate,calculateBatch,tools} from '../public/assets/calculators.js';
import {simpleTemplate} from '../public/assets/simple-template.js';
const id='five-insurances-housing-fund';

test('江苏正式基数追溯2026全年，13城保底封顶与批量结果相同',()=>{
 for(const city of regions.江苏){
  for(const month of ['2026-01','2026-09','2026-12']){
   for(const [wage,expected] of [[4000,5025],[10000,10000],[30000,25127]]){
    const d={city,month,wage},b=contributionBases(d);
    for(const k of ['pension','medical','unemployment','injury'])assert.equal(b[k].value,expected,`${city}/${month}/${k}`);
    if(month<'2026-07')continue; // Earlier base limits are known; rate windows remain explicitly bounded.
    const r=calculate(id,d),batch=calculateBatch(id,[d])[0];
    assert.deepEqual(batch.result.contribution,r.contribution);
    assert.equal(r.contribution.rows.find(x=>x.label==='养老保险').personal,Math.round(expected*8)/100);
   }
  }
  assert.equal(cityPolicy(city,'2025-12').values.pensionMin,undefined);
  assert.equal(cityPolicy(city,'2027-01').values.pensionMin,undefined);
 }
});

test('广东企业养老分期生效，不将机关事业1月范围或养老参数套到医保',()=>{
 for(const city of regions['大湾区内地']){
  assert.equal(cityPolicy(city,'2026-06').values.pensionMin,5510);
  assert.equal(cityPolicy(city,'2026-06').values.pensionMax,undefined);
  assert.equal(cityPolicy(city,'2026-07').values.pensionMin,5521);
  assert.equal(cityPolicy(city,'2026-07').values.pensionMax,27603);
 }
 assert.equal(cityPolicy('东莞','2026-10').values.medicalMin,4775);
 assert.equal(cityPolicy('深圳','2026-10').values.medicalMin,6727);
 assert.equal(cityPolicy('广州','2025-12').values.pensionMin,5510);
 assert.equal(cityPolicy('深圳','2025-12').values.pensionMin,4775);
});

test('浙江正式全年参数与河北三险范围分开核对',()=>{
 for(const city of regions.浙江){
  assert.equal(cityPolicy(city,'2026-01').values.pensionMin,5122);
  assert.equal(cityPolicy(city,'2026-10').values.pensionMax,25611);
  assert.equal(cityPolicy(city,'2025-12').values.pensionMin,4986);
 }
 for(const city of regions.河北){
  const v=cityPolicy(city,'2026-10').values;
  for(const k of ['pension','unemployment','injury']){
   assert.equal(v[k+'Min'],4076);assert.equal(v[k+'Max'],20382);
  }
  assert.equal(v.medicalMin,undefined);assert.equal(v.fundMin,undefined);
 }
});

test('苏州园区4月调费独立于吴江；天津新办法按3月施行',()=>{
 assert.equal(cityPolicy('苏州','2026-03',{medicalPlan:'sip'}).values.medicalC,5);
 assert.equal(cityPolicy('苏州','2026-04',{medicalPlan:'sip'}).values.medicalC,6);
 assert.equal(cityPolicy('苏州','2026-10',{medicalPlan:'wj'}).values.medicalC,7);
 assert.equal(cityPolicy('苏州','2026-10',{medicalPlan:'other'}).values.medicalC,undefined);
 assert.equal(cityPolicy('苏州','2026-10',{medicalPlan:'sip'}).values.birthC,.8);
 assert.equal(cityPolicy('天津','2026-02').values.medicalC,undefined);
 assert.equal(cityPolicy('天津','2026-03').values.medicalC,10.5);
});

test('上海公积金正式上限与独立取整依据可计算金额，不再要求重复手填',()=>{
 const d={city:'上海',month:'2026-10',wage:50000,fundRate:7};
 const r=calculate(id,d).contribution.rows.find(x=>x.label==='住房公积金');
 assert.equal(r.base,37731);assert.equal(r.personal,2641);assert.equal(r.company,2641);
 assert.equal(cityPolicy('上海','2027-06').values.fundMax,37731);
 assert.equal(cityPolicy('上海','2027-07').values.fundMax,undefined);
 const template=simpleTemplate(tools.find(t=>t.id===id),d);
 assert.equal(template.rows.length,2);
 assert.ok(!template.fields.some(f=>f.key==='fundBase'||f.key==='fundRounding'));
 assert.equal(template.rows[0][0],'员工【选填】');
});

test('常州医疗生育分列，8%和0.8%相加一次',()=>{
 const rows=calculate(id,{city:'常州',month:'2026-10',wage:10000}).contribution.rows;
 assert.equal(rows.find(x=>x.label==='医疗保险').company,800);
 assert.equal(rows.find(x=>x.label==='生育保险（单列部分）').company,80);
});

test('全年奖金对比与2026年天津税务两组公开算例一致',()=>{
 for(const [annualIncome,bonus,annualDeduction,a,b] of [[200000,24000,104000,9480,7800],[120000,60000,100000,5480,6390]]){
  const r=calculate('income-tax',{taxMode:'compare',taxYear:2026,priorMethod:'none',eligible:'yes',annualIncome,bonus,annualDeduction,annualRelief:0});
  assert.equal(r.lines.find(x=>x.label==='A · 全部并入综合所得税额').value,a);
  assert.equal(r.lines.find(x=>x.label==='B · 本次单独计税＋其他并入').value,b);
 }
});
