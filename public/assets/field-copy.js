// Short input guidance; detailed definitions remain in the current user guide.
const copy={
 medicalPlan:'按实际参保类型选择。',wage:'通常填上年月均工资；新入职按当地口径。',
 medicalWage:'留空沿用社保工资；深圳按本人月工资。',fundWage:'通常填本人上年月均工资；留空沿用社保工资。',
 fundRate:'单位默认相同比例；留空不计公积金。',fundCompanyRate:'留空同个人，单位不得高于个人。',
 injuryRate:'填经办核定的实际费率，例如0.2表示0.2%。',
 otherSocialP:'只填本月尚未计入的社保费用。',otherSocialC:'只填本月尚未计入的社保费用。',
 otherFundP:'只填本月尚未计入的公积金金额。',otherFundC:'只填本月尚未计入的公积金金额。',
 allocationStage:'已取得的同一笔奖金不能任意拆分。',year:'按实际领取年度，支持2019—2027年。',
 eligible:'十三薪须确认奖金资格。',previousBonus:'仅支持一笔此前奖金；勿重复计入其他收入。',
 annualIncome:'不含两笔奖金；其他综合所得填税法换算后的收入额。',
 annualDeduction:'含基本减除、个人社保公积金及专项附加等扣除。',
 average:'不足12个月按实际月数平均，包含符合口径的奖金津贴。',
 localAverage:'填当地公布的补偿适用口径，不用社保基数替代。',
 effectiveMonth:'1—12月，按完整生效月份计算。'
};
export const fieldLabel=f=>f.label.replace('单位经办核定的实际工伤比例','单位工伤比例').replace('公积金个人比例（单位默认相同）','个人公积金比例').replace('（不同时填写）','').replace('（仅数据缺口时补充）','（待补充）').replace('（网站尚缺依据，可补充）','（待补充）');
export function fieldHint(tool,f,d,r){
 if(f.baseKind)return r.policy?`${r.min===0?'下限待核验':'下限 '+r.min+'元'}；${r.max===1000000000?'上限待核验':'上限 '+r.max+'元'}。清空后自动核定；上下限缺失时待填。`:'填员工已核定基数；范围待核验。';
 if(f.policyKey)return '可修改；清空恢复已接入值，缺项不计入。';
 if(['fundRate','fundCompanyRate'].includes(f.key))return `${r.allowed?'可选 '+r.allowed.join('、')+'%':`${r.min}—${r.max}%${r.integer?'，整数':''}`}${!r.allowed&&r.max===12?'（全国范围，本地档位以核定为准）':''}。${copy[f.key]}`;
 if(copy[f.key])return copy[f.key];
 if(tool.id==='severance'&&f.key==='start')return '仅支持2008年及以后入职。';
 if(f.key==='increaseRate')return '填10表示增加10%，可超过100%。';
 if(tool.id==='employment-cost'&&f.key==='months')return '1—120个月（测算范围）。';
 if(f.help)return f.help;
 if(f.type==='number'&&f.integer)return '填整数。';
 if(f.type==='number'&&f.unit==='%')return '填7表示7%。';
 return '';
}
