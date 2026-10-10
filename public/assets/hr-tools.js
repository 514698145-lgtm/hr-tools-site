import {contributionTool,visibleContributionField,calculateContribution} from './contribution-engine.js';
export {contributionTool};
import {allocateTax} from './tax-allocation.js';
import {cities,policyFor,clampBase} from './policies.js';
const num=(key,label,extra={})=>({key,label,type:'number',unit:'元',...extra});
const select=(key,label,options,extra={})=>({key,label,type:'select',options:options.map(x=>Array.isArray(x)?x:[x,x]),...extra});
const when=(key,values)=>({key,values});
const cityFields=[select('city','参保城市',cities,{value:'上海'}),{key:'month',label:'缴费月份',type:'month',value:'2026-09'}];
const wageField=num('wage','社保核定前工资',{help:'在职员工填上年月均工资；新进员工填按当地规则确定的工资性收入。系统自动保底、封顶。'});
export const ratioTool={id:'contribution-ratio',name:'社保夯实率测算',short:'社保夯实率',icon:'shield',category:'薪酬社保',description:'核对缴费基数与工资，批量汇总比例和逐人差额。',tag:'优先工具 · 双口径',color:'green',fields:[
 select('ratioMode','计算口径',[['detail','员工明细 · 核定基数比率'],['totals','年度总额 · 工资对照比率']],{value:'detail'}),
 ...cityFields.map(f=>({...f,when:when('ratioMode',['detail'])})),{...wageField,when:when('ratioMode',['detail'])},num('actualBase','实际申报社保基数',{when:when('ratioMode',['detail'])}),
 num('baseYear','缴费基数所属年度',{unit:'年',integer:true,min:2000,max:2100,value:2026,when:when('ratioMode',['totals'])}),
 num('actualTotal','本年度实际申报基数总额',{when:when('ratioMode',['totals']),help:'完整12个月总额；不要用月基数除以全年工资。'}),num('wageTotal','上年度对应人员工资总额',{min:.01,when:when('ratioMode',['totals'])}),
 select('cohort','人员与期间口径确认',[['confirmed','已按同一人员范围核对，并采用完整年度总额']],{when:when('ratioMode',['totals']),help:'退休返聘、人员进出、非工资报酬等需先核对纳入范围；不自动将个税收入等同社保工资。'})
 ],note:'社保夯实率通常用于观察实际申报基数相对工资依据的落实程度，公开资料分母口径并不一致。本工具明确区分：年度工资对照比率＝本年实际申报基数总额÷上年对应人员工资总额；员工核定基数比率＝实际申报基数÷按当地上下限核定的基数。两者不能混作同一指标。批量按同口径求和后相除，不平均个人百分比；差额逐人计算，不以超额冲抵不足。不设置未经核实的全国70%或90%合规线。',source:'https://liaoning.chinatax.gov.cn/art/2026/6/1/art_1923_167578.html'};
