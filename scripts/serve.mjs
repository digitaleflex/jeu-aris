#!/usr/bin/env node
/**
 * Serveur HTTP statique minimal, sans dépendance.
 *
 * Les modules JavaScript (<script type="module">) ne se chargent pas depuis
 * file:// : le jeu doit être servi par HTTP. Usage :
 *
 *     npm start                # http://localhost:8080
 *     node scripts/serve.mjs 3000
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const serveur = createServer(async (requete, reponse) => {
  try {
    const chemin = decodeURIComponent(new URL(requete.url, 'http://localhost').pathname);
    let fichier = normalize(join(RACINE, chemin));
    // Interdit de sortir du dossier du projet
    if (fichier !== RACINE && !fichier.startsWith(RACINE + sep)) {
      reponse.writeHead(403).end('Interdit');
      return;
    }
    if ((await stat(fichier).catch(() => null))?.isDirectory())
      fichier = join(fichier, 'index.html');
    const contenu = await readFile(fichier);
    reponse.writeHead(200, {
      'Content-Type': TYPES[extname(fichier)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    reponse.end(contenu);
  } catch {
    reponse.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable');
  }
});

serveur.listen(PORT, () => {
  console.log(`Jeu disponible sur http://localhost:${PORT}  (Ctrl+C pour arrêter)`);
});
