import {cityPolicy} from './city-policies.js';
export const rangeSources={
 fundMin:'https://www.shanghai.gov.cn/qyzfgjjgjj/20240927/231b35b7e70d4c1289141867c849014c.html',
 fundMax:'https://www.ndrc.gov.cn/xwdt/ztzl/gbmjcbzc/zfjsb/201801/t20180119_1209892.html',
 shFund:'https://www.shzfgjj.cn/static/kfzl/zl-kuofu.html'
};
export function inputRule(tool,f,d={}){
 const rule={min:f.min??0,max:f.max??(f.unit==='%'?100:1000000000),integer:!!f.integer,source:'',policy:false};
 if(f.type==='number')rule.text=`${f.integer?'整数':'数字，最多两位小数'}；${rule.min>0?'至少 '+rule.min:'不得为负数'}${f.unit||''}。技术上限 ${rule.max}${f.unit||''}，不是政策上限。`;
 if(f.type==='select')rule.text='从选项中选择；只填写与实际情况相符的类型。';
 if(f.type==='month')rule.text='格式 YYYY-MM；参数按所选月份匹配，不沿用过期数据。';
 if(f.type==='date')rule.text=tool.id==='severance'&&f.key==='start'?'支持2008-01-01及以后入职；更早需历史分段。':'填写有效日期；结束日不得早于起始日。';
 if(tool.id==='five-insurances-housing-fund'){
  let p;try{p=cityPolicy(d.city,d.month,d);}catch{}
  if(['fundRate','fundCompanyRate'].includes(f.key)){
   rule.min=5;rule.max=p?.values.fundRateMax??12;rule.policy=true;rule.source=p?.evidence.fundRateMax?.source.url||rangeSources.fundMax;
   if(d.city==='上海'&&d.month>='2026-01'&&d.month<='2026-12'){rule.max=7;rule.allowed=[5,6,7];rule.source=rangeSources.shFund;}
   rule.text=rule.allowed?'普通缴存档位：5%、6%、7%。填7表示7%；特殊降比、缓缴不适用。':`普通缴存比例 ${rule.min}%—${rule.max}%；填7表示7%。${p?.values.fundRateMax===undefined?'这是全国外沿，本地允许档位尚待核验；须按单位已确定比例填写。':'按单位已确定比例填写。'}特殊降比、缓缴不适用。`;
   if(d.city==='广州'||(d.city==='深圳'&&f.key==='fundCompanyRate')){rule.integer=true;rule.text+=' 单位比例按整数百分点填写；广州个人比例也取整数。';}
   if(f.key==='fundCompanyRate'){rule.text+=' 留空沿用个人比例；单位不得高于个人。';rule.source=d.city==='广州'?'https://www.yuexiu.gov.cn/zmhd/hygq/content/post_10966810.html':'https://www.sz.gov.cn/hdjlpt/detail?pid=3466413&via=pc';}
  }else if(f.baseKind){
   const min=p?.values[f.baseKind+'Min'],max=p?.values[f.baseKind+'Max'];
   if(min!==undefined||max!==undefined){rule.min=min??0;rule.max=max??1000000000;rule.policy=true;rule.source=p.evidence[f.baseKind+(min!==undefined?'Min':'Max')].source.url;rule.text=`已核验${min===undefined?'下限尚缺':`下限 ${min} 元`}；${max===undefined?'上限尚缺':`上限 ${max} 元`}。填经办系统核定基数，不是当月工资。`;}
   else rule.text='当期政策上下限尚未核验，不能给出可靠区间。请填经办系统已核定基数；仅校验非负数及最多两位小数。';
  }else if(f.policyKey&&f.type==='number')rule.text=`本市本期适用值和政策范围尚缺依据，不提供猜测区间。填已核定值；${f.unit==='%'?'比例填百分数（0.5表示0.5%）':'金额填元'}，不得为负数，最多两位小数。`;
  else if(f.key==='injuryRate'){rule.max=100;rule.text='实际浮动费率由经办核定，尚无本市本期可用的完整范围。填百分数（0.2表示0.2%）；只做0—100的数值格式检查，这不是政策允许区间。';}
  else if(['wage','medicalWage','fundWage'].includes(f.key))rule.text='填真实缴费工资，不受缴费基数上下限限制；低于或高于基数范围时由系统自动保底、封顶。';
 }
 if(tool.id==='salary-budget'&&f.key==='increaseRate'){rule.max=1000000000;rule.text='增加比例≥0，填10表示增加10%；允许超过100%，不存在统一法定调薪比例上限。';}
 if(f.key==='effectiveMonth')rule.text='1—12的整数；生效月份自动计入当年剩余月数。';
 if(tool.id==='employment-cost'&&f.key==='months')rule.text='1—120的整数；120个月为本工具测算窗口上限，不是法律限制。';
 if(tool.id==='income-tax'&&f.key==='year')rule.text='本工具奖金政策支持2019—2027年；填写实际取得收入年度。';
 return rule;
}
export function numberError(tool,f,d){
 const raw=d[f.key];if(raw===undefined||raw===null||String(raw).trim()==='')return '';
 const n=Number(raw),r=inputRule(tool,f,d);
 if(!Number.isFinite(n)||n<r.min||n>r.max||(r.integer&&!Number.isInteger(n))||(r.allowed&&!r.allowed.includes(n)))return `${f.label}：${r.allowed?'仅可填 '+r.allowed.join('、'):r.policy?`应在 ${r.min}—${r.max}${f.unit||''} 内${r.integer?'，且为整数':''}`:`请输入 ${r.min}—${r.max} 的${r.integer?'整数':'数字'}`}。`;
 if(!r.integer&&Math.abs(n*100-Math.round(n*100))>0.00001)return `${f.label}：最多保留两位小数。`;
 return '';
}
export function relatedErrors(tool,d){
 const errors={},present=k=>d[k]!==undefined&&d[k]!==null&&String(d[k]).trim()!=='';
 if(tool.id==='five-insurances-housing-fund'&&['广州','深圳'].includes(d.city)&&present('fundCompanyRate')){
  if(!present('fundRate'))errors.fundRate='分别填写公积金比例时，请填写个人比例。';
  else if(Number(d.fundCompanyRate)>Number(d.fundRate))errors.fundCompanyRate='单位公积金比例不得高于个人比例。';
 }
 if(tool.id==='take-home-pay'&&['salary','social','fund','tax','other'].every(present)&&['social','fund','tax','other'].reduce((sum,k)=>sum+Number(d[k]),0)>Number(d.salary))errors.salary='扣款合计超过应发工资，请核对工资和各项扣款。';
 if(tool.id==='severance'){
  if(d.start&&d.start<'2008-01-01')errors.start='2008年前入职需要历史分段，本工具暂不支持。';
  if(d.end&&d.start&&d.end<d.start)errors.end='最后一日不能早于起始日。';
  if(present('minimum')&&present('localAverage')&&Number(d.minimum)>3*Number(d.localAverage))errors.minimum='最低工资高于三倍当地平均工资，请核对口径。';
 }
 if(tool.id==='hr-metrics'&&d.periodEnd&&d.periodStart&&d.periodEnd<d.periodStart)errors.periodEnd='统计止日不能早于起日。';
 if(tool.id==='income-tax'&&d.taxMode==='bonus'){
  if(d.priorMethod==='separate')errors.priorMethod='本人本年已使用一次单独计税，不能再次使用。';
  if(d.eligible==='no')errors.eligible='未确认奖金资格，不能套用单独计税。';
 }
 return errors;
}
