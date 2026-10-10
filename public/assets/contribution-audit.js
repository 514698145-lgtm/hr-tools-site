import {contributionTool,visibleContributionField} from './contribution-engine.js';
import {cityPolicy} from './city-policies.js';

// A field audit is a UI/data-coverage check, not proof that every local levy is known.
export function contributionFieldAudit(data){
 const p=cityPolicy(data.city,data.month,data);
 return contributionTool.fields.filter(f=>f.policyKey||f.baseKind).map(f=>{
  const manual=f.policyKey?p.values[f.policyKey]===undefined:p.values[f.baseKind+'Min']===undefined||p.values[f.baseKind+'Max']===undefined;
  const value=f.policyKey?p.values[f.policyKey]:[p.values[f.baseKind+'Min'],p.values[f.baseKind+'Max']];
  const keys=f.policyKey?[f.policyKey]:[f.baseKind+'Min',f.baseKind+'Max'];
  const sources=[...new Set(keys.map(k=>p.evidence[k]?.source.url).filter(Boolean))];
  return {key:f.key,label:f.label.split('（')[0],manual,value,sources,
   status:manual?'待补充：已提供填写入口':value===0?'自动采用0：本行不另计，详见来源':'已自动带入，无需重复填写'};
 });
}
