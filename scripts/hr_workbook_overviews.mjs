// Specialized first sheets for analytical workbooks. Every formula points to the editable detail.
export const overviewIds=['payroll-check','channel-review','benefit-budget','annual-leave','contract-ledger','candidate-tracker','training-plan','asset-return'];
export function fillOverview(sheet,t){
 const ref="'"+t.title.replaceAll("'","''")+"'!",sum=c=>`SUM(${ref}${c}8:${c}36)`,count=c=>`COUNTA(${ref}${c}8:${c}36)`,ct=(c,s)=>`COUNTIF(${ref}${c}8:${c}36,"${s}")`;
 const map={
 'payroll-check':[['应发合计',sum('F'),'元'],['个人社保',sum('G'),'元'],['个人公积金',sum('H'),'元'],['个税扣款',sum('I'),'元'],['其他扣款',sum('J'),'元'],['实发合计',sum('K'),'元']],
 'channel-review':[['投递数量',sum('C'),'人'],['有效候选',sum('D'),'人'],['面试人数',sum('E'),'人'],['录用人数',sum('F'),'人'],['实际到岗',sum('G'),'人'],['渠道投入',sum('H'),'元']],
 'benefit-budget':[['预算金额',sum('E'),'元'],['实际金额',sum('F'),'元'],['超支或节余',sum('G'),'元']],
 'annual-leave':[['核定额度',sum('D'),'天'],['已用额度',sum('E'),'天'],['剩余额度',sum('F'),'天']],
 'contract-ledger':[['已登记合同',count('A'),'份'],['已到期',`COUNTIF(${ref}K8:K36,"<0")`,'份'],['0至30天到期',`COUNTIFS(${ref}K8:K36,">=0",${ref}K8:K36,"<=30",${ref}E8:E36,">0")`,'份']],
 'candidate-tracker':[['待筛选',ct('E','待筛选'),'人'],['待面试',ct('E','待面试'),'人'],['面试中',ct('E','面试中'),'人'],['待录用',ct('E','待录用'),'人'],['已到岗',ct('E','已到岗'),'人'],['已结束',ct('E','已结束'),'人']],
 'training-plan':[['培训项目',count('B'),'项'],['计划参与人次',sum('E'),'人次'],['培训预算',sum('I'),'元']],
 'asset-return':[['领用数量',sum('D'),'件'],['归还数量',sum('E'),'件'],['未归还数量',sum('J'),'件']]
 };
 const rows=map[t.id];sheet.showGridLines=false;sheet.tabColor='#253B51';
 sheet.getRange('A1:H23').format.font={name:'Noto Sans CJK SC',size:11,color:'#233348'};sheet.getRange('A1:H23').format.rowHeight=29;sheet.getRange('A1:H23').format.columnWidth=16;
 sheet.mergeCells('A2:H2');sheet.getRange('A2').values=[[t.title+' · 概览']];sheet.getRange('A2').format.font.size=23;sheet.getRange('A2').format.font.bold=true;sheet.getRange('A2').format.rowHeight=42;
 sheet.mergeCells('A3:H3');sheet.getRange('A3').values=[['在第二个工作表填写明细，本页自动汇总全部29个预留数据行。']];sheet.getRange('A3').format.font.color='#667085';
 sheet.getRange('A5:C5').values=[['指标','汇总结果','单位']];sheet.getRange('A5:C5').format.fill='#253B51';sheet.getRange('A5:C5').format.font.color='#FFFFFF';
 rows.forEach(([label,formula,unit],i)=>{const r=i+6;sheet.getRange('A'+r).values=[[label]];sheet.getRange('B'+r).formulas=[['='+formula]];sheet.getRange('C'+r).values=[[unit]];sheet.getRange('B'+r).setNumberFormat('#,##0.00;[Red]-#,##0.00');sheet.getRange(`A${r}:C${r}`).format.rowHeight=38;sheet.getRange('B'+r).format.fill='#E7F2EF';});
 const sameUnit=rows.every(r=>r[2]===rows[0][2]);
 if(sameUnit){const chart=sheet.charts.add('bar',sheet.getRange('A5:B'+(rows.length+5)));chart.title='填写后自动更新';chart.setPosition('E5','I16');}
 else{sheet.mergeCells('E6:H6');sheet.getRange('E6').values=[['核对要点']];sheet.getRange('E6').format.font.bold=true;const hints=t.id==='channel-review'?['同一渠道、同一统计期间','人数与金额分别汇总','到岗率不得平均逐行百分比']:['培训项目不要重复登记','人数为人次，允许重复参训','预算仅含已填入的金额'];hints.forEach((x,i)=>{sheet.mergeCells(`E${i+8}:H${i+8}`);sheet.getRange(`E${i+8}`).values=[[x]];});}
 sheet.mergeCells('A19:H20');sheet.getRange('A19').values=[['空白明细显示0，仅表示尚无录入数据。汇总不代表数据已齐全；请先检查明细必填输入，再使用总额。概览汇总全部行，不随明细筛选变化。']];sheet.getRange('A19:H20').format.wrapText=true;sheet.getRange('A19').format.font.color='#667085';
 return {title:'概览',lastColumn:'I',lastRow:21,kind:'overview',formulaColumns:['汇总结果']};
}
