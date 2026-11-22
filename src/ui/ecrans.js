import { PX_PAR_METRE } from '../config/constantes.js';
import { DIFFICULTES } from '../config/difficultes.js';
import { MODES } from '../modes/modes.js';
import { PHASES } from '../etat/jeu.js';
import {
  lireDernierNom,
  lireNePlusAfficherRegles,
  lireNomsRecents,
  lireRecord,
  ecrireNePlusAfficherRegles,
  nomValide,
} from '../etat/preferences.js';

/**
 * Écrans HTML posés par-dessus le jeu : accueil (nom), choix du mode, règles,
 * fin de partie.
 *
 * Les écrans sont **pilotés par l'état** : à chaque événement `navigation`
 * (voir etat/navigation.js), `rafraichir(jeu)` affiche l'écran qui correspond
 * à `jeu.phase` et `jeu.reglesMode`. Les actions du joueur ne modifient pas
 * l'état directement : elles appellent les `actions` fournies par main.js.
 *
 * @typedef {object} ElementsEcrans
 * @property {HTMLElement} conteneur
 * @property {HTMLElement} accueil
 * @property {HTMLInputElement} champNom
 * @property {HTMLElement} erreurNom
 * @property {HTMLButtonElement} boutonContinuer
 * @property {HTMLElement} nomsRecents
 * @property {HTMLElement} choixMode
 * @property {HTMLElement} joueurActuel
 * @property {HTMLElement} boutonChangerJoueur
 * @property {HTMLElement} cartesModes
 * @property {HTMLElement} regles
 * @property {HTMLElement} reglesTitre
 * @property {HTMLElement} reglesTexte
 * @property {HTMLInputElement} caseNePlusAfficher
 * @property {HTMLElement} boutonFermerRegles
 * @property {HTMLElement} boutonLancerMode
 * @property {HTMLElement} fin
 * @property {HTMLElement} finTitre
 * @property {HTMLElement} finResultat
 * @property {HTMLElement} finDetails
 * @property {HTMLElement} finMessage
 * @property {HTMLElement} boutonRejouer
 * @property {HTMLElement} boutonChangerMode
 * @property {HTMLElement} boutonChangerJoueurFin
 * @property {HTMLInputElement[]} radiosDifficulte
 *
 * @typedef {object} ActionsEcrans
 * @property {(texte: string) => boolean} confirmerNom   Valide le nom (ouvre le choix du mode).
 * @property {() => void} allerAccueil
 * @property {() => void} allerChoixMode
 * @property {(id: string) => void} ouvrirRegles         Touche d'une carte de mode.
 * @property {() => void} fermerRegles
 * @property {(id: string) => void} lancerMode           « C'est parti ! »
 * @property {() => void} rejouer
 * @property {(id: string) => void} choisirDifficulte
 */

/**
 * Retrouve les éléments des écrans dans la page.
 *
 * @param {Document} document
 * @returns {ElementsEcrans}
 */
export function trouverElementsEcrans(document) {
  const el = (id) => document.getElementById(id);
  return {
    conteneur: el('ecrans'),
    accueil: el('ecranAccueil'),
    champNom: el('nomJoueur'),
    erreurNom: el('erreurNom'),
    boutonContinuer: el('boutonContinuer'),
    nomsRecents: el('nomsRecents'),
    choixMode: el('ecranChoixMode'),
    joueurActuel: el('joueurActuel'),
    boutonChangerJoueur: el('boutonChangerJoueur'),
    cartesModes: el('cartesModes'),
    regles: el('ecranRegles'),
    reglesTitre: el('reglesTitre'),
    reglesTexte: el('reglesTexte'),
    caseNePlusAfficher: el('caseNePlusAfficher'),
    boutonFermerRegles: el('boutonFermerRegles'),
    boutonLancerMode: el('boutonLancerMode'),
    fin: el('ecranFin'),
    finTitre: el('finTitre'),
    finResultat: el('finResultat'),
    finDetails: el('finDetails'),
    finMessage: el('finMessage'),
    boutonRejouer: el('boutonRejouer'),
    boutonChangerMode: el('boutonChangerMode'),
    boutonChangerJoueurFin: el('boutonChangerJoueurFin'),
    radiosDifficulte: [...document.querySelectorAll('input[name="difficulte"]')],
  };
}

