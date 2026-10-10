const n=(key,label,unit='人',extra={})=>({key,label,unit,type:'number',...extra});
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
export const operationsTools=[
 {id:'salary-budget',name:'调薪预算计算器',short:'调薪预算',icon:'chart',category:'企业成本',description:'按金额或比例调整月薪，汇总生效年度增量与部门预算。',tag:'调薪 / 部门汇总',color:'rose',fields:[{key:'department',label:'部门',type:'text',unit:'',optional:true},n('currentSalary','当前月薪','元'),{key:'adjustMode',label:'调整方式',type:'select',value:'percent',options:[['percent','按比例增加'],['amount','按金额增加'],['target','指定调整后月薪']]},n('increaseRate','增加比例','%',{when:{key:'adjustMode',values:['percent']}}),n('increaseAmount','增加金额','元',{when:{key:'adjustMode',values:['amount']}}),n('targetSalary','调整后月薪','元',{when:{key:'adjustMode',values:['target']}}),n('effectiveMonth','生效月份','月',{min:1,max:12,integer:true,value:1})],note:'按月薪×实际生效月数测算，生效月计为完整一个月。仅含12个月固定工资，不含奖金、社保、公积金、加班费及其他联动成本；每行一人、同一预算年度，重复行会重复计入。指定目标月薪可测算下降情景，不判断调整是否合法。'},
 {id:'hr-metrics',name:'HR 数据速算',short:'HR数据',icon:'chart',category:'人事数据',description:'核对人数流转，按明确分母计算入职率、离职率和净增人数。',tag:'人数 / 比率 / 口径',color:'blue',fields:[{key:'department',label:'统计部门',type:'text',unit:'',optional:true},{key:'periodStart',label:'统计起日',type:'date',unit:''},{key:'periodEnd',label:'统计止日',type:'date',unit:''},n('opening','期初在册人数','人',{integer:true}),n('closing','期末在册人数','人',{integer:true}),n('joined','期间入职人数','人',{integer:true}),n('exited','期间离职人数','人',{integer:true}),n('transferIn','调入及其他增加','人',{integer:true,value:0}),n('transferOut','调出及其他减少','人',{integer:true,value:0}),{key:'denominator',label:'比率分母',type:'select',value:'average',options:[['average','期初期末平均人数'],['opening','期初人数']]}],note:'平均人数=(期初+期末)÷2；入职率=入职÷所选分母，离职率=离职÷所选分母。调入调出另行输入，不与入职离职重复。不存在适用于所有公司的唯一口径；分母为0时比率显示不适用。批量逐行输出，不将不同期间的比率直接相加。'}
];
export function operationsCalculation(id,d){
 const line=(label,value,unit='元')=>({label,value,unit});
 if(id==='salary-budget'){
  const after=d.adjustMode==='target'?d.targetSalary:round(d.currentSalary+(d.adjustMode==='amount'?d.increaseAmount:d.currentSalary*d.increaseRate/100));
  const delta=round(after-d.currentSalary),months=13-d.effectiveMonth;
  return {label:'当年固定工资增量',value:round(delta*months),unit:'元',lines:[line('调整前月薪',d.currentSalary),line('调整后月薪',after),line('每月工资增量',delta),line('实际调整比例',d.currentSalary===0?'不适用':round(delta/d.currentSalary*100),'%'),line('当年生效月数',months,'月'),line('原年度固定工资',round(d.currentSalary*12)),line('调整后当年固定工资',round(d.currentSalary*12+delta*months)),line('全年化工资增量',round(delta*12))],version:'salary-budget-v1',messages:['按每行一人计算；当年增量按完整生效月份，不包含雇主缴费等联动成本。']};
 }
 if(id==='hr-metrics'){
  if(d.periodEnd<d.periodStart)throw Error('统计止日不能早于起日');
  const base=d.denominator==='opening'?d.opening:(d.opening+d.closing)/2,expected=d.opening+d.joined-d.exited+d.transferIn-d.transferOut;
  return {label:'期间净增人数',value:d.closing-d.opening,unit:'人',lines:[line('比率分母人数',base,'人'),line('入职率',base?round(d.joined/base*100):'不适用','%'),line('离职率',base?round(d.exited/base*100):'不适用','%'),line('流转推算期末人数',expected,'人'),line('期末核对差异',d.closing-expected,'人')],version:'hr-metrics-v1',messages:[`统计期间：${d.periodStart} 至 ${d.periodEnd}。${d.closing!==expected?'人数不平：期初 + 入职 − 离职 + 调入 − 调出与期末不一致，请核对。':'人数流转核对一致。'}`,!base?'分母为0，比率不适用；不会按0%处理。':'比率仅对应当前选择的分母。']};
 }
}
export function salaryGroups(batch){
 const groups=new Map();
 for(const r of batch){if(r.error||r.result?.toolId!=='salary-budget')continue;const d=r.result,group=d.input.department||'未填写部门';if(!groups.has(group))groups.set(group,{group,count:0,delta:0,total:0,annual:0});const g=groups.get(group);g.count++;g.delta+=Math.round(d.value*100);g.total+=Math.round(d.lines.find(x=>x.label==='调整后当年固定工资').value*100);g.annual+=Math.round(d.lines.find(x=>x.label==='全年化工资增量').value*100);}
 return [...groups.values()].map(g=>({...g,delta:g.delta/100,total:g.total/100,annual:g.annual/100}));
}
export function contributionTransfer(result,target){
 if(result.toolId!=='five-insurances-housing-fund'||!result.contribution)throw Error('没有可复用的缴费结果');
 const side=target==='take-home-pay'?'personal':target==='employment-cost'?'company':null;if(!side)throw Error('不支持的目标工具');
 const c=result.contribution;if(c[side+'Partial']||c.rows.some(r=>r[side]===null))throw Error('该方缴费尚不完整，请补齐参数后再带入');
 let social=0,fund=0;for(const r of c.rows){if(/公积金/.test(r.label))fund+=r[side];else social+=r[side];}
 return {target,input:{social:round(social),fund:round(fund)},source:`五险一金计算结果 · ${result.input.city} · ${result.input.month}`,at:Date.now()};
}
