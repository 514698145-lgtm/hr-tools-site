import {cityPolicy,cityOptions,medicalPlans} from './city-policies.js';
const n=(key,label,unit='元',extra={})=>({key,label,unit,type:'number',...extra});
export const parameterLabels={pensionP:'养老个人比例',pensionC:'养老公司比例',medicalP:'医保个人比例',medicalC:'医保公司比例',medicalExtraC:'医疗附加公司比例',birthC:'单列生育公司比例（已含则填0）',unemploymentP:'失业个人比例',unemploymentC:'失业公司比例',fixedP:'个人固定附加费（月）',fixedC:'公司固定附加费（月）'};
export const baseKinds={pension:'养老',medical:'医疗与生育',unemployment:'失业',injury:'工伤',fund:'公积金'};
export const contributionTool={id:'five-insurances-housing-fund',name:'五险一金计算器',short:'五险一金',icon:'building',category:'薪酬社保',description:'按城市与月份带出已核验参数，分别计算个人和公司缴费。',tag:'城市参数 · 个人 / 公司',color:'orange',fields:[
 {key:'city',label:'参保城市',type:'select',options:cityOptions,value:'上海'},
 {key:'month',label:'缴费月份',type:'month',value:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit'}).format(new Date())},
 {key:'medicalPlan',label:'医保参保类型',type:'select',options:Object.values(medicalPlans).flat(),when:{key:'city',values:Object.keys(medicalPlans)},help:'按实际参保类型选择；留空时不套用某一档医保费率。'},
 n('wage','社保缴费工资','元',{help:'在职职工通常填上年度月平均工资性收入，不是到手工资；新入职按当地核定口径。上下限已核验时自动保底、封顶。'}),n('medicalWage','医保缴费工资（不同时填写）','元',{help:'留空沿用社保缴费工资。深圳医保按本人月工资收入，请按实际口径调整。'}),n('fundWage','公积金缴费工资（不同时填写）','元',{help:'通常为员工本人上年度月平均工资；新参加工作一般按第二个月工资、新调入按调入后工资核定。留空沿用主表工资。城市上下限齐全时自动计算基数。'}),
 n('fundRate','公积金个人比例（单位默认相同）','%',{min:5,max:12,help:'单位默认采用相同比例；广州、深圳可展开填写不同的单位比例。不确定可留空，本次结果将不含公积金。'}),
 n('supplementRate','补充公积金比例','%',{value:0,max:5,when:{key:'city',values:['上海']}}),
 n('injuryRate','单位经办核定的实际工伤比例','%',{max:10,help:'请填已应用行业类别和浮动档次后的实际比例。'}),
 ...Object.entries(baseKinds).map(([key,label])=>n(key+'Base',label+'本次缴费基数','元',{baseKind:key,help:'仅因网站缺少当期完整上下限而显示。可填员工经办系统已核定的基数；不是城市统一值。留空则该项目暂不计入；政策齐全时由工资自动计算，无需填写。'})),
 ...Object.entries(parameterLabels).map(([key,label])=>n(key,label,key.startsWith('fixed')?'元':'%',{policyKey:key})),
 {key:'fundRounding',label:'当地公积金金额取整规则（待确认）',type:'select',options:[['0','单位和个人各四舍五入至元'],['2','单位和个人各四舍五入至分']],policyKey:'fundRounding'},
 n('fundCompanyRate','单位公积金比例（与个人不同时填写）','%',{min:5,max:12,when:{key:'city',values:['广州','深圳']},help:'本页公积金主比例作为个人比例；此项留空时单位与个人相同。仅按经办已确定比例填写，单位比例不得高于个人。'}),
 n('otherSocialP','其他已核定社保附加费 · 个人','元',{help:'选填。本月另行征收且未包含在上方项目中的已核定金额，如未建模的大额医疗、长期护理等；不要重复填写已自动计入的费用，不填公积金或商业保险。年度集中扣费按实际扣费月填写，不自动均摊。'}),
 n('otherSocialC','其他已核定社保附加费 · 公司','元',{help:'选填。仅填本月另行征收且上方未计入的社保附加金额；网站不据此判断该费用是否适用。留空只表示未另加金额，不证明当地没有其他费用。'}),
 n('otherFundP','其他已核定公积金金额 · 个人','元',{help:'选填。仅填本月未包含在普通或上海补充公积金项目中的已核定金额，如其他地区补充公积金。不重复填普通公积金，不用来覆盖基数或冲减已计入金额。'}),
 n('otherFundC','其他已核定公积金金额 · 公司','元',{help:'选填。仅填本月尚未计入的其他公积金实际金额。与社保附加费分别汇总，带入工资/成本时归入公积金。'})
 ],note:'普通企业职工口径。目录覆盖不代表所有参数完整：有官方依据且适用的参数自动采用；缺项不会按0处理。城市与月份决定政策上下限，员工缴费工资决定个人基数，上下限齐全时自动保底、封顶。医保按实际类型选择；苏州吴江与工业园区分别选择，其他区域尚未接入时按实际核定值补充。工伤实际费率、公积金单位选定比例需自行提供。固定附加费按本月实际应缴额填写，不将年缴费用擅自摊到每月。公积金按当地取整规则计算，广州、深圳支持填写不同的单位比例；不支持减免、缓缴、特殊人群。'};
for(const f of contributionTool.fields){f.optional=!['city','month','wage'].includes(f.key);f.advanced=!['city','month','wage','medicalPlan'].includes(f.key);}
export function visibleContributionField(){return true;}
// Both the live preview and calculation use this resolver; empty inputs are never converted to zero.
export function contributionBases(d,p=cityPolicy(d.city,d.month,d)){
 const number=x=>x===undefined||x===null||String(x).trim()===''?undefined:Number.isFinite(Number(x))?Number(x):undefined;
 return Object.fromEntries(Object.keys(baseKinds).map(k=>{
  const wage=number(k==='fund'?(d.fundWage||d.fundWage===0?d.fundWage:d.wage):k==='medical'?(d.medicalWage||d.medicalWage===0?d.medicalWage:d.wage):d.wage),min=p.values[k+'Min'],max=p.values[k+'Max'];
  const override=number(d[k+'Base']);if(override!==undefined)return [k,{value:override,wage,min,max,reason:'采用手动核定基数',automatic:false}];
  if(min!==undefined&&max!==undefined){const value=wage===undefined?undefined:Math.min(max,Math.max(min,wage));return [k,{value,wage,min,max,reason:value===undefined?'等待员工缴费工资':wage<min?'按下限保底':wage>max?'按上限封顶':'按员工缴费工资',automatic:true}];}
  const value=number(d[k+'Base']);return [k,{value,wage,min,max,reason:value===undefined?'当期上下限未齐，暂不能自动核定':'采用 HR 提供的已核定基数',automatic:false}];
 }));
}
export function calculateContribution(d){
 if(d.medicalPlan&&!medicalPlans[d.city]?.some(([key])=>key===d.medicalPlan))throw Error('医保参保类型与城市不匹配，请重新选择');
 const p=cityPolicy(d.city,d.month,d);
 const v={...p.values,...Object.fromEntries(Object.entries(d).filter(([,value])=>value!==undefined&&value!==null&&String(value).trim()!==''))};if(d.fundRate>(v.fundRateMax??12))throw Error('公积金比例超过本市普通缴存上限');
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;const bases=contributionBases(d,p),base=Object.fromEntries(Object.entries(bases).map(([k,x])=>[k,x.value]));
 const rows=[];const add=(label,b,a,c,precision=2)=>{const amount=rate=>rate===0?0:!Number.isFinite(b)||!Number.isFinite(rate)||!Number.isFinite(precision)?null:Math.round((b*rate/100+Number.EPSILON)*10**precision)/10**precision;rows.push({label,base:b??null,personalRate:a??null,companyRate:c??null,personal:amount(a),company:amount(c)});};
 add('养老保险',base.pension,v.pensionP,v.pensionC);add('医疗保险',base.medical,v.medicalP,v.medicalC);add('医疗附加',base.medical,0,v.medicalExtraC);add('生育保险（单列部分）',base.medical,0,v.birthC);add('失业保险',base.unemployment,v.unemploymentP,v.unemploymentC);add('工伤保险',base.injury,0,d.injuryRate);add('住房公积金',base.fund,d.fundRate,d.fundCompanyRate??d.fundRate,Number(v.fundRounding));if(d.city==='上海')add('补充公积金',base.fund,d.supplementRate??0,d.supplementRate??0,Number(v.fundRounding));rows.push({label:'固定附加费',base:null,personalRate:null,companyRate:null,personal:v.fixedP??null,company:v.fixedC??null});
 if(d.otherSocialP!==undefined||d.otherSocialC!==undefined)rows.push({label:'其他已核定社保附加费（手填）',base:null,personalRate:null,companyRate:null,personal:d.otherSocialP??0,company:d.otherSocialC??0});
 if(d.otherFundP!==undefined||d.otherFundC!==undefined)rows.push({label:'其他已核定公积金（手填）',base:null,personalRate:null,companyRate:null,personal:d.otherFundP??0,company:d.otherFundC??0});
 if(d.city==='北京'){rows.find(r=>r.label==='医疗附加').label='大额医疗互助（单位比例）';rows.find(r=>r.label==='固定附加费').label='大额医疗互助等固定缴费';}
 if(!rows.some(x=>(x.personalRate>0&&x.personal!==null)||(x.companyRate>0&&x.company!==null)||(['固定附加费','大额医疗互助等固定缴费','其他已核定社保附加费（手填）'].includes(x.label)&&(x.personal>0||x.company>0))))throw Error('本市本期参数不足，暂时无法形成缴费小计。可展开补充已知参数，或切换到已有政策数据的城市和月份。');
 const missing=rows.flatMap(x=>[...(x.personal===null?[x.label+'（个人）']:[]),...(x.company===null?[x.label+'（公司）']:[])]),partial=missing.length>0;
 const personal=round(rows.reduce((n,r)=>n+(r.personal??0),0)),company=round(rows.reduce((n,r)=>n+(r.company??0),0));
 const personalPartial=rows.some(x=>x.personal===null),companyPartial=rows.some(x=>x.company===null);
 const lines=[{label:personalPartial?'个人已知项目小计（不完整）':'个人缴费合计',value:personal,unit:'元'},{label:companyPartial?'公司已知项目小计（不完整）':'公司缴费合计',value:company,unit:'元'},...rows.flatMap(r=>[{label:r.label+' · 个人'+(r.personal===null?'（未计入）':''),value:r.personal,unit:'元'},{label:r.label+' · 公司'+(r.company===null?'（未计入）':''),value:r.company,unit:'元'},...(r.base===null?[]:[{label:r.label+' · 基数',value:r.base,unit:'元'},{label:r.label+' · 个人比例',value:r.personalRate,unit:'%'},{label:r.label+' · 公司比例',value:r.companyRate,unit:'%'}])])];
 return {label:partial?'已知项目小计 · 非全部缴费':'个人与公司缴费总额',value:round(personal+company),unit:'元',lines,partial,contribution:{personal,company,personalPartial,companyPartial,rows,missing,bases},messages:[...(d.city==='深圳'?['养老公司16%为基本养老费率；深圳户籍另有单位地方补充养老1%，未自动计入，请在其他公司社保附加费填写实际核定额，勿重复填。依据：https://www.sz.gov.cn/hdjlpt/detail?pid=3072960']:[]),'本次结果按已列项目核算；未单独建模的地方社保附加费用须按经办实际金额补充，留空不代表不存在。',...(partial?['尚未计入：'+missing.join('、')+'。空白不是零，请补齐后再核对全部缴费。']:[]),'医保与公积金缴费工资未单填时沿用社保缴费工资；不同口径请展开调整。',...Object.entries(bases).filter(([,b])=>b.value!==undefined).map(([k,b])=>baseKinds[k]+'基数 '+b.value+' 元：'+b.reason+'。'),...(medicalPlans[d.city]?[d.medicalPlan?'医保类型：'+medicalPlans[d.city].find(([key])=>key===d.medicalPlan)[1]:'未选择医保参保类型，未自动套用医保费率。']:[])],version:p.version+'/partial-v3'};
}