const taxWhen=m=>when('taxMode',m);
export const taxExtraFields=[
 select('taxMode','计算场景',[['salary','工资 · 累计预扣'],['bonus','全年一次性奖金 · 单独计税'],['compare','工资与奖金 · 全年税额对比'],['optimize','HR参考 · 工资奖金金额分配']],{value:'salary'}),
 select('allocationStage','本次金额所处阶段',[['planning','尚未发放，薪酬构成可依法调整'],['received','已发放 / 已确定为同一笔年终奖']],{when:taxWhen(['optimize']),help:'已取得的一笔年终奖不能任意拆分。发放前测算也不改变工资、奖金的真实性和资格要求。'}),
 num('year','实际取得收入年度',{unit:'年',integer:true,min:2019,max:2027,value:2026,when:taxWhen(['bonus','compare','optimize']),help:'按实际领取年度判断，不按奖金对应的考核年度。当前政策核验至2027年。'}),
 num('bonus','本次奖金 / 十三薪金额',{when:taxWhen(['bonus','compare','optimize'])}),
 select('eligible','本次收入是否符合全年一次性奖金条件',[['yes','已确认符合'],['no','不符合 / 尚未确认']],{when:taxWhen(['bonus','compare','optimize']),help:'“十三薪”名称本身不能确定资格，需符合全年考核等政策条件。'}),
 select('priorMethod','本年度此前奖金计税情况',[['none','此前未领取奖金且未使用单独计税'],['merged','此前奖金已并入综合所得，全年未用单独计税'],['separate','本人本年已使用一次单独计税（含其他单位）']],{when:taxWhen(['bonus','compare','optimize'])}),
 num('previousBonus','此前已领奖金金额',{when:{key:'priorMethod',values:['merged','separate']},scope:['compare','optimize'],help:'不计入下方常规收入，再由系统加入；本年仅支持这一笔此前奖金。'}),
 num('annualIncome','全年其他综合所得收入额',{when:taxWhen(['compare','optimize']),help:'不含本次和此前奖金；其他综合所得填按税法换算后的收入额，勿直接填劳务报酬总流水。'}),
 num('annualDeduction','全年免税收入与扣除合计',{when:taxWhen(['compare','optimize']),help:'包含基本减除费用、个人社保公积金、专项附加及其他依法扣除，避免重复扣除。'}),
 num('annualRelief','综合所得年度减免税额',{value:0,when:taxWhen(['compare','optimize'])})
];
export const severanceTool={id:'severance',name:'离职补偿金计算器',short:'离职补偿金',icon:'briefcase',category:'劳动关系',description:'按已确认的补偿类型，核算年限、工资封顶及税前金额。',tag:'N / N+1 / 2N',color:'sand',fields:[
 select('formula','已确认适用的计算类型',[['N','经济补偿 · N'],['N1','第40条未提前30日书面通知 · N+代通知金'],['2N','违法解除 / 终止赔偿 · 2N']]),
 {key:'start',label:'连续工作起始日',type:'date'},{key:'end',label:'劳动关系最后一日（含当日）',type:'date'},
 num('average','解除前12个月平均应得月工资',{help:'工作不足12个月按实际工作月数平均，包含符合口径的奖金、津贴等。'}),
 num('localAverage','当地上年度职工月平均工资',{min:.01,help:'第47条适用的当地政府公布口径；不能直接用社保基数反推或替代。地方补偿参数库尚待核验。'}),
 num('minimum','当地适用月最低工资',{min:.01}),num('lastSalary','上一个月工资（代通知金基数）',{when:when('formula',['N1'])})
 ],note:'仅计算已确认适用的税前金额，不判断解除是否合法或是否应支付。N：满一年计1个月，余下不满6个月计0.5个月，满6个月计1个月；起止日均计入服务期。月工资高于当地上年度职工月平均工资3倍时，以3倍封顶且年限最多12年；未超过3倍不一律限制12年。平均工资低于当地最低工资按最低工资计算。代通知金按上一个月工资另算，不直接以平均工资替代。2008年前入职等需历史分段的情形暂不支持；不包含特殊人群待遇、欠薪、未休年假或税后金额。',source:'https://rsj.sh.gov.cn/trlzyhshbzbgz_17256/20200617/t0035_1388322.html'};
