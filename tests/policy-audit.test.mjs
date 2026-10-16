import test from 'node:test';
import assert from 'node:assert/strict';
import {cityOptions,cityPolicy} from '../public/assets/city-policies.js';
import {contributionBases} from '../public/assets/contribution-engine.js';
import {calculate,calculateBatch} from '../public/assets/calculators.js';
const id='five-insurances-housing-fund';
test('目录50城养老费率具备逐字段来源，过期不自动沿用',()=>{
 for(const [city]of cityOptions){const p=cityPolicy(city,'2026-10');assert.equal(p.values.pensionP,8,city);assert.equal(p.values.pensionC,16,city);assert.ok(p.evidence.pensionP.source.url);assert.ok(p.evidence.pensionC.source.url);}
 assert.equal(cityPolicy('广州','2026-10').values.pensionMin,5521);
 assert.equal(cityPolicy('上海','2026-10').values.unemploymentC,undefined);
 assert.equal(cityPolicy('上海','2026-10').values.fundMin,2740);
 assert.equal(cityPolicy('上海','2026-10').values.fundMax,37731);
});
test('中山年度上限可独立采用，9月新旧员工下限不能一刀切',()=>{
 assert.equal(cityPolicy('中山','2026-08').values.fundMin,2080);
 assert.equal(cityPolicy('中山','2026-10').values.fundMin,undefined);
 assert.equal(cityPolicy('中山','2026-10').values.fundMax,29430);
 assert.equal(contributionBases({city:'中山',month:'2026-10',wage:1000}).fund.value,undefined);
});
test('城市与工资共同核定基数；预览与正式计算一致，零工资按下限，空白不当零',()=>{
 for(const [wage,expected]of [[0,2540],[10000,10000],[50000,36348]]){
  const d={city:'北京',month:'2026-10',wage,fundRate:7},b=contributionBases(d),r=calculate(id,d);
  assert.equal(b.fund.value,expected);assert.equal(r.contribution.rows.find(x=>x.label==='住房公积金').base,expected);
 }
 assert.equal(contributionBases({city:'北京',month:'2026-10',wage:''}).fund.value,undefined);
 assert.equal(contributionBases({city:'北京',month:'2026-10',wage:'10000',fundWage:''}).fund.value,10000);
 assert.equal(contributionBases({city:'南京',month:'2026-10',wage:10000,fundWage:50000}).fund.value,42400);
 assert.equal(contributionBases({city:'广州',month:'2026-10',wage:10000}).fund.value,undefined);
 assert.equal(contributionBases({city:'广州',month:'2026-10',wage:10000,fundBase:8000}).fund.value,8000);
});
test('深圳医保档次、东莞账户类型、苏州吴江不得自动跨口径套用',()=>{
 assert.equal(cityPolicy('深圳','2026-10').values.medicalP,undefined);
 assert.equal(cityPolicy('苏州','2026-10').values.medicalP,undefined);
 assert.equal(cityPolicy('苏州','2026-10',{medicalPlan:'wj'}).values.medicalC,7);
 const input={city:'深圳',month:'2026-10',wage:10000};
 const rows=calculateBatch(id,[{...input,medicalPlan:'sz1'},{...input,medicalPlan:'sz2'},{...input,medicalPlan:'dgSingle'}]);
 assert.equal(rows[0].result.contribution.rows.find(r=>r.label==='医疗保险').company,600);
 assert.equal(rows[1].result.contribution.rows.find(r=>r.label==='医疗保险').company,150);
 assert.match(rows[2].error,/不匹配/);
 assert.equal(cityPolicy('东莞','2026-10',{medicalPlan:'dgSingle'}).values.medicalC,2.45);
 assert.equal(cityPolicy('东莞','2026-10',{medicalPlan:'dgAccount'}).values.medicalP,2);
 assert.equal(cityPolicy('东莞','2026-06',{medicalPlan:'dgAccount'}).values.medicalC,undefined);
});
test('公积金基数齐全但金额取整规则未齐时，仍不得输出猜测金额',()=>{
 const r=calculate(id,{city:'南京',month:'2026-10',wage:10000,fundRate:7});
 const f=r.contribution.rows.find(x=>x.label==='住房公积金');assert.equal(f.base,10000);assert.equal(f.personal,null);
 const l=calculate(id,{city:'连云港',month:'2026-10',wage:10001,fundRate:7});assert.equal(l.contribution.rows.find(x=>x.label==='住房公积金').personal,700);
 assert.throws(()=>calculate(id,{city:'广州',month:'2028-01',wage:10000,fixedP:0,fixedC:0}),/参数不足/);
});