/**
 * @param {ElementsEcrans} e
 * @param {ActionsEcrans} actions
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function creerEcrans(e, actions, jeu) {
  const document = e.conteneur.ownerDocument;

  /** Vrai si un écran HTML recouvre le jeu. */
  const interfaceOuverte = () =>
    [PHASES.ACCUEIL, PHASES.CHOIX_MODE, PHASES.FIN].includes(jeu.phase);
  const reglesOuvertes = () => jeu.phase === PHASES.CHOIX_MODE && jeu.reglesMode !== null;

  /** Vrai si le clavier doit aller au champ de saisie, pas à l'interface. */
  function saisieActive() {
    const actif = document.activeElement;
    return actif !== null && (actif.tagName === 'INPUT' || actif.tagName === 'TEXTAREA');
  }

  /** Nom du joueur pour lequel afficher les records. */
  const nomAffiche = () => jeu.nomJoueur || lireDernierNom();

  /* ---------- Affichage ---------- */

  function afficher(cible) {
    for (const ecran of [e.accueil, e.choixMode, e.regles, e.fin]) ecran.hidden = ecran !== cible;
    e.conteneur.hidden = cible === null;
  }

  function masquer() {
    // Évite qu'un bouton caché garde le focus (Espace / Entrée pendant la partie)
    const actif = document.activeElement;
    if (actif && actif !== document.body && typeof actif.blur === 'function') actif.blur();
    afficher(null);
  }

  /** Affiche l'écran correspondant à l'état du jeu. */
  function rafraichir() {
    if (jeu.phase === PHASES.ACCUEIL) {
      afficher(e.accueil);
      e.champNom.value = jeu.nomJoueur || lireDernierNom();
      afficherNomsRecents();
      validerChampNom();
    } else if (jeu.phase === PHASES.CHOIX_MODE && jeu.reglesMode === null) {
      e.joueurActuel.textContent = jeu.nomJoueur ? `Salut ${jeu.nomJoueur} !` : '';
      construireCartesModes();
      synchroniserDifficulte();
      afficher(e.choixMode);
      e.cartesModes.querySelector('.carte-mode.selectionne:not([disabled])')?.focus();
    } else if (reglesOuvertes()) {
      remplirRegles(MODES[jeu.reglesMode]);
      afficher(e.regles);
      e.boutonLancerMode.focus();
    } else if (jeu.phase === PHASES.FIN) {
      remplirEcranFin();
      afficher(e.fin);
      e.boutonRejouer.focus();
    } else {
      masquer();
    }
  }

  /* ---------- Accueil : saisie et validation du nom ---------- */

  function validerChampNom() {
    const valeur = e.champNom.value.trim();
    const ok = nomValide(valeur);
    e.boutonContinuer.disabled = !ok;
    const vide = valeur === '';
    e.erreurNom.textContent = ok || vide ? '' : 'Ton nom doit faire entre 2 et 12 caractères';
    e.erreurNom.hidden = ok || vide;
    return ok;
  }

  function afficherNomsRecents() {
    e.nomsRecents.textContent = '';
    const noms = lireNomsRecents();
    e.nomsRecents.hidden = noms.length === 0;
    for (const nom of noms) {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'nom-recent';
      bouton.textContent = nom;
      bouton.addEventListener('click', () => {
        e.champNom.value = nom;
        validerChampNom();
        e.champNom.focus();
      });
      e.nomsRecents.appendChild(bouton);
    }
  }

  function continuerDepuisAccueil() {
    if (!actions.confirmerNom(e.champNom.value)) {
      validerChampNom();
      e.champNom.focus();
    }
  }

  /* ---------- Choix du mode : une carte par mode ---------- */

  function construireCartesModes() {
    e.cartesModes.textContent = '';
    const nom = nomAffiche();
    for (const mode of Object.values(MODES)) {
      const carte = document.createElement('button');
      carte.type = 'button';
      carte.className = 'carte-mode';
      carte.dataset.mode = mode.id;
      if (mode.id === jeu.mode.id) carte.classList.add('selectionne');
      if (!mode.disponible) carte.disabled = true;

      const ajouter = (classe, texte, aria) => {
        const span = document.createElement('span');
        span.className = classe;
        span.textContent = texte;
        if (aria) span.setAttribute('aria-hidden', 'true');
        carte.appendChild(span);
      };
      ajouter('carte-icone', mode.icone, true);
      ajouter('carte-nom', mode.nom);
      ajouter('carte-but', mode.but);
      ajouter('carte-record', `Record : ${lireRecord(mode.id, nom)}`);
      if (!mode.disponible) ajouter('bientot', 'Bientôt');

      carte.addEventListener('click', () => actions.ouvrirRegles(mode.id));
      e.cartesModes.appendChild(carte);
    }
  }

  /** Flèches : déplace le focus entre les cartes disponibles. */
  function deplacerFocusCarte(touche) {
    const cartes = [...e.cartesModes.querySelectorAll('.carte-mode:not([disabled])')];
    if (cartes.length === 0) return;
    const index = cartes.indexOf(document.activeElement);
    const arriere = touche === 'ArrowLeft' || touche === 'ArrowUp';
    const suivant = index === -1 ? 0 : (index + (arriere ? -1 : 1) + cartes.length) % cartes.length;
    cartes[suivant].focus();
  }

  function synchroniserDifficulte() {
    for (const radio of e.radiosDifficulte) radio.checked = radio.value === jeu.difficulteId;
  }

  /* ---------- Règles d'un mode ---------- */

  function remplirRegles(mode) {
    e.reglesTitre.textContent = `Règles du mode ${mode.nom}`;
    e.reglesTexte.textContent = '';
    for (const ligne of mode.regles) {
      const li = document.createElement('li');
      li.textContent = ligne;
      e.reglesTexte.appendChild(li);
    }
    e.caseNePlusAfficher.checked = lireNePlusAfficherRegles();
  }

  /* ---------- Fin de partie ---------- */

  function remplirEcranFin() {
    const score = Math.round(jeu.score);
    const metres = Math.round(jeu.defilement / PX_PAR_METRE);
    const nom = jeu.nomJoueur;
    e.finTitre.textContent = `Bien joué ${nom} : ${score} points !`;
    e.finResultat.textContent = `${score} points`;
    e.finDetails.textContent =
      `Combo max ×${jeu.multiplicateurMax} • Frôlements : ${jeu.nbFrolements}` +
      ` • Distance : ${metres} m`;
    const ecart = jeu.ancienRecord - score;
    e.finMessage.textContent =
      score > jeu.ancienRecord
        ? `Bravo ${nom}, nouveau record !`
        : `Presque, ${nom} : ${ecart} point${ecart > 1 ? 's' : ''} de ton record`;
  }

  /* ---------- Câblage des événements (une seule fois) ---------- */

  e.champNom.addEventListener('input', validerChampNom);
  e.champNom.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'Enter') return;
    evenement.preventDefault();
    continuerDepuisAccueil();
  });
  e.boutonContinuer.addEventListener('click', continuerDepuisAccueil);
  e.boutonChangerJoueur.addEventListener('click', () => actions.allerAccueil());
  e.boutonFermerRegles.addEventListener('click', () => actions.fermerRegles());
  e.boutonLancerMode.addEventListener('click', () => {
    if (jeu.reglesMode) actions.lancerMode(jeu.reglesMode);
  });
  e.caseNePlusAfficher.addEventListener('change', () => {
    ecrireNePlusAfficherRegles(e.caseNePlusAfficher.checked);
  });
  e.boutonRejouer.addEventListener('click', () => actions.rejouer());
  e.boutonChangerMode.addEventListener('click', () => actions.allerChoixMode());
  e.boutonChangerJoueurFin.addEventListener('click', () => actions.allerAccueil());
  for (const radio of e.radiosDifficulte) {
    radio.addEventListener('change', () => {
      if (radio.checked && DIFFICULTES[radio.value]) actions.choisirDifficulte(radio.value);
    });
  }
  // Toucher l'écran de fin (hors boutons) = rejouer
  e.conteneur.addEventListener('click', (evenement) => {
    if (jeu.phase !== PHASES.FIN) return;
    if (evenement.target.closest('button')) return;
    actions.rejouer();
  });

  // Clavier dans les écrans : navigation seulement, aucune commande de jeu
  document.addEventListener('keydown', (evenement) => {
    if (saisieActive()) return; // le champ de saisie garde la main (Espace et Entrée compris)
    if (!interfaceOuverte()) return;
    const touche = evenement.key;
    const actif = document.activeElement;
    const surBouton = actif !== null && actif.tagName === 'BUTTON'; // le bouton focalisé agit

    if (touche === 'Escape') {
      evenement.preventDefault();
      if (reglesOuvertes()) actions.fermerRegles();
      else if (jeu.phase === PHASES.CHOIX_MODE) actions.allerAccueil();
      return;
    }
    if (reglesOuvertes()) return;
    if (touche === 'Enter' && jeu.phase === PHASES.ACCUEIL) {
      if (surBouton) return;
      evenement.preventDefault();
      continuerDepuisAccueil();
      return;
    }
    if (
      jeu.phase === PHASES.CHOIX_MODE &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(touche)
    ) {
      evenement.preventDefault();
      deplacerFocusCarte(touche);
      return;
    }
    if ((touche === ' ' || touche === 'Enter') && jeu.phase === PHASES.FIN) {
      if (surBouton) return;
      evenement.preventDefault();
      actions.rejouer();
    }
  });

  return {
    rafraichir,
    /** Vrai si un champ de saisie a le focus (le clavier ne doit pas piloter le jeu). */
    saisieActive,
    /** Vrai si un écran HTML recouvre le jeu (accueil, choix du mode, règles, fin). */
    interfaceOuverte,
    /** Place le focus sur le champ du nom (bouton principal à l'accueil). */
    focaliserNom() {
      e.champNom.focus();
    },
  };
}
