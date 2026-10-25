import test from 'node:test';
import assert from 'node:assert/strict';
import {cityPolicy} from '../public/assets/city-policies.js';
import {contributionBases} from '../public/assets/contribution-engine.js';
import {calculate,calculateBatch} from '../public/assets/calculators.js';
const id='five-insurances-housing-fund';

test('嘉兴医保时点未决时停止自动核定，不影响省内其他城市及养老',()=>{
 const p=cityPolicy('嘉兴','2026-10');
 assert.equal(p.values.medicalMin,undefined);
 assert.equal(p.values.medicalMax,undefined);
 assert.equal(p.values.pensionMin,5122);
 assert.ok(p.pending.some(x=>x.status==='适用时点待复核'));
 assert.ok(p.notes.some(x=>x.text.includes('次月')));
 assert.equal(contributionBases({city:'嘉兴',month:'2026-10',wage:1000}).medical.value,undefined);
 assert.equal(contributionBases({city:'嘉兴',month:'2026-10',wage:1000,medicalBase:4986}).medical.value,4986);
 assert.equal(cityPolicy('杭州','2026-10').values.medicalMin,5122);
 // Neither a date inference nor changing one city's values may mutate siblings.
 assert.equal(cityPolicy('嘉兴','2026-11').values.medicalMin,undefined);
});

test('常州新原文表的年度跨年边界准确，公积金不套用社保基数',()=>{
 for(const month of ['2026-07','2026-10','2027-06']){
  const p=cityPolicy('常州',month);
  assert.equal(p.values.fundMin,2660);assert.equal(p.values.fundMax,34080);
  assert.equal(p.values.fundRateMax,12);
  assert.ok(p.evidence.fundMax.source.url.endsWith('/13939.html'));
 }
 assert.equal(cityPolicy('常州','2026-06').values.fundMax,undefined);
 assert.equal(cityPolicy('常州','2027-07').values.fundMax,undefined);
});

test('惠州两类在职医保、生育已含和固定基数附加费不重复混算',()=>{
 for(const [medicalPlan,personal,company]of [['hzAccount',200,560],['hzSingle',0,400]]){
  const d={city:'惠州',month:'2026-10',wage:10000,medicalPlan};
  const r=calculate(id,d),rows=r.contribution.rows;
  assert.equal(rows.find(x=>x.label==='医疗保险').personal,personal);
  assert.equal(rows.find(x=>x.label==='医疗保险').company,company);
  assert.equal(rows.find(x=>x.label==='生育保险（单列部分）').company,0);
  assert.equal(rows.find(x=>x.label==='医疗附加').company,0);
  assert.equal(rows.find(x=>x.label==='固定附加费').company,null);
  assert.ok(r.partial);assert.ok(r.messages.some(x=>x.includes('7438')));
  assert.deepEqual(calculateBatch(id,[d])[0].result.contribution,r.contribution);
 }
 const absent=cityPolicy('惠州','2026-10');
 assert.equal(absent.values.medicalC,undefined);
 assert.equal(contributionBases({city:'惠州',month:'2026-10',wage:30000}).medical.value,22315);
});

test('肇庆附表按险种和月份采用，旧养老表不能覆盖10月省级新通知',()=>{
 const p=cityPolicy('肇庆','2026-10');
 assert.equal(p.values.pensionMin,5521);assert.equal(p.values.pensionMax,27603);
 assert.equal(p.values.medicalMin,4520);assert.equal(p.values.medicalMax,22599);
 assert.equal(p.values.unemploymentMin,2040);assert.equal(p.values.unemploymentMax,28220);
 assert.equal(cityPolicy('肇庆','2026-08').values.unemploymentMin,undefined);
 const d={city:'肇庆',month:'2026-10',wage:30000};
 const r=calculate(id,d);
 assert.equal(r.contribution.rows.find(x=>x.label==='医疗保险').company,1423.74);
 assert.equal(r.contribution.rows.find(x=>x.label==='失业保险').company,225.76);
 assert.equal(r.contribution.rows.find(x=>x.label==='生育保险（单列部分）').company,0);
 assert.deepEqual(calculateBatch(id,[d])[0].result.contribution,r.contribution);
});

test('保定与雄安公积金分支保留核定输入，不将例外当全市统一值',()=>{
 const bd=cityPolicy('保定','2026-10'),xa=cityPolicy('雄安新区','2026-10');
 assert.equal(bd.values.fundMax,24345);assert.equal(bd.values.fundMin,undefined);
 assert.equal(xa.values.fundMin,2380);assert.equal(xa.values.fundMax,undefined);
 assert.ok(xa.notes.some(x=>x.text.includes('31267')&&x.text.includes('疏解')));
 for(const city of ['保定','雄安新区']){
  assert.equal(contributionBases({city,month:'2026-10',wage:10000}).fund.value,undefined);
  assert.equal(contributionBases({city,month:'2026-10',wage:10000,fundBase:10000}).fund.value,10000);
 }
 assert.equal(cityPolicy('定州','2026-10').values.fundMax,undefined);
});
