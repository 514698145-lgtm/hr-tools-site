// Render discovery pages from the same policy records and calculator as the form.
import {readFile} from 'node:fs/promises';
import {cityPolicy} from '../public/assets/city-policies.js';
import {contributionBases} from '../public/assets/contribution-engine.js';
import {calculate} from '../public/assets/calculators.js';
let raw='';for await(const chunk of process.stdin)raw+=chunk;
const cities=JSON.parse(raw||'[]').map(({city,month})=>{
 const policy=cityPolicy(city,month);
 const scenarios=[4000,10000,50000].map(wage=>({wage,bases:contributionBases({city,month,wage},policy)}));
 return {...policy,scenarios};
});
const examples=JSON.parse(await readFile(new URL('../public/data/tool-examples.json',import.meta.url),'utf8')).map(example=>({...example,result:calculate(example.toolId,example.input)}));
console.log(JSON.stringify({cities,examples}));
