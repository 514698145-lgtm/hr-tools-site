import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {cityOptions,medicalPlans} from '../public/assets/city-policies.js';
import {contributionFieldAudit} from '../public/assets/contribution-audit.js';
import {contributionTool} from '../public/assets/contribution-engine.js';
import {fieldsFor} from '../public/assets/hr-tools.js';
import {templateSheets,matchesHeader} from '../public/assets/import-template.js';
const headers=templateSheets(contributionTool)[0].rows[0];
const details=[];let scenarios=0;
for(let m=1;m<=12;m++)for(const [city]of cityOptions)for(const [medicalPlan]of [[''],...(medicalPlans[city]||[])]){
 const data={city,month:`2026-${String(m).padStart(2,'0')}`,medicalPlan};
 const fields=fieldsFor(contributionTool,data),audit=contributionFieldAudit(data);
 for(const a of audit){assert.equal(fields.some(f=>f.key===a.key),a.manual,`${city}/${data.month}/${medicalPlan}/${a.key}`);assert.ok(headers.some(h=>matchesHeader(h,contributionTool.fields.find(f=>f.key===a.key))));if(!a.manual)assert.ok(a.sources.length);}
 for(const key of ['otherSocialP','otherSocialC','otherFundP','otherFundC'])assert.ok(fields.some(f=>f.key===key));
 scenarios++;if(m===10)details.push({...data,fields:audit});
}
await fs.writeFile('docs/contribution-field-audit-2026-10-02.json',JSON.stringify({checked:'2026-10-02',cities:50,scenarios,scope:'字段入口与模板对应检查；不代表50城所有地方缴费已完成政策核验',details},null,2));
console.log(`${scenarios} city/month/plan scenarios: all missing modeled fields have form and template inputs.`);
