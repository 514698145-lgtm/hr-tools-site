// Inspect trusted repository data without altering calculator exports or template hashes.
import {readFile} from 'node:fs/promises';
const source = await readFile(new URL('../public/assets/city-policies.js', import.meta.url), 'utf8');
const mod = await import('data:text/javascript;base64,' + Buffer.from(source + '\nexport {records};').toString('base64'));
console.log(JSON.stringify(Object.entries(mod.records).flatMap(([city, rows]) => rows.map(row => ({city, ...row})))));
