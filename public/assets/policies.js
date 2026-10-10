// Compatibility for the retired ratio calculator; current data has one source.
import {cityOptions,cityPolicy} from './city-policies.js';
export const cities=cityOptions.map(([name])=>name);
export function policyFor(city,month){
 const p=cityPolicy(city,month),socialMin=p.values.pensionMin,socialMax=p.values.pensionMax;
 if(socialMin===undefined||socialMax===undefined)throw Error('本市本期养老基数上下限尚未齐全');
 return {...p,socialMin,socialMax};
}
export function clampBase(wage,min,max){
 if(![wage,min,max].every(Number.isFinite)||min>max)throw Error('缴费工资或基数范围无效');
 return Math.min(max,Math.max(min,wage));
}