export function fieldsFor(tool,data){const d={...Object.fromEntries(tool.fields.filter(f=>f.value!==undefined).map(f=>[f.key,f.value])),...data};return tool.fields.filter(f=>(tool.id!=='five-insurances-housing-fund'||visibleContributionField(f,d))&&(!f.scope||(Array.isArray(f.scope)?f.scope.includes(d.taxMode):d.taxMode===f.scope))&&(!f.when||f.when.values.includes(d[f.when.key])));}
const r=n=>Math.round((n+Number.EPSILON)*100)/100;
const annualTable=[[36000,.03,0],[144000,.1,2520],[300000,.2,16920],[420000,.25,31920],[660000,.3,52920],[960000,.35,85920],[Infinity,.45,181920]];
export function annualTax(income,deduction=0,relief=0){const taxable=Math.max(0,r(income-deduction));const [,rate,quick]=annualTable.find(a=>taxable<=a[0]);return Math.max(0,(Math.round(Math.round(taxable*100)*Math.round(rate*100)/100)-Math.round(quick*100)-Math.round(relief*100))/100);}
export function bonusTax(amount){const [,rate,annualQuick]=annualTable.find(a=>amount<=a[0]);return {tax:(Math.round(Math.round(amount*100)*Math.round(rate*100)/100)-annualQuick*100/12)/100,rate:rate*100,quick:annualQuick/12};}
export function extraCalculation(id,d){let lines=[],messages=[],label='',value=0,unit='元',version='hr-20260925-v2',summary=null;const put=(label,value,unit='元')=>lines.push({label,value:r(value),unit});
 if(id==='contribution-ratio'){
  let expected,actual,group;
  if(d.ratioMode==='detail'){const p=policyFor(d.city,d.month);expected=clampBase(d.wage,p.socialMin,p.socialMax);actual=d.actualBase;version=p.version;group=`员工明细 · ${d.month}`;put('核定前工资',d.wage);put('当地基数下限',p.socialMin);put('当地基数上限',p.socialMax);put('核定后应缴基数',expected);put('实际申报基数',actual);put('基数不足差额',Math.max(0,expected-actual));put('基数超额差额',Math.max(0,actual-expected));label='员工核定基数比率';}
  else{expected=d.wageTotal;actual=d.actualTotal;group=`年度工资对照 · ${d.baseYear}/${d.baseYear-1}`;put(`${d.baseYear}年实际申报基数总额`,actual);put(`${d.baseYear-1}年对应人员工资总额`,expected);label='年度工资对照比率';messages.push('此比率未对工资逐人保底封顶，不等同员工核定基数比率；人员与年度口径以输入确认为准。');}
  value=r(actual/expected*100);unit='%';summary={group,actual,expected,shortfall:d.ratioMode==='detail'?Math.max(0,expected-actual):null};
 }else if(id==='five-insurances-housing-fund'){
  return calculateContribution(d);
 }else if(id==='income-tax'&&d.taxMode!=='salary'){
  version='cn-bonus-through-2027-v2';const used=d.priorMethod==='separate';const eligible=d.eligible==='yes';
  if(d.taxMode==='optimize'){const a=allocateTax(d);value=a.tax;label='给定条件下最低全年税额';put('本次计入工资 / 综合所得',a.wage);put('计入工资 / 综合所得比例',a.wagePercent,'%');put('本次单独计税奖金',a.bonus);put('单独计税奖金比例',a.bonusPercent,'%');put('本次全并入、此前方式不变的全年税额',a.baseline);put('相比上述口径少缴税额',a.saving);messages.push(a.previousChoice);messages.push(a.used?'本人本年已使用单独计税，本次分配限定为100%并入；同时对照此前奖金整笔并入的汇算结果。':!a.eligible?'本次奖金资格未确认，单独计税分配额限定为0。':a.planning?'这是发放前薪酬构成的数值测算：计入工资部分须按真实工资发放，奖金部分须满足全年一次性奖金条件；不适用于拆分已取得的一笔奖金。':'本次已确定为一笔奖金，只比较整笔并入或整笔单独计税，不拆分。');messages.push('以分为单位检查税率临界点及取整；同税额时展示单独计税奖金较少的一组。仅比较输入范围，不含未输入的收入和减免。');}
  else if(d.taxMode==='bonus'){if(used)throw Error('本人本年已使用一次单独计税，本笔不能再次使用；请切换全年税额对比');if(!eligible)throw Error('尚未确认符合全年一次性奖金条件，不能套用单独计税');const b=bonusTax(d.bonus);value=b.tax;label='本次奖金单独计税税额';put('适用税率',b.rate,'%');put('速算扣除数',b.quick);put('本次税后奖金',d.bonus-value);}
  else{const prior=d.priorMethod==='none'?0:d.previousBonus;const merged=annualTax(d.annualIncome+prior+d.bonus,d.annualDeduction,d.annualRelief);put('A · 全部并入综合所得税额',merged);let alternative=null;
   if(used){alternative=r(annualTax(d.annualIncome+d.bonus,d.annualDeduction,d.annualRelief)+bonusTax(prior).tax);put('B · 保留此前单独计税＋本次并入',alternative);messages.push('本年度已用过单独计税：本次不得再单独计税。A为年度汇算将此前奖金并入的测算，B为保留此前计税方式。');}
   else if(eligible){alternative=r(annualTax(d.annualIncome+prior,d.annualDeduction,d.annualRelief)+bonusTax(d.bonus).tax);put('B · 本次单独计税＋其他并入',alternative);}
   else messages.push('本次奖金资格未确认，仅显示并入综合所得的测算。');
   value=alternative===null?merged:Math.min(merged,alternative);label=alternative===null?'并入后的全年税额':merged===alternative?'两种口径全年税额相同':merged<alternative?'A 口径全年税额较低':'B 口径全年税额较低';put('两种口径全年税额差',alternative===null?0:Math.abs(merged-alternative));put('全年收入额合计',d.annualIncome+prior+d.bonus);messages.push('对比为全年最终税额，不是12月预扣税额；仅含输入收入和扣除，不自动变更既有申报。');
  }
 }else if(id==='severance'){
  if(d.start<'2008-01-01')throw Error('2008年前入职涉及历史分段，本版暂不计算');const start=new Date(d.start+'T00:00:00Z'),end=new Date(d.end+'T00:00:00Z');if(end<start)throw Error('最后一日不能早于起始日');end.setUTCDate(end.getUTCDate()+1);
  const anchor=m=>{const mo=start.getUTCMonth()+m,y=start.getUTCFullYear(),day=Math.min(start.getUTCDate(),new Date(Date.UTC(y,mo+1,0)).getUTCDate());return new Date(Date.UTC(y,mo,day));};
  let years=end.getUTCFullYear()-start.getUTCFullYear();if(anchor(years*12)>end)years--;const rem=end-anchor(years*12);let n=years+(rem===0?0:end>=anchor(years*12+6)?1:.5);
  const high=d.average>3*d.localAverage;if(d.minimum>3*d.localAverage)throw Error('最低工资高于三倍当地平均工资，请核对口径');const wage=high?3*d.localAverage:Math.max(d.average,d.minimum);const originalN=n;if(high)n=Math.min(n,12);const compensation=r(n*wage),notice=d.formula==='N1'?d.lastSalary:0;
  put('原始折算补偿月数',originalN,'个月');put('适用补偿月数',n,'个月');put('补偿月工资基数',wage);put(d.formula==='2N'?'赔偿金（2N）':'经济补偿金（N）',compensation*(d.formula==='2N'?2:1));if(d.formula==='N1')put('代通知金',notice);value=r(compensation*(d.formula==='2N'?2:1)+notice);label='税前测算金额';if(high)messages.push('已应用高工资三倍封顶和12年年限上限。');
 }else return null;
 return {label,value,unit,lines,messages,version,summary};
}
export function summarizeRatio(batch){const groups=new Map();for(const row of batch){const s=row.result?.summary;if(!s)continue;const g=groups.get(s.group)||{group:s.group,actual:0,expected:0,shortfall:s.shortfall===null?null:0,count:0};g.actual+=s.actual;g.expected+=s.expected;if(g.shortfall!==null)g.shortfall+=s.shortfall;g.count++;groups.set(s.group,g);}return [...groups.values()].map(g=>({...g,actual:r(g.actual),expected:r(g.expected),shortfall:g.shortfall===null?null:r(g.shortfall),ratio:r(g.actual/g.expected*100)}));}
