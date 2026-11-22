/**
 * Chargement des images.
 *
 * Images principales : le jeu attend qu'elles soient toutes chargées (ou en
 * erreur) avant le premier dessin. Images secondaires (SVG de la météo) : le
 * jeu fonctionne même si elles manquent, des formes de secours sont alors
 * dessinées.
 */

const PRINCIPALES = Object.freeze({
  route: 'images/route.jpg',
  'voiture-rouge': 'images/voiture-rouge.png',
  'voiture-verte': 'images/voiture-verte.png',
  'voiture-jaune': 'images/voiture-jaune.png',
  'voiture-bleue': 'images/voiture-bleue.png',
});

const SECONDAIRES = Object.freeze({
  'meteo-sec': 'images/meteo/soleil.svg',
  'meteo-pluie': 'images/meteo/pluie.svg',
  'meteo-verglas': 'images/meteo/verglas.svg',
  'panneau-glissant': 'images/meteo/panneau-glissant.svg',
  flaque: 'images/meteo/flaque.svg',
  'plaque-verglas': 'images/meteo/plaque-verglas.svg',
});

/**
 * @typedef {object} BanqueImages
 * @property {(nom: string) => HTMLImageElement|undefined} get  Image par son nom.
 * @property {boolean} pret  Vrai quand toutes les images principales sont chargées.
 */

/**
 * Lance le chargement de toutes les images.
 *
 * @param {() => void} [quandPret] Appelée une fois les images principales chargées.
 * @returns {BanqueImages}
 */
export function chargerImages(quandPret) {
  /** @type {Map<string, HTMLImageElement>} */
  const images = new Map();
  let restantes = Object.keys(PRINCIPALES).length;

  /** @type {BanqueImages} */
  const banque = {
    pret: false,
    get: (nom) => images.get(nom),
  };

  const termine = () => {
    restantes--;
    if (restantes === 0) {
      banque.pret = true;
      if (quandPret) quandPret();
    }
  };

  for (const [nom, chemin] of Object.entries(PRINCIPALES)) {
    const image = new Image();
    image.addEventListener('load', termine);
    image.addEventListener('error', () => {
      console.error('Image introuvable :', chemin);
      termine();
    });
    image.src = chemin;
    images.set(nom, image);
  }

  for (const [nom, chemin] of Object.entries(SECONDAIRES)) {
    const image = new Image();
    image.addEventListener('error', () => console.warn('Image secondaire introuvable :', chemin));
    image.src = chemin;
    images.set(nom, image);
  }

  return banque;
}

/**
 * Une image est utilisable une fois chargée sans erreur.
 *
 * @param {HTMLImageElement|undefined} image
 * @returns {boolean}
 */
export function imagePrete(image) {
  return Boolean(image) && image.complete && image.naturalWidth > 0;
}
