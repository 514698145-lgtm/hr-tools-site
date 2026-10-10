import {simpleTemplate} from './simple-template.js';
let loading;
async function zipLibrary(){
 if(window.JSZip)return window.JSZip;
 if(!loading)loading=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='/vendor/jszip.min.js';s.onload=()=>resolve(window.JSZip);s.onerror=()=>{loading=null;s.remove();reject(Error('模板模块加载失败，请重试'));};document.head.append(s);});
 return loading;
}
const col=i=>{let s='';for(i++;i;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
// Reuse the authored workbook's styles; only replace its one input sheet.
// This preserves the static OSS deployment and keeps employee data in the browser.
export async function downloadCurrentTemplate(tool,values){
 const {rows,fields}=simpleTemplate(tool,values),Zip=await zipLibrary();
 const response=await fetch('/downloads/import-templates/'+(tool.id==='date-calculator'?'take-home-pay':tool.id)+'.xlsx');
 if(!response.ok)throw Error('模板下载失败，请重试');
 const zip=await Zip.loadAsync(await response.arrayBuffer());
 const original=await zip.file('xl/worksheets/sheet1.xml').async('string');
 const doc=new DOMParser().parseFromString(original,'application/xml');
 const style=ref=>doc.querySelector(`c[r="${ref}"]`)?.getAttribute('s')||'0';
 const headerStyle=style('A1'),bodyStyle=style('A2'),last=col(rows[0].length-1);
 const cells=(row,r)=>row.map((v,i)=>`<c r="${col(i)}${r}" s="${r===1?headerStyle:bodyStyle}"${typeof v==='number'?'':' t="inlineStr"'}>${typeof v==='number'?'<v>'+v+'</v>':'<is><t xml:space="preserve">'+esc(v)+'</t></is>'}</c>`).join('');
 const columns=rows[0].map((h,i)=>`<col min="${i+1}" max="${i+1}" width="${Math.max(20,Math.min(34,h.length*1.25))}" customWidth="1" style="${bodyStyle}"/>`).join('');
 const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${last}2"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="28"/><cols>${columns}</cols><sheetData><row r="1" ht="64" customHeight="1">${cells(rows[0],1)}</row><row r="2" ht="28" customHeight="1">${cells(rows[1],2)}</row></sheetData><autoFilter ref="A1:${last}2001"/></worksheet>`;
 zip.file('xl/worksheets/sheet1.xml',xml);
 const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6},mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=tool.short+'批量填写.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 return fields.length;
}
