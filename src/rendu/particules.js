/**
 * Dessin des particules et des textes flottants.
 *
 * @typedef {import('./rendu.js').Rendu} Rendu
 */

/**
 * @param {Rendu} r
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {boolean} auSol Dessine les particules collées à la route (sous les
 *   voitures) ou les autres (au-dessus).
 */
export function dessinerParticules(r, jeu, auSol) {
  const { ctx } = r;
  for (const p of jeu.particules) {
    if (Boolean(p.auSol) !== Boolean(auSol)) continue;
    const restant = 1 - p.age / p.vie;
    if (p.type === 'goutte') {
      ctx.strokeStyle = `rgba(200, 220, 255, ${0.5 * restant})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.taille * 0.07, p.y - p.taille);
      ctx.stroke();
      continue;
    }
    if (p.type === 'onde') {
      ctx.strokeStyle = `rgba(210, 230, 255, ${0.5 * restant})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.taille, p.taille * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (p.type === 'gerbe') {
      ctx.fillStyle = `rgba(220, 235, 250, ${0.35 * restant})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (p.type === 'flocon') {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * Math.min(1, restant * 3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (p.type === 'etincelle') {
      ctx.fillStyle = `rgba(255, ${Math.floor(160 + 90 * restant)}, 60, ${restant})`;
      ctx.fillRect(p.x, p.y, p.taille, p.taille);
    } else if (p.type === 'flamme') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const vert = Math.floor(120 + 120 * restant);
      const bleu = restant > 0.75 ? 255 : 40;
      ctx.fillStyle = `rgba(255, ${vert}, ${bleu}, ${0.8 * restant})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.type === 'vent') {
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * restant})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y - p.taille);
      ctx.stroke();
    } else {
      // fumée
      ctx.fillStyle = `rgba(90, 90, 90, ${0.45 * restant})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * @param {Rendu} r
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function dessinerTextesFlottants(r, jeu) {
  const { ctx } = r;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of jeu.textesFlottants) {
    const restant = 1 - t.age / t.vie;
    const grossissement = 1 + 0.4 * Math.max(0, 1 - t.age / 0.15);
    ctx.font = `900 ${Math.round(t.taille * grossissement)}px Arial`;
    ctx.globalAlpha = restant;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeText(t.texte, t.x, t.y);
    ctx.fillStyle = t.couleur;
    ctx.fillText(t.texte, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}
