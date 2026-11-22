import { PX_PAR_METRE } from '../config/constantes.js';
import { PHASES } from '../etat/jeu.js';
import { facteurMeteo } from '../meteo/conditions.js';
import { ecrireStockage } from '../utilitaires/stockage.js';
import { son, VOLUME_GENERAL } from './contexte.js';
import * as effets from './effets.js';
import {
  couperSonsContinus,
  creerBruitsDeFond,
  creerSonMoteur,
  creerSonPneus,
  mettreAJourSonContinu,
  mettreAJourSonPneus,
} from './sonsContinus.js';

/**
 * Façade audio : initialisation, activation / coupure, et branchement des
 * sons sur les événements du jeu.
 */

/**
 * Crée le contexte audio et les sons continus. Doit être appelée à la suite
 * d'une action de l'utilisateur (règle des navigateurs) ; sans effet si le
 * son est déjà initialisé ou indisponible.
 */
export function initialiserSon() {
  if (son.contexte) {
    if (son.contexte.state === 'suspended') son.contexte.resume();
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ac = new AudioCtx();
  son.contexte = ac;
  son.general = ac.createGain();
  son.general.gain.value = son.actif ? VOLUME_GENERAL : 0;
  son.general.connect(ac.destination);

  // Bruit blanc réutilisable (2 s)
  const tampon = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const donnees = tampon.getChannelData(0);
  for (let i = 0; i < donnees.length; i++) donnees[i] = Math.random() * 2 - 1;
  son.bruitBlanc = tampon;

  creerSonMoteur(ac);
  son.pneus = creerSonPneus(ac);
  creerBruitsDeFond(ac);
}

/**
 * Active ou coupe le son (choix mémorisé).
 * @returns {boolean} Nouvel état : vrai si le son est actif.
 */
export function basculerSon() {
  son.actif = !son.actif;
  ecrireStockage('sonActif', son.actif ? '1' : '0');
  initialiserSon();
  if (son.general) {
    son.general.gain.setTargetAtTime(
      son.actif ? VOLUME_GENERAL : 0,
      son.contexte.currentTime,
      0.05,
    );
  }
  return son.actif;
}

/** Met le son en pause (onglet caché) ou le relance. */
export function suspendreSon(suspendre) {
  if (!son.contexte) return;
  if (suspendre) son.contexte.suspend();
  else son.contexte.resume();
}

/**
 * Met à jour les sons continus (moteur, pneus, vent, pluie) d'après l'état
 * du jeu. Appelée à chaque image par la boucle d'animation.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function mettreAJourSons(jeu) {
  const { joueur, nitro, meteo } = jeu;
  const enJeu = jeu.phase === PHASES.COMPTE || jeu.phase === PHASES.JEU;
  if (enJeu) {
    mettreAJourSonContinu({
      vitesseMs: joueur.vitesse / PX_PAR_METRE,
      accelerateur: joueur.accelerateur,
      enMarche: true,
      nitroActif: nitro.actif,
      intensitePluie: meteo.intensitePluie,
    });
  }
  if (enJeu || jeu.phase === PHASES.ACCIDENT) {
    mettreAJourSonPneus(
      joueur.glisse,
      Math.hypot(joueur.vitesse, joueur.vx) / PX_PAR_METRE,
      facteurMeteo(meteo, 'crissement'),
    );
  } else {
    mettreAJourSonPneus(0, 0, facteurMeteo(meteo, 'crissement'));
  }
}

/**
 * Associe chaque événement du jeu au son correspondant.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function brancherAudio(jeu) {
  const { evenements } = jeu;
  evenements.sur('nouvellePartie', () => {
    son.rapport = 1;
  });
  evenements.sur('compteARebours', effets.sonCompteARebours);
  evenements.sur('depart', effets.sonDepart);
  evenements.sur('changementVoie', effets.sonChangementVoie);
  evenements.sur('depassement', effets.sonDepassement);
  evenements.sur('frolement', effets.sonFrolement);
  evenements.sur('combo', ({ niveau }) => effets.sonCombo(niveau));
  evenements.sur('comboPerdu', effets.sonComboPerdu);
  evenements.sur('nitroActive', effets.sonNitro);
  evenements.sur('accident', ({ intensite }) => {
    effets.sonAccident(intensite);
    couperSonsContinus();
  });
  evenements.sur('meteo', ({ type }) => {
    if (type === 'pluie') effets.sonTonnerre();
    else if (type === 'verglas') effets.sonGivre();
    else effets.sonRouteSeche();
  });
  evenements.sur('danger', ({ type }) => {
    if (type === 'flaque') effets.sonFlaque();
    else effets.sonPlaque();
  });
  evenements.sur('fin', ({ nouveauRecord }) => {
    couperSonsContinus();
    if (nouveauRecord) effets.sonNouveauRecord();
  });
}
