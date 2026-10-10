import test from 'node:test';import assert from 'node:assert/strict';
import {calculate} from '../public/assets/calculators.js';
import {cityOptions,cityPolicy} from '../public/assets/city-policies.js';
import {contributionTool} from '../public/assets/contribution-engine.js';
import {contributionFieldAudit} from '../public/assets/contribution-audit.js';
import {fieldsFor} from '../public/assets/hr-tools.js';
import {contributionTransfer} from '../public/assets/operations-tools.js';
const id='five-insurances-housing-fund';
test('全部50城缺项均可通过显示的字段补齐，未知值不擅自记0',()=>{
 for(const [city]of cityOptions){
  const d={city,month:'2026-10',wage:10000,fundRate:7,injuryRate:.2};
  const active=fieldsFor(contributionTool,d);
  for(const a of contributionFieldAudit(d).filter(a=>a.manual)){
   assert.ok(active.some(f=>f.key===a.key),city+'/'+a.key);
   const f=active.find(f=>f.key===a.key);d[a.key]=f.baseKind?10000:f.key==='fundRounding'?'0':0;
  }
  assert.equal(calculate(id,d).partial,false,city+' synthetic completed inputs');
 }
});
test('北京医保分列不重复加1%；其他社保附加金额分属个人公司',()=>{
 const d={city:'北京',month:'2026-10',wage:10000,fundRate:7,injuryRate:.2},a=calculate(id,d),b=calculate(id,{...d,otherSocialP:12,otherSocialC:34});
 assert.equal(cityPolicy('北京','2026-10').values.medicalC,8.8);
 assert.equal(a.contribution.rows.find(r=>r.label==='大额医疗互助（单位比例）').company,100);
 assert.equal(a.contribution.rows.find(r=>r.label==='医疗保险').company,880);
 assert.equal(b.contribution.personal-a.contribution.personal,12);assert.equal(b.contribution.company-a.contribution.company,34);
 const c=calculate(id,{...d,otherSocialP:12,otherSocialC:34,otherFundP:50,otherFundC:80});
 assert.deepEqual(contributionTransfer(c,'take-home-pay').input,{social:1065,fund:750});
 assert.deepEqual(contributionTransfer(c,'employment-cost').input,{social:2684,fund:780});
});
test('公积金个人与公司分别测算，关系错误阻止计算',()=>{
 const d={city:'深圳',month:'2026-10',wage:10000,fundBase:10000,fundRate:12,fundCompanyRate:6,fundRounding:'0'};
 const r=calculate(id,d).contribution.rows.find(r=>r.label==='住房公积金');assert.equal(r.personal,1200);assert.equal(r.company,600);
 assert.throws(()=>calculate(id,{...d,fundCompanyRate:12,fundRate:6}),/不得高于/);
 assert.throws(()=>calculate(id,{...d,fundRate:''}),/个人比例/);
 assert.throws(()=>calculate(id,{...d,fundCompanyRate:6.5}),/整数/);
});
