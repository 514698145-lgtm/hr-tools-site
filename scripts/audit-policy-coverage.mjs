// Regenerate after policy edits; missing entries are a research queue, never zero defaults.
import {writeFile} from 'node:fs/promises';
import {cityOptions,cityPolicy,medicalPlans} from '../public/assets/city-policies.js';
import {parameterLabels,baseKinds} from '../public/assets/contribution-engine.js';
const checked=process.argv[3]||new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});
const month=process.argv[2]||checked.slice(0,7);
if(!/^\d{4}-\d{2}-\d{2}$/.test(checked)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Invalid audit date or policy month');
const keys=[...Object.keys(parameterLabels),...Object.keys(baseKinds).flatMap(k=>[k+'Min',k+'Max']),'fundRounding','fundRateMax'];
const entries=cityOptions.flatMap(([city])=>(medicalPlans[city]||[['','普通企业职工']]).map(([medicalPlan,scope])=>{
 const p=cityPolicy(city,month,{medicalPlan});
 return {city,scope,medicalPlan,month,notes:p.notes,fields:Object.fromEntries(keys.map(key=>[key,p.values[key]===undefined?{status:'未取得足够的当期适用证据，不自动填值'}:{status:p.evidence[key].status,value:p.values[key],source:p.evidence[key].source,coveredMonths:[p.evidence[key].from,p.evidence[key].to]}])),manualInputs:['员工社保缴费工资（通常为上年月均工资）','医保及公积金工资口径不同时另填','单位实际工伤浮动比例','单位选定公积金比例'],quarantined:p.pending.map(x=>({source:x.source,reason:'仅有转载未复核，不自动采用'}))};
}));
await writeFile(`docs/policy-coverage-${checked}.json`,JSON.stringify({checked,month,note:'逐字段采用与缺口清单；未取得证据不代表政策不存在。适用月份为网站已接入窗口，不冒充文件法定有效期。',entries},null,2));
console.log(JSON.stringify({cities:cityOptions.length,scopes:entries.length,fields:entries.length*keys.length,verified:entries.reduce((n,x)=>n+Object.values(x.fields).filter(f=>f.value!==undefined).length,0)}));
