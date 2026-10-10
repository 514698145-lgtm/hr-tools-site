import {provinces} from './city-picker.js';
import {numberError,relatedErrors} from './input-rules.js';
import {dateTool,dateCalculation} from './date-tools.js';
import {operationsTools,operationsCalculation} from './operations-tools.js';
import {ratioTool,contributionTool,severanceTool,taxExtraFields,fieldsFor,extraCalculation} from './hr-tools.js';
export const money = n => Number(n).toLocaleString('zh-CN', {minimumFractionDigits:2,maximumFractionDigits:2});
export const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
const field = (key,label,unit='元',extra={}) => ({key,label,unit,type:'number',...extra});
export const tools = [
 contributionTool,
 dateTool,
 {id:'income-tax',name:'个税计算器',short:'个税',icon:'receipt',category:'薪酬社保',description:'按工资薪金累计预扣口径，计算本期预扣税额。',tag:'累计预扣',color:'purple',fields:[field('income','本年累计收入'),field('deduction','累计免税收入与各项扣除'),field('relief','累计减免税额','元',{value:0}),field('paid','累计已预扣税额','元',{value:0})],note:'适用于居民个人工资薪金一般累计预扣。扣除输入包含累计免税收入、减除费用、专项扣除、专项附加扣除及其他依法扣除；不自动判断扣除资格。工资场景不覆盖特殊预扣规则；全年对比用于测算，不办理汇算申报。',source:'https://www.chinatax.gov.cn/chinatax/n810214/n810641/n2985871/n2985888/n2986028/c4001080/content.html'},
 severanceTool,
 {id:'take-home-pay',name:'到手工资计算器',short:'到手工资',icon:'wallet',category:'薪酬社保',description:'扣除社保、公积金和个税，快速核对实发工资。',tag:'工资核对',color:'blue',fields:[field('salary','当期应发工资'),field('social','个人社保金额'),field('fund','个人公积金金额'),field('tax','当期个税金额'),field('other','其他扣款','元',{value:0})],note:'实发工资＝应发工资－个人社保－个人公积金－当期个税－其他扣款。个税请填写已核算金额，本工具不将月薪直接套用年度税率。'},
 {id:'employment-cost',name:'用工成本计算器',short:'用工成本',icon:'chart',category:'企业成本',description:'汇总工资、单位缴费与福利，测算团队用工支出。',tag:'支持人数汇总',color:'rose',fields:[field('salary','人均月工资'),field('social','人均单位社保'),field('fund','人均单位公积金'),field('benefit','人均其他月支出','元',{value:0}),field('people','人数','人',{value:1,min:1,integer:true}),field('months','测算月数','月',{value:12,min:1,max:120,integer:true})],note:'按人员成本相同、测算期间不变计算。月成本包含输入的工资、单位社保、公积金及其他支出；不同岗位可批量逐行测算。'},
 ...operationsTools,
];
const incomeTool=tools.find(t=>t.id==='income-tax');
incomeTool.fields=[...taxExtraFields,...incomeTool.fields.map(f=>({...f,when:{key:'taxMode',values:['salary']}}))];
incomeTool.description='工资与奖金如何分配？按金额和比例测算最低全年税额。';
incomeTool.tag='工资 / 奖金 / 金额分配';
incomeTool.note+=' 奖金单独计税限每人每纳税年度一次，现行政策延续至2027年末；全年对比只输出数字，不改变申报。';
incomeTool.source='https://shanghai.chinatax.gov.cn/zcfw/rdwd/202501/t474844.html';
// Keep secondary amounts editable without expanding the first screen.
const supplementary={
 'income-tax':['relief','paid','annualRelief'],
 'take-home-pay':['other'],
 'employment-cost':['benefit'],
 'salary-budget':['department'],
 'hr-metrics':['department','transferIn','transferOut']
};
for(const tool of tools)for(const f of tool.fields)if(supplementary[tool.id]?.includes(f.key))f.advanced=true;
export function validate(tool,data) {
 const values={};
 const defaults=Object.fromEntries(tool.fields.filter(f=>f.value!==undefined).map(f=>[f.key,f.value]));
 data={...defaults,...data};
 for(const f of tool.fields.filter(f=>f.type==='select')){const match=f.options.find(o=>o[1]===String(data[f.key]));if(match)data[f.key]=match[0];}
 if(tool.id==='five-insurances-housing-fund'&&data.province&&(!provinces[data.province]||!provinces[data.province].includes(data.city)))throw Error('省份与参保城市不匹配');
 for (const f of fieldsFor(tool,data)) {
  const raw=data[f.key];
  if (raw===undefined || raw===null || String(raw).trim()===''){if(f.optional)continue;throw Error(`请填写${f.label}`);}
  if(f.type==='select'){const text=String(raw).trim();const option=f.options.find(o=>o[0]===text||o[1]===text);if(!option)throw Error(`${f.label}选项无效`);values[f.key]=option[0];data[f.key]=option[0];continue;}
  if(f.type==='month'){const text=String(raw).trim();if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(text))throw Error('月份需为 YYYY-MM');values[f.key]=text;continue;}
  if(f.type==='text'){const text=String(raw).trim();if(text.length>80)throw Error(`${f.label}最多80个字符`);values[f.key]=text;continue;}
  if (f.type==='date') {
   const text=String(raw).trim();const date=new Date(text+'T00:00:00Z');
   if (!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(+date)||date.toISOString().slice(0,10)!==text) throw Error(`${f.label}需为有效日期 YYYY-MM-DD`);
   values[f.key]=text;continue;
  }
  const n=Number(raw),problem=numberError(tool,f,data);if(problem)throw Error(problem);
  values[f.key]=n;
 }
 const cross=Object.values(relatedErrors(tool,values));if(cross.length)throw Error(cross[0]);
 return values;
}
export function calculate(id,input) {
 const tool=tools.find(t=>t.id===id);if(!tool)throw Error('未知工具');const d=validate(tool,input);const extra=id==='date-calculator'?dateCalculation(d):(operationsCalculation(id,d)||extraCalculation(id,d));if(extra){if(!Number.isFinite(extra.value)||Math.abs(extra.value)>Number.MAX_SAFE_INTEGER/100)throw Error('计算金额超出安全范围');return {toolId:id,toolName:tool.name,input:d,...extra};}let lines=[],label='',value=0,unit='元';
 const put=(label,value,unit='元')=>lines.push({label,value:unit==='元'?round(value):value,unit});
 if(id==='income-tax'){
  const taxable=Math.max(0,round(d.income-d.deduction));const rows=[[36000,3,0],[144000,10,2520],[300000,20,16920],[420000,25,31920],[660000,30,52920],[960000,35,85920],[Infinity,45,181920]];const [,rate,quick]=rows.find(r=>taxable<=r[0]);const total=Math.max(0,round(taxable*rate/100-quick-d.relief));
  put('累计应纳税所得额',taxable);put('适用预扣率',rate,'%');put('速算扣除数',quick);put('累计应预扣税额',total);put('累计已预扣税额',d.paid);label='本期应预扣税额';value=Math.max(0,round(total-d.paid));
 } else if(id==='take-home-pay'){
  const deductions=round(d.social+d.fund+d.tax+d.other);if(deductions>d.salary)throw Error('扣款总额大于应发工资，请核对输入');put('当期应发工资',d.salary);put('个人社保',d.social);put('个人公积金',d.fund);put('当期个税',d.tax);put('其他扣款',d.other);label='当期实发工资';value=round(d.salary-deductions);
 } else if(id==='employment-cost'){
  const per=round(d.salary+d.social+d.fund+d.benefit),month=round(per*d.people);put('人均月成本',per);put('团队月成本',month);put('测算人数',d.people,'人');put('测算月数',d.months,'月');label='测算期间总成本';value=round(month*d.months);
 } else {
  const a=new Date(d.start+'T00:00:00Z'),b=new Date(d.end+'T00:00:00Z');if(b<a)throw Error('截止日期不能早于入职日期');
  let months=(b.getUTCFullYear()-a.getUTCFullYear())*12+b.getUTCMonth()-a.getUTCMonth();
  const anchor=m=>{const y=a.getUTCFullYear(),mo=a.getUTCMonth()+m,last=new Date(Date.UTC(y,mo+1,0)).getUTCDate();return new Date(Date.UTC(y,mo,Math.min(a.getUTCDate(),last)));};
  if(anchor(months)>b)months--;const days=Math.round((b-anchor(months))/86400000);label='相隔总天数';value=Math.round((b-a)/86400000);unit='天';put('完整年数',Math.floor(months/12),'年');put('余下月数',months%12,'月');put('余下天数',days,'天');
 }
 if(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER/100)throw Error('计算金额过大，请减少人数或拆分测算');
 return {toolId:id,toolName:tool.name,label,value,unit,lines,input:d,version:id==='income-tax'?'cn-salary-withholding-2019-v1':'manual-v1'};
}
export function calculateBatch(id,rows){return rows.map((row,index)=>{try{return {row:index+2,label:String(row.recordLabel??index+1),result:calculate(id,row),error:null};}catch(e){return {row:index+2,label:String(row.recordLabel??index+1),result:null,error:e.message};}});}
