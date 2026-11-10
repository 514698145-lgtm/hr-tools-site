import test from 'node:test';
import assert from 'node:assert/strict';
import {validateWatchManifest} from '../scripts/validate_watch_manifest.mjs';
const inventory=n=>({schema:1,sources:[{url:'https://www.gov.cn/'}],policyRecords:Array.from({length:n},(_,i)=>({city:`city-${i}`})),discoveryTasks:Array.from({length:n},(_,i)=>({region:`city-${i}`,topics:['社保','医保','公积金']}))});
test('cloud inventory accepts growth beyond the initial fifty cities',()=>{for(const n of [1,50,51,75])assert.equal(validateWatchManifest(inventory(n)).cities,n);});
test('missing, duplicated and foreign discovery tasks cannot pass',()=>{
 for(const mutate of [m=>m.discoveryTasks.pop(),m=>m.discoveryTasks.push(m.discoveryTasks[0]),m=>m.discoveryTasks[0].region='unknown',m=>m.discoveryTasks[0].topics=[],m=>m.discoveryTasks[0].topics=[''],m=>m.policyRecords[0].city='',m=>m.sources=[]]){const m=inventory(51);mutate(m);assert.throws(()=>validateWatchManifest(m));}
});
