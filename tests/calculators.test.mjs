import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,calculateBatch} from '../public/assets/calculators.js';
test('累计税率边界与负预扣处理',()=>{
 const tax=(income,paid=0)=>calculate('income-tax',{income,deduction:0,relief:0,paid}).value;
 assert.equal(tax(36000),1080);assert.equal(tax(36001),1080.1);assert.equal(tax(144000),11880);assert.equal(tax(300000),43080);assert.equal(tax(960000),250080);assert.equal(tax(0,100),0);
});
test('已扣除与减免不重复',()=>{const r=calculate('income-tax',{income:120000,deduction:60000,relief:100,paid:2000});assert.equal(r.value,1380);});
test('实发工资不接受扣款超过工资',()=>{assert.throws(()=>calculate('take-home-pay',{salary:100,social:50,fund:50,tax:1,other:0}));});
test('团队期间总成本与人数校验',()=>{const d={salary:10000,social:2000,fund:700,benefit:300,people:10,months:12};assert.equal(calculate('employment-cost',d).value,1560000);assert.throws(()=>calculate('employment-cost',{...d,people:1.5}));});
test('批量逐行隔离错误且与单条一致',()=>{const row={salary:10000,social:1000,fund:500,tax:100,other:0};const batch=calculateBatch('take-home-pay',[row,{...row,salary:''},row]);assert.equal(batch[0].result.value,8400);assert.equal(batch[0].result.value,calculate('take-home-pay',row).value);assert.equal(batch[1].row,3);assert.ok(batch[1].error);assert.equal(batch[2].result.value,8400);});
test('超过安全金额范围不输出不精确结果',()=>{assert.throws(()=>calculate('employment-cost',{salary:1000000000,social:1000000000,fund:1000000000,benefit:0,people:1000000000,months:120}));});

