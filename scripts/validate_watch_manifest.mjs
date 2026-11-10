import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

// The cloud launcher must follow the city inventory, not freeze the initial 50.
export function validateWatchManifest(manifest){
 if(manifest?.schema!==1||!Array.isArray(manifest.sources)||!manifest.sources.length||!Array.isArray(manifest.policyRecords)||!manifest.policyRecords.length||!Array.isArray(manifest.discoveryTasks))throw Error('Invalid inventory');
 const cities=new Set(manifest.policyRecords.map(r=>r.city));
 if([...cities].some(city=>typeof city!=='string'||!city.trim()))throw Error('Invalid policy city');
 const tasks=manifest.discoveryTasks;
 if(tasks.length!==cities.size||new Set(tasks.map(t=>t.region)).size!==cities.size||tasks.some(t=>!cities.has(t.region)||!Array.isArray(t.topics)||!t.topics.length||t.topics.some(topic=>typeof topic!=='string'||!topic.trim())))throw Error('Discovery tasks must cover every policy city exactly once');
 return {cities:cities.size,sources:manifest.sources.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 validateWatchManifest(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
}
