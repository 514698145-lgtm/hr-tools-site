import test from 'node:test';
import assert from 'node:assert/strict';
import {tools,calculate,calculateBatch} from '../public/assets/calculators.js';
import {inputRule} from '../public/assets/input-rules.js';
test('公积金本地档位、跨行范围与省市校验',()=>{
 const rows=calculateBatch('five-insurances-housing-fund',[{province:'上海市',city:'上海',wage:10000,fundRate:7},{province:'上海市',city:'上海',wage:10000,fundRate:8},{city:'上海',wage:10000,fundRate:5.5},{city:'北京',wage:10000,fundRate:12},{province:'江苏省',city:'北京',wage:10000}]);
 assert.ok(rows[0].result);assert.match(rows[1].error,/仅可填/);assert.ok(rows[2].error);assert.ok(rows[3].result);assert.match(rows[4].error,/省份/);
});
test('工资不被基数上下限拒绝；不伪造缺依据的政策区间',()=>{
 const r=calculate('five-insurances-housing-fund',{city:'北京',wage:100000,fundRate:7});assert.equal(r.contribution.bases.fund.value,36348);
 const t=tools[0],f=t.fields.find(f=>f.key==='injuryRate');assert.equal(inputRule(t,f,{city:'北京',month:'2026-10'}).policy,false);
});
test('调薪可超过100%，人数须整数，日期和扣款关系不能冲突',()=>{
 assert.equal(calculate('salary-budget',{currentSalary:10000,increaseRate:150,effectiveMonth:1}).lines.find(l=>l.label==='调整后月薪').value,25000);
 assert.throws(()=>calculate('hr-metrics',{periodStart:'2026-10-01',periodEnd:'2026-09-30',opening:10,closing:10,joined:1,exited:1}),/止日/);
 assert.throws(()=>calculate('employment-cost',{salary:10000,social:0,fund:0,benefit:0,people:1.5,months:1}),/整数/);
 assert.throws(()=>calculate('take-home-pay',{salary:100,social:50,fund:50,tax:1,other:0}),/扣款/);
});
