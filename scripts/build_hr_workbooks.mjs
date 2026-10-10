import {overviewIds,fillOverview} from './hr_workbook_overviews.mjs';
// Rebuild downloadable HR workbooks with @oai/artifact-tool. Set NODE_PATH to the bundled node_modules.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const {Workbook,SpreadsheetFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool',{paths:[process.env.NODE_PATH||'outputs/hr-templates/node_modules']})));
const root=path.resolve('.'),out=path.join(root,'outputs/hr-templates');
const designs=JSON.parse(await fs.readFile('outputs/hr-templates/excel-designs.json','utf8'));
const templates=JSON.parse(await fs.readFile('public/data/hr-templates.json','utf8')).filter(t=>designs[t.id]);
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
const formulaSpecs={
 'payroll-check':{replace:{5:'应发合计（自动）',10:'实发金额（自动）'},calc:{5:r=>`IF(COUNT(C${r}:E${r})<3,"",ROUND(SUM(C${r}:E${r}),2))`,10:r=>`IF(COUNT(F${r}:J${r})<5,"",ROUND(F${r}-SUM(G${r}:J${r}),2))`},sum:[2,3,4,5,6,7,8,9,10],note:'金额单位：元。基本工资、浮动工资、津贴补贴及扣款均需填数字，无发生额填0。应发=三项收入合计；实发=应发−四项扣款。个税及社保填已核算金额。',test:{inputs:{C7:10000,D7:2000,E7:500,G7:800,H7:700,I7:300,J7:0},cell:'K7',expected:10700}},
 'annual-leave':{replace:{5:'剩余天数（自动）'},calc:{5:r=>`IF(COUNT(D${r}:E${r})<2,"",D${r}-E${r})`},note:'一行对应一名员工的一个年度；已核定额度与已使用天数均必填，无使用填0。剩余=核定额度−已使用，负值标红；不自动核定法定额度。',test:{inputs:{D7:10,E7:3},cell:'F7',expected:7}},
 'timeoff-ledger':{replace:{1:'期初时数',5:'剩余时数（自动）'},calc:{5:r=>`IF(COUNT(B${r},D${r}:E${r})<3,"",B${r}+D${r}-E${r})`},note:'一行记录一名员工的一次余额核对：期初时数+本期增加−本期使用=期末剩余；三项必填，无发生额填0。后续核对请将上次期末填为期初，审批依据记在审批记录中。',test:{inputs:{B7:8,D7:4,E7:5},cell:'F7',expected:7}},
 'benefit-budget':{replace:{6:'差异金额（自动）'},calc:{6:r=>`IF(COUNT(E${r}:F${r})<2,"",ROUND(F${r}-E${r},2))`},sum:[4,5,6],note:'金额单位：元。差异=实际−预算，正值表示超预算；预算与实际均必填，无发生额填0。汇总只统计当前筛选可见行。',test:{inputs:{E7:1000,F7:1250},cell:'G7',expected:250}},
 'asset-return':{append:['未归还数量（自动）'],calc:{9:r=>`IF(COUNT(D${r}:E${r})<2,"",D${r}-E${r})`},note:'领用数量和归还数量均必填，未归还填0。未归还=领用−归还，负值表示数量需要核对；按资产编号逐项登记。',test:{inputs:{D7:3,E7:1},cell:'J7',expected:2}},
 'channel-review':{append:['到岗率（自动）','人均到岗成本（自动）'],calc:{11:r=>`IF(COUNT(F${r}:G${r})<2,"",IF(F${r}=0,"不适用",G${r}/F${r}))`,12:r=>`IF(COUNT(G${r}:H${r})<2,"",IF(G${r}=0,"不适用",ROUND(H${r}/G${r},2)))`},percent:[11],sum:[2,3,4,5,6,7],note:'渠道支出单位：元。到岗率=实际到岗人数÷录用人数；人均到岗成本=渠道支出÷到岗人数。分母为0显示不适用；人数请按同一期间、同一口径填写。',test:{inputs:{F7:5,G7:4,H7:2000},cell:'M7',expected:500}},
 'contract-ledger':{append:['距到期天数（自动）'],calc:{10:r=>`IF(ISNUMBER(E${r}),INT(E${r})-TODAY(),"")`},note:'日期请输入Excel可识别日期（如2026-12-31）。距到期天数=到期日期−当天日期，负值表示已过期；无固定期限留空。不推断通知或续签法定期限。'},
 'bonus-allocation':{sum:[4],note:'税前金额单位：元。底部汇总当前筛选可见记录；税额及适用计税方式请另行核算，本表不自动计算个税。'},
 'departure-settlement':{sum:[3],note:'已确认金额单位：元。底部汇总当前筛选可见记录；请统一收支符号，不重复登记。本表汇总已确认金额，不核定补偿资格或税额。'},
 'training-plan':{sum:[8],note:'预算金额单位：元。底部汇总当前筛选可见记录的培训预算；同一项目请勿重复登记。'}
};
const manifest=[];
const colors={ink:'#233348',muted:'#667085',input:'#FFFAEB',formula:'#EAF3F2',rule:'#D8DFE5',white:'#FFFFFF'};
function schema(t){const s=formulaSpecs[t.id]||{};let fields=t.fields.map((f,i)=>s.replace?.[i]||f);fields.push(...s.append||[]);return {...s,fields};}
function addSheet(w,t){
 const s=schema(t),design=designs[t.id];
 if(t.id==='shift-roster'){s.fields=['员工编号','部门','周一','周二','周三','周四','周五','周六','周日','出勤班数（自动）','休息天数（自动）'];s.calc={9:r=>`IF(COUNTA(C${r}:I${r})=0,"",COUNTIF(C${r}:I${r},"早")+COUNTIF(C${r}:I${r},"中")+COUNTIF(C${r}:I${r},"晚")+COUNTIF(C${r}:I${r},"日"))`,10:r=>`IF(COUNTA(C${r}:I${r})=0,"",COUNTIF(C${r}:I${r},"休"))`};s.note='填写周起始日期后安排班次；早/中/晚/日均按一个出勤班计，休计一个休息日，请填完整一周。班次数不等于工时或合规判断。';}
 const sheet=w.worksheets.add(t.title),last=s.fields.length-1,end=37;
 const themes={recruitment:'#34465E',onboarding:'#325C55',attendance:'#354D70',payroll:'#5C4B3F',learning:'#425D64',performance:'#574966',relations:'#465159',offboarding:'#5B5148'},ink=themes[t.categoryId];
 sheet.showGridLines=false;sheet.tabColor=ink;
 const all=sheet.getRange(`A1:${col(last)}${end+4}`);all.format.font={name:'Noto Sans CJK SC',size:11,color:'#273444'};all.format.verticalAlignment='center';all.format.rowHeight=30;
 sheet.getRange('A1').format.rowHeight=10;
 sheet.mergeCells(`A2:${col(last)}2`);sheet.getRange('A2').values=[[t.title]];sheet.getRange('A2').format.font={name:'Noto Sans CJK SC',size:22,bold:true,color:ink};sheet.getRange('A2').format.rowHeight=42;
 sheet.mergeCells(`A3:${col(last)}3`);sheet.getRange('A3').values=[[design.layout+'  /  '+t.description]];sheet.getRange('A3').format.font={name:'Noto Sans CJK SC',size:11,color:'#657083'};sheet.getRange(`A3:${col(last)}3`).format.borders={bottom:{style:'thin',color:ink}};
 sheet.mergeCells(`A4:${col(last)}4`);sheet.getRange('A4').values=[[t.id==='shift-roster'?'周起始日期：________________    班次：早 / 中 / 晚 / 日 / 休    编排人：________________':'统计期间：________________    所属部门：________________    经办人：________________']];sheet.getRange('A4').format.rowHeight=36;
 sheet.mergeCells(`A5:${col(last)}5`);sheet.getRange('A5').values=[['白色 / 浅灰为填写区；浅绿色为自动计算。'+(s.note||'一行记录一个业务事项；日期填YYYY-MM-DD，备注只记录工作必要信息。')]];sheet.getRange(`A5:${col(last)}5`).format.wrapText=true;sheet.getRange('A5').format.font.size=10;sheet.getRange('A5').format.rowHeight=40;
 let from=0;design.groups.forEach((g,i)=>{const to=i===design.groups.length-1?last:from+design.sizes[i]-1;sheet.mergeCells(`${col(from)}6:${col(to)}6`);sheet.getRange(`${col(from)}6`).values=[[g]];sheet.getRange(`${col(from)}6:${col(to)}6`).format.fill=ink;sheet.getRange(`${col(from)}6:${col(to)}6`).format.font={name:'Noto Sans CJK SC',bold:true,size:11,color:'#FFFFFF'};from=to+1;});
 sheet.getRange(`A7:${col(last)}7`).values=[s.fields];sheet.getRange(`A7:${col(last)}7`).format.fill='#E8ECF1';sheet.getRange(`A7:${col(last)}7`).format.font.bold=true;sheet.getRange(`A7:${col(last)}7`).format.wrapText=true;sheet.getRange(`A7:${col(last)}7`).format.rowHeight=42;
 for(let r=8;r<=36;r++){sheet.getRange(`A${r}:${col(last)}${r}`).format.fill=r%2?'#F3F5F8':'#FFFFFF';sheet.getRange(`A${r}:${col(last)}${r}`).format.rowHeight=design.tasks.length?40:34;sheet.getRange(`A${r}:${col(last)}${r}`).format.borders={bottom:{style:'hair',color:'#DCE2E8'}};}
 s.fields.forEach((f,i)=>{const c=col(i),range=sheet.getRange(`${c}8:${c}36`);sheet.getRange(`${c}1:${c}${end}`).format.columnWidth=t.id==='shift-roster'?(i<2?18:14):/备注|说明|记录|内容|证据|事项|安排|索引|反馈|标准|要求|交付/.test(f)?25:/日期|完成日|工作日/.test(f)?17:/编号/.test(f)?17:18;range.format.wrapText=true;formatInput(sheet,`${c}8:${c}36`,f);if(s.calc?.[i]){range.formulas=Array.from({length:29},(_,k)=>['='+s.calc[i](k+8)]);range.format.fill='#E7F2EF';range.setNumberFormat(s.percent?.includes(i)?'0.00%':'#,##0.00;[Red]-#,##0.00;0.00');range.conditionalFormats.add('cellIs',{operator:'lessThan',formula:0,format:{font:{color:'#B42318'}}});}});
 if(t.id==='shift-roster'){sheet.getRange('C8:I36').dataValidation={rule:{type:'list',values:['早','中','晚','日','休']}};}
 if(design.tasks.length){const index=t.id==='onboarding-checklist'?4:1;design.tasks.forEach((task,k)=>{sheet.getRange(`${col(index)}${k+8}`).values=[[task]];const status=s.fields.indexOf('完成状态');if(status>=0)sheet.getRange(`${col(status)}${k+8}`).values=[['未开始']];});}
 const table=sheet.tables.add(`A7:${col(last)}36`,true,'T_'+t.id.replaceAll('-','_'));table.showBandedRows=false;sheet.freezePanes.freezeRows(7);
 if(s.sum){sheet.getRange('A37').values=[['筛选汇总']];for(const i of s.sum){const c=col(i);sheet.getRange(`${c}37`).formulas=[[`=IF(COUNT(${c}8:${c}36)=0,"",SUBTOTAL(109,${c}8:${c}36))`]];sheet.getRange(`${c}37`).setNumberFormat('#,##0.00');}sheet.getRange(`A37:${col(last)}37`).format.fill='#E7F2EF';sheet.getRange(`A37:${col(last)}37`).format.font.bold=true;}
 return {sheet,s,end,last};
}
function formatInput(sheet,addr,label){const r=sheet.getRange(addr);r.setNumberFormat('@');if(/日期|完成日$|交接日$|最后工作日$/.test(label)&&!/时间|计划休假/.test(label))r.setNumberFormat('yyyy-mm-dd');else if(/时间$/.test(label))r.setNumberFormat(label.includes('日期')?'yyyy-mm-dd hh:mm':'hh:mm');else if(/金额|工资$|津贴补贴|个人社保|个人公积金|个税$|扣款$|渠道支出|预算金额|税前金额/.test(label))r.setNumberFormat('#,##0.00;[Red]-#,##0.00;0.00');else if(/人数|数量|次数|天数|时数|时长/.test(label))r.setNumberFormat('0.00');else if(/费率|权重/.test(label))r.setNumberFormat('0.00%');
 const options=label==='完成状态'||label==='办理状态'?['未开始','进行中','已完成','不适用']:label==='是否必要'?['是','否','待确认']:label==='优先级'?['高','中','低']:label==='当前阶段'?['待筛选','待面试','面试中','待录用','已到岗','已结束']:null;
 if(options)r.dataValidation={rule:{type:'list',values:options}};
}
await fs.mkdir(out,{recursive:true});await fs.mkdir('reports/hr-workbooks',{recursive:true});
const selected=process.argv.includes('--sample')?templates.slice(0,1):templates;
for(const t of selected){const w=Workbook.create();const overview=overviewIds.includes(t.id)?w.worksheets.add('概览'):null;const {sheet,s,end,last}=addSheet(w,t);const overviewMeta=overview?fillOverview(overview,t):null;w.recalculate();
 if(s.test){for(const [cell,v] of Object.entries(s.test.inputs))sheet.getRange(cell.replace('7','8')).values=[[v]];w.recalculate();const got=sheet.getRange(s.test.cell.replace('7','8')).values[0][0];if(Math.abs(got-s.test.expected)>0.00001||typeof got!=='number')throw Error(`${t.id}: expected ${s.test.expected}, got ${got}`);for(const cell of Object.keys(s.test.inputs))sheet.getRange(cell.replace('7','8')).clear({applyTo:'contents'});w.recalculate();if(sheet.getRange(s.test.cell.replace('7','8')).values[0][0]!=='')throw Error(t.id+' blank inputs must leave result blank');}
 const inspected=await w.inspect({kind:'region',sheetId:t.title,range:`A1:${col(last)}${Math.min(end,12)}`,maxChars:1000});
 if(/#REF!|#VALUE!|#DIV\/0!|#NAME\?|#NUM!/.test(JSON.stringify(inspected)))throw Error(t.id+' formula error');
 if(overview){const img=await w.render({sheetName:'概览',range:'A1:I21',scale:1,format:'png'});await fs.writeFile(`reports/hr-workbooks/${t.id}-overview.png`,new Uint8Array(await img.arrayBuffer()));}
 const png=await w.render({sheetName:t.title,range:`A1:${col(last)}${designs[t.id].tasks.length?8+designs[t.id].tasks.length:13}`,scale:1,format:'png'});await fs.writeFile(`reports/hr-workbooks/${t.id}.png`,new Uint8Array(await png.arrayBuffer()));
 await (await SpreadsheetFile.exportXlsx(w)).save(path.join(out,t.id+'.xlsx'));
 manifest.push({id:t.id,title:t.title,fields:s.fields,formulaColumns:Object.keys(s.calc||{}).map(i=>s.fields[i]),note:s.note||'',lastColumn:col(last),lastRow:end,kind:t.kind,categoryId:t.categoryId,format:'xlsx',layout:designs[t.id].layout,sections:designs[t.id].groups,sheets:[...(overviewMeta?[overviewMeta]:[]),{title:t.title,lastColumn:col(last),lastRow:end,kind:'ledger',formulaColumns:Object.keys(s.calc||{})}]});console.log('Built '+t.id);
}
if(!process.argv.includes('--sample'))await fs.writeFile('outputs/hr-templates/excel-manifest.json',JSON.stringify(manifest,null,2)+'\n');
