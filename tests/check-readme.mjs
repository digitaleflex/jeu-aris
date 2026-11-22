import fs from 'node:fs';
const md = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const headings = [...md.matchAll(/^##+\s+(.+)$/gm)].map((m) => m[1]);
// GitHub conserve les lettres accentuées dans les ancres.
const ancre = (s) => s.toLowerCase()
  .replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
const ancres = new Set(headings.map(ancre));
const liens = [...md.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]);
const casses = liens.filter((l) => !ancres.has(l));
console.log('titres:', headings.length, 'liens internes:', liens.length, 'casses:', casses.length ? casses.join(', ') : 'aucune');
console.log('lignes:', md.split('\n').length);
