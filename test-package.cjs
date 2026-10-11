const fs=require('node:fs'),assert=require('node:assert/strict');const core=[...fs.readFileSync('sw.js','utf8').matchAll(/'\.\/([^']+)'/g)].map(m=>m[1].split('?')[0]);for(const f of core)assert.ok(fs.existsSync(f),'Missing offline file '+f);const html=fs.readFileSync('index.html','utf8');assert.ok(html.includes('1.15.0'));console.log('Offline references exist:',new Set(core).size);

