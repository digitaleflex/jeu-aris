import fs from 'node:fs';
const h = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ids = [...h.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
const doublons = ids.filter((v, i) => ids.indexOf(v) !== i);
console.log('ids:', ids.length, 'doublons:', doublons.length ? doublons.join(', ') : 'aucun');
const c = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
console.log('accolades CSS:', (c.match(/{/g) || []).length, '/', (c.match(/}/g) || []).length);
