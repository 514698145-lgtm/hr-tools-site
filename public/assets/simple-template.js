import {fieldsFor} from './hr-tools.js';
import {fieldLabel} from './field-copy.js';
export const simpleHeader=f=>`${fieldLabel(f)}${f.unit?'（'+f.unit+'）':''}【${f.optional?'选填':'必填'}】`;
export function simpleTemplate(tool,values={}){
 const data={...Object.fromEntries(tool.fields.map(f=>[f.key,f.value??''])),...values};
 // Keep required inputs and any optional inputs explicitly supplied, including zero.
 const fields=fieldsFor(tool,data).filter(f=>!f.optional||(String(data[f.key]??'').trim()!==''&&!(f.value===0&&Number(data[f.key])===0)));
 return {fields,rows:[['员工【选填】',...fields.map(simpleHeader)],['',...fields.map(f=>{
  const v=data[f.key];if(v===''||v===undefined||v===null)return '';
  return f.type==='select'?(f.options.find(o=>String(o[0])===String(v))?.[1]??v):f.type==='number'?Number(v):v;
 })]]};
}
