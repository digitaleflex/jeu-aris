// Harnais de vérification headless : charge script.js avec un DOM simulé.
// Usage : node tests/verification.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const RACINE = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const elements = new Map();

function creerElement(id = '', tag = 'div') {
  const classes = new Set();
  const ecouteurs = new Map();
  const el = {
    id,
    tagName: tag.toUpperCase(),
    hidden: false,
    clientWidth: 360,
    clientHeight: 540,
    disabled: false,
    checked: false,
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    children: [],
    parentElement: null,
    listeners: ecouteurs,
    classList: {
      add: (...n) => n.forEach((x) => classes.add(x)),
      remove: (...n) => n.forEach((x) => classes.delete(x)),
      toggle: (n, force) => {
        const on = force === undefined ? !classes.has(n) : !!force;
        on ? classes.add(n) : classes.delete(n);
        return on;
      },
      contains: (n) => classes.has(n),
    },
    addEventListener(type, fn) {
      if (!ecouteurs.has(type)) ecouteurs.set(type, []);
      ecouteurs.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const liste = ecouteurs.get(type) || [];
      const i = liste.indexOf(fn);
      if (i >= 0) liste.splice(i, 1);
    },
    dispatch(type, extra = {}) {
      const evt = {
        type,
        target: el,
        currentTarget: el,
        preventDefault() {},
        stopPropagation() {},
        ...extra,
      };
      (ecouteurs.get(type) || []).slice().forEach((fn) => fn(evt));
      return evt;
    },
    appendChild(child) {
      child.parentElement = el;
      el.children.push(child);
      return child;
    },
    removeChild(child) {
      const i = el.children.indexOf(child);
      if (i >= 0) el.children.splice(i, 1);
      return child;
    },
    remove() {
      if (el.parentElement) el.parentElement.removeChild(el);
    },
    setAttribute(n, v) {
      el[n] = v;
    },
    getAttribute(n) {
      return el[n];
    },
    hasAttribute(n) {
      return el[n] !== undefined && el[n] !== null && el[n] !== false;
    },
    querySelector(sel) {
      return document.querySelector(sel, el);
    },
    querySelectorAll(sel) {
      return document.querySelectorAll(sel, el);
    },
    closest(sel) {
      if (sel.startsWith('#')) {
        let courant = el;
        while (courant) {
          if (courant.id === sel.slice(1)) return courant;
          courant = courant.parentElement;
        }
        return null;
      }
      return classes.has(sel.replace(/^\./, '')) ? el : null;
    },
    focus() {
      document.activeElement = el;
    },
    blur() {
      if (document.activeElement === el) document.activeElement = document.body;
    },
    click() {
      el.dispatch('click');
    },
    scrollIntoView() {},
    getContext() {
      return contexte2d();
    },
    getBoundingClientRect() {
      return { x: 0, y: 0, width: 360, height: 540, top: 0, left: 0, right: 360, bottom: 540 };
    },
  };
  return el;
}

const document = {
  activeElement: null,
  body: creerElement('', 'body'),
  documentElement: creerElement('', 'html'),
  getElementById(id) {
    if (!elements.has(id)) {
      const el = creerElement(id);
      if (id === 'canvasJeu') el.parentElement = creerElement('zone-canvas');
      elements.set(id, el);
    }
    return elements.get(id);
  },
  createElement(tag) {
    return creerElement('', tag);
  },
  createTextNode(texte) {
    const n = creerElement('', '#text');
    n.textContent = texte;
    return n;
  },
  querySelector(sel, parent = null) {
    if (sel.startsWith('#')) return document.getElementById(sel.slice(1));
    const liste = document.querySelectorAll(sel, parent);
    return liste[0] || null;
  },
  querySelectorAll(sel, parent = null) {
    if (sel.startsWith('.')) {
      const exclureDesactive = sel.includes(':not([disabled])');
      const nom = sel.slice(1).split(/[\[:]/)[0];
      const source = parent ? parent.children : [...elements.values()];
      return source.filter(
        (e) => e.classList.contains(nom) && (!exclureDesactive || !e.disabled),
      );
    }
    if (sel.startsWith('input[name=')) {
      const nom = sel.match(/name=["']?([^"'\]]+)/)?.[1];
      return [...elements.values()].filter((e) => e.tagName === 'INPUT' && e.name === nom);
    }
    return [];
  },
  addEventListener(type, fn) {
    this.body.addEventListener(type, fn);
  },
  removeEventListener() {},
};
document.activeElement = document.body;

let rafId = 0;
let rafActifs = new Set();
let annulations = 0;
const stockage = new Map();

function contexte2d() {
  const base = {
    canvas: { width: 360, height: 540 },
    measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => ({}),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData() {},
  };
  return new Proxy(base, {
    get(cible, prop) {
      if (prop in cible) return cible[prop];
      return () => undefined;
    },
    set(cible, prop, valeur) {
      cible[prop] = valeur;
      return true;
    },
  });
}

class AudioContextStub {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.sampleRate = 44100;
    this.destination = {};
  }
  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 0, setValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
      detune: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} },
      connect() {}, start() {}, stop() {},
    };
  }
  createGain() {
    return {
      gain: { value: 0, setValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {}, disconnect() {},
    };
  }
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { value: 0, setValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {} },
      Q: { value: 0 }, connect() {},
    };
  }
  createBufferSource() {
    return { buffer: null, loop: false, connect() {}, start() {}, stop() {} };
  }
  createWaveShaper() {
    return { curve: null, connect() {} };
  }
  createBuffer(canaux, taille) {
    return { length: taille, numberOfChannels: canaux, getChannelData: () => new Float32Array(taille) };
  }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

const sandbox = {
  console,
  document,
  window: null,
  navigator: { vibrate() {}, maxTouchPoints: 0, userAgent: 'node' },
  location: { href: 'http://localhost/' },
  performance: { now: () => Date.now() },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  requestAnimationFrame(cb) {
    const id = ++rafId;
    rafActifs.add(id);
    return id;
  },
  cancelAnimationFrame(id) {
    annulations++;
    rafActifs.delete(id);
  },
  localStorage: {
    getItem: (k) => (stockage.has(k) ? stockage.get(k) : null),
    setItem: (k, v) => stockage.set(k, String(v)),
    removeItem: (k) => stockage.delete(k),
    clear: () => stockage.clear(),
  },
  AudioContext: AudioContextStub,
  webkitAudioContext: AudioContextStub,
  Image: class {
    constructor() {
      this.width = 0;
      this.height = 0;
      this._events = {};
      this.addEventListener = (type, fn) => { (this._events[type] ||= []).push(fn); };
      this.removeEventListener = () => {};
    }
    set src(v) {
      this._src = v;
      setTimeout(() => (this._events.load || []).forEach((fn) => fn()), 0);
    }
    get src() { return this._src; }
  },
  ResizeObserver: class { observe() {} disconnect() {} },
  devicePixelRatio: 1,
  innerWidth: 390,
  innerHeight: 844,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
sandbox.addEventListener = () => {};
sandbox.removeEventListener = () => {};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// Les radios du DOM réel existent dans le HTML ; on les reproduit dans le stub.
for (const [id, valeur] of [['difficulteFacile', 'facile'], ['difficulteNormal', 'normal'], ['difficulteDifficile', 'difficile']]) {
  const radio = document.getElementById(id);
  radio.tagName = 'INPUT';
  radio.name = 'difficulte';
  radio.value = valeur;
  radio.checked = valeur === 'normal';
}
document.getElementById('nomJoueur').tagName = 'INPUT';

const code = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const sonde = `
;globalThis.__t = {
  get etat(){ return typeof etat === 'undefined' ? null : etat; },
  get modeActuel(){ return typeof modeActuel === 'undefined' ? null : modeActuel; },
  get score(){ return typeof score === 'undefined' ? null : score; },
  set score(v){ score = v; },
  set defilement(v){ defilement = v; },
  get joueur(){ return typeof joueur === 'undefined' ? null : joueur; },
  get course(){ return typeof course === 'undefined' ? null : course; },
  get chrono(){ return typeof chrono === 'undefined' ? null : chrono; },
  get zen(){ return typeof zen === 'undefined' ? null : zen; },
  get meteo(){ return typeof meteo === 'undefined' ? null : meteo; },
  get rivaux(){ return typeof rivaux === 'undefined' ? null : rivaux; },
  get compteARebours(){ return typeof compteARebours === 'undefined' ? null : compteARebours; },
  get difficulteActive(){ return typeof difficulteActive === 'undefined' ? null : difficulteActive; },
  get idAnimation(){ return typeof idAnimation === 'undefined' ? null : idAnimation; },
  MODES: typeof MODES === 'undefined' ? null : MODES,
  DIFFICULTES: typeof DIFFICULTES === 'undefined' ? null : DIFFICULTES,
  lireRecord: typeof lireRecord === 'undefined' ? null : lireRecord,
  migrerAncienRecord: typeof migrerAncienRecord === 'undefined' ? null : migrerAncienRecord,
  terminerPartie: typeof terminerPartie === 'undefined' ? null : terminerPartie,
  demarrerMode: typeof demarrerMode === 'undefined' ? null : demarrerMode,
  actionZen: typeof actionZen === 'undefined' ? null : actionZen,
  aleatoire: typeof aleatoire === 'undefined' ? null : aleatoire,
  mulberry32: typeof mulberry32 === 'undefined' ? null : mulberry32,
  graineDuJour: typeof graineDuJour === 'undefined' ? null : graineDuJour,
  initialiserGenerateur: typeof initialiserGenerateur === 'undefined' ? null : initialiserGenerateur,
  mettreAJour: typeof mettreAJour === 'undefined' ? null : mettreAJour,
  verifierFinMode: typeof verifierFinMode === 'undefined' ? null : verifierFinMode,
  simulerRivaux: (secondes) => {
    const dt = 1 / 120;
    for (let i = 0; i < secondes * 120; i++) {
      course.temps += dt;
      creerVaguesDeTrafic(dt);
      deplacerObstacles(dt);
      mettreAJourRivaux(dt);
      course.distance += joueur.vitesse / PX_PAR_METRE * dt;
    }
    return rivaux.map((r) => r.accidents);
  },
};`;
vm.runInContext(code + sonde, sandbox, { filename: 'script.js' });
const t = sandbox.__t;
const $ = (id) => document.getElementById(id);

let reussites = 0;
function verifier(nom, fn) {
  try {
    fn();
    reussites++;
    console.log('  OK   ' + nom);
  } catch (e) {
    console.error('  ÉCHEC ' + nom + ' :: ' + (e.stack || e.message));
    process.exitCode = 1;
  }
}

console.log('Vérification headless du jeu');
verifier('la machine à états démarre sur accueil', () => {
  assert.equal(t.etat, 'accueil');
  assert.equal($('ecrans').hidden, false);
  assert.equal($('ecranAccueil').hidden, false);
  assert.equal($('ecranChoixMode').hidden, true);
  assert.equal($('ecranFin').hidden, true);
});
verifier('MODES contient 5 modes et un seul disponible', () => {
  assert.ok(t.MODES, 'MODES absent');
  assert.equal(Object.keys(t.MODES).length, 5);
  assert.equal(t.MODES.esquive.disponible, true);
});
verifier('DIFFICULTES contient 3 paliers', () => {
  assert.ok(t.DIFFICULTES, 'DIFFICULTES absent');
  assert.deepEqual(Object.keys(t.DIFFICULTES).sort(), ['difficile', 'facile', 'normal']);
  assert.equal(t.DIFFICULTES.facile.vitesseDepart, 70);
  assert.equal(t.DIFFICULTES.difficile.vitesseMax, 220);
});
verifier('validation du nom : court = invalide', () => {
  $('nomJoueur').value = 'A';
  $('nomJoueur').dispatch('input');
  assert.equal($('boutonContinuer').disabled, true);
  assert.equal($('erreurNom').hidden, false);
});
verifier('validation du nom : valide = bouton actif', () => {
  $('nomJoueur').value = 'Léa';
  $('nomJoueur').dispatch('input');
  assert.equal($('boutonContinuer').disabled, false);
  assert.equal($('erreurNom').hidden, true);
});

verifier('confirmer le nom ouvre le choix du mode', () => {
  $('boutonContinuer').dispatch('click');
  assert.equal(t.etat, 'choixMode');
  assert.match($('joueurActuel').textContent, /Léa/);
  assert.equal($('ecranAccueil').hidden, true);
  assert.equal($('ecranChoixMode').hidden, false);
});
verifier('5 cartes générées, tous les modes disponibles', () => {
  const cartes = $('cartesModes').children;
  assert.equal(cartes.length, 5);
  assert.equal(cartes.filter((c) => !c.disabled).length, 5);
  assert.equal(cartes[0].dataset.mode, 'esquive');
  assert.equal(cartes[1].dataset.mode, 'course');
});
verifier('clic sur la carte : règles du mode', () => {
  $('cartesModes').children[0].dispatch('click');
  assert.equal($('ecranRegles').hidden, false);
  assert.equal($('reglesTexte').children.length, 3);
  assert.equal(t.etat, 'choixMode');
});
verifier('lancer le mode démarre une seule boucle', () => {
  $('boutonLancerMode').dispatch('click');
  assert.equal(t.etat, 'compte');
  assert.equal($('ecrans').hidden, true);
  assert.equal(rafActifs.size, 1);
});
verifier('le champ de saisie garde le clavier', () => {
  $('nomJoueur').focus();
  document.body.dispatch('keydown', { key: ' ', repeat: false });
  document.body.dispatch('keydown', { key: 'Enter', repeat: false });
  assert.equal(t.etat, 'compte');
  document.body.blur();
});
verifier('la difficulté est appliquée au départ', () => {
  $('difficulteFacile').checked = true;
  $('difficulteFacile').dispatch('change');
  assert.equal(t.difficulteActive, 'facile');
  $('boutonRecommencer').dispatch('click');
  const attendu = (70 / 3.6) * 20;
  assert.ok(Math.abs(t.joueur.vitesse - attendu) < 1, `vitesse=${t.joueur.vitesse}`);
  assert.equal(rafActifs.size, 1);
});
verifier('fin de partie : record par mode/joueur et écran de fin', () => {
  t.score = 42;
  t.terminerPartie();
  assert.equal(t.etat, 'fini');
  assert.equal(t.lireRecord('esquive', 'Léa'), 42);
  assert.equal($('ecranFin').hidden, false);
  assert.match($('finMessage').textContent, /nouveau record/);
});
verifier('rejouer ne duplique pas la boucle', () => {
  $('boutonRejouer').dispatch('click');
  assert.equal(t.etat, 'compte');
  assert.equal(rafActifs.size, 1);
});
verifier('migration de l’ancien record global', () => {
  stockage.set('recordVoiture', '77');
  t.migrerAncienRecord('Tom');
  assert.equal(t.lireRecord('esquive', 'Tom'), 77);
  assert.equal(stockage.has('recordVoiture'), false);
});

verifier('Course : grille de départ et 5 feux', () => {
  t.demarrerMode('course');
  assert.equal(t.etat, 'compte');
  assert.equal(t.compteARebours, 5);
  assert.equal(t.joueur.vitesse, 0);
  assert.equal(t.rivaux.length, 3);
  for (let i = 0; i < 5 * 120 + 10; i++) t.mettreAJour(1 / 120);
  assert.equal(t.etat, 'jeu');
});
verifier('IA : 3 rivaux roulent 60 s sans accident', () => {
  t.joueur.vitesse = 500;
  const accidents = t.simulerRivaux(60);
  assert.equal(accidents.join(','), '0,0,0', 'accidents par rival : ' + accidents.join(','));
  for (const r of t.rivaux) {
    assert.ok(r.distance > 1500, 'distance du rival ' + r.nom + ' = ' + Math.round(r.distance) + ' m, vitesse ' + Math.round(r.vitesse / 20 * 3.6) + ' km/h');
  }
});
verifier('Course : arrivée, classement et meilleur temps', () => {
  t.course.distance = 3100;
  const fin = t.verifierFinMode();
  assert.ok(fin, 'verifierFinMode ne renvoie rien');
  assert.equal(fin.valeur, t.course.position);
  t.terminerPartie();
  assert.equal(t.etat, 'fini');
  assert.equal($('ecranFin').hidden, false);
  assert.match($('finResultat').textContent, /4/);
  assert.ok(t.lireRecord('course', 'Léa') > 0);
});

verifier('Chrono : 30 s, checkpoint +temps et fin au temps écoulé', () => {
  t.demarrerMode('chrono');
  for (let i = 0; i < 3 * 120 + 10; i++) t.mettreAJour(1 / 120);
  assert.equal(t.etat, 'jeu');
  assert.ok(t.chrono.restant > 29 && t.chrono.restant <= 30);
  t.chrono.prochainCheckpoint = 100;
  t.defilement = 101 * 20;
  const avant = t.chrono.restant;
  t.mettreAJour(1 / 120);
  assert.ok(t.chrono.restant > avant + 10, 'le checkpoint doit ajouter du temps');
  t.chrono.restant = 0.001;
  t.mettreAJour(1 / 120);
  assert.equal(t.etat, 'fini');
  assert.match($('finResultat').textContent, /parcourus/);
});
verifier('Zen : limite 110 km/h, météo/heure choisies, aucun record', () => {
  t.demarrerMode('zen');
  for (let i = 0; i < 3 * 120 + 10; i++) t.mettreAJour(1 / 120);
  t.joueur.vitesse = 900;
  t.mettreAJour(1 / 120);
  assert.ok(t.joueur.vitesse <= (110 / 3.6) * 20 + 1, 'vitesse Zen > 110 km/h');
  t.actionZen('pluie');
  assert.equal(t.meteo.actuelle, 'pluie');
  t.actionZen('nuit');
  assert.equal(t.zen.heure, 'nuit');
  assert.equal(t.verifierFinMode(), null, 'Zen ne doit jamais se terminer');
  t.actionZen('quitter');
  assert.equal(t.etat, 'choixMode');
});
verifier('Défi du jour : graine stable = même route', () => {
  const a = t.mulberry32(20261122);
  const b = t.mulberry32(20261122);
  const suiteA = Array.from({ length: 24 }, () => a());
  const suiteB = Array.from({ length: 24 }, () => b());
  assert.equal(suiteA.join(','), suiteB.join(','));
  t.initialiserGenerateur('defi');
  const tire = Array.from({ length: 24 }, () => t.aleatoire());
  const reference = t.mulberry32(t.graineDuJour());
  assert.equal(tire.join(','), Array.from({ length: 24 }, () => reference()).join(','));
});

console.log(`${reussites} vérification(s) réussie(s)`);
