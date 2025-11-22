/*
 * ----------------------------------------------------------------------------
 * Tech4Art Conseil / Jean-Baptiste BARON
 * Propriété intellectuelle & licence
 *
 * Auteur : Jean-Baptiste BARON
 * Contact : tech4artconseil@gmail.com
 * Site    : https://www.tech4art.fr
 * Société : Tech4Art Conseil
 * SIRET   : 48017112300064
 *
 * Déclaration :
 * © 2025 Jean-Baptiste BARON — Tous droits réservés.
 * Ce code est fourni sous une licence propriétaire restrictive. Toute
 * utilisation, copie, modification, distribution ou publication est
 * interdite sauf autorisation écrite explicite du titulaire des droits.
 * Pour les détails et conditions, voir le fichier `LICENSE_PROPRIETARY.txt`
 * et les mentions légales : https://tech4art.fr/mentions-legales/
 * Propriété intellectuelle : https://tech4art.fr/propriete-intellectuelle-tech4artconseil-fr/
 *
 * Pour toute demande commerciale ou SDK/API, contactez : tech4artconseil@gmail.com
 * ----------------------------------------------------------------------------
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

// Variables de réglage exposées
let cameraFov = 75;
let cameraNear = 0.1;
let cameraFar = 1000;
let lightIntensity = 1;
let ambientLightIntensity = 0.5;
let autoRotateSpeed = 0.5;
let backgroundColor = 0xffffff;
// Rendu transparent (le canvas du viewer montrera le contenu HTML en dessous)
let transparentBackground = true;

// Contrôles de positionnement initial de la caméra
// focal length en mm (ex : 70 mm) — sera converti en FOV via camera.setFocalLength()
let initialFocalLengthMm = 55;
// Hauteur relative de la caméra par rapport au centre du modèle (unités Three.js)
let initialCameraHeight = 1.2;
// Orbit horizontal initial autour du modèle, en degrés (0 = face avant, 90 = côté)
let initialOrbitDeg = 325;
// Distance de zoom initiale (en mètres) - si défini > 0, force la distance caméra->centre
// Mettre `null` ou `0` pour désactiver et utiliser le calcul automatique basé sur `fill`.
let initialZoomDistance = null;
// Fraction par défaut de la hauteur de la vue que le modèle doit remplir (0.0 - 1.0)
// Ex: 0.8 -> le modèle occupera 80% de la hauteur visible
let initialCameraFill = 0.7;

// Configuration des canaux de textures à charger (true = actif, false = désactivé)
// flipY: true = retourner verticalement (défaut), false = garder orientation originale
let textureChannels = {
    albedo: { enabled: true, extensions: ['jpg', 'png'], flipY: false },
    alpha: { enabled: false, extensions: ['jpg', 'png'], flipY: false },
    emission: { enabled: false, extensions: ['jpg', 'png'], flipY: false },
    height: { enabled: false, extensions: ['jpg', 'png'], flipY: false },
    metallic: { enabled: true, extensions: ['jpg', 'png'], flipY: false },
    normalGL: { enabled: true, extensions: ['png', 'jpg'], flipY: false },
    roughness: { enabled: true, extensions: ['jpg', 'png'], flipY: false },
    occlusion: { enabled: true, extensions: ['jpg', 'png'], flipY: false }
    
};

// -----------------------------------------------------------------------------
// UI: panneau de preview des textures (affichage configurable)
// -----------------------------------------------------------------------------
// Activer / Désactiver l'affichage du panneau (true = affiché)
let showTexturePreviewPanel = false;
// Taille des vignettes (en px) - modifiable
let texturePreviewSize = 120;
// id du conteneur créé dynamiquement
const texturePreviewContainerId = 'texture-preview-panel';

// Correction spécifique navigateur

// Activer/désactiver l'affichage des logs dans le viewer (true = logs activés)
let enableLogging = false;
// Activer/désactiver les logs spécifiques au chargement/gestion des textures
let enableTextureLogging = true;

// Met à jour la visibilité de l'UI de logs selon `enableLogging`.
function updateLogUIVisibility() {
    try {
        // Utiliser une classe sur <body> pour contrôler l'affichage via CSS (évite le flash)
            if (enableLogging) {
                document.body.classList.add('show-logs');
            } else {
                document.body.classList.remove('show-logs');
            }

        // Fallback : si l'élément existe et que le dev veut forcer le style, appliquer quand même
        const logContent = document.getElementById('log-content');
        if (logContent) {
            logContent.style.display = enableLogging ? '' : 'none';
            const parent = logContent.parentElement;
            if (parent && parent.id && parent.id !== 'log-content') {
                parent.style.display = enableLogging ? '' : 'none';
            }
        }
    } catch (e) {
        // Ignore any DOM errors during initial load
    }
}

// Appliquer immédiatement si le DOM est prêt, ou attendre l'événement DOMContentLoaded
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', updateLogUIVisibility);
} else {
    updateLogUIVisibility();
}
// Si true et si l'utilisateur est sous Firefox, on traitera le canal 'metallic'
// comme une texture sRGB pour tenter d'homogénéiser l'apparence entre navigateurs.
// (no browser-specific forcing active)

// -----------------------------------------------------------------------------
// (NOTE) metallic GPU correction removed — kept configuration minimal
// -----------------------------------------------------------------------------

// Configuration de la gestion des UVs
let uvSettings = {
    autoGenerateUV: false,  // Générer automatiquement les UVs si absents
    autoGenerateUV2: true   // Copier UV vers UV2 si nécessaire pour les AO maps
};

// Configuration de l'affichage des normales (debug)
let showNormals = false;        // Afficher les normales sous forme de flèches
let normalHelperSize = 0.1;     // Taille des flèches de normales
let normalHelperColor = 0x00ff00; // Couleur des flèches (vert par défaut)

// Configuration du mode d'éclairage
let unlitMode = false;  // true = Mode Unlit (pas d'éclairage temps réel, textures bakées), false = Mode lit (éclairage dynamique)
let emissiveColor = 0xffffff;  // Couleur émissive en mode Unlit (0xffffff = blanc, affichage fidèle)
let emissiveIntensity = 1.0;  // Intensité émissive en mode Unlit (1.0 = 100%, 0.5 = 50%, etc.)
let forceBasicMaterial = false;  // true = Remplacer les matériaux GLB par MeshBasicMaterial (optimal pour Unlit), false = Utiliser les matériaux existants

// Configuration du Tone Mapping et Color Space
// Tone Mapping - Options: NoToneMapping, LinearToneMapping, ReinhardToneMapping, CinematicToneMapping, ACESFilmicToneMapping
let toneMappingUnlit = THREE.NoToneMapping;  // Mode Unlit: NoToneMapping pour rendu fidèle aux textures bakées
let toneMappingLit = THREE.ACESFilmicToneMapping;  // Mode Lit: ACESFilmicToneMapping pour look cinématographique
//THREE.NoToneMapping  //THREE.LinearToneMapping  //THREE.ReinhardToneMapping  //THREE.CinematicToneMapping  //THREE.ACESFilmicToneMapping

let toneMappingExposureUnlit = 1.0;  // Exposition en mode Unlit (1.0 = neutre, 0.5 = sombre, 2.0 = lumineux)
let toneMappingExposureLit = 1.0;  // Exposition en mode Lit (ajuster selon l'éclairage de la scène)
// Color Space des textures - Options: THREE.SRGBColorSpace (recommandé pour couleurs), THREE.LinearSRGBColorSpace (pour données linéaires)
let textureColorSpace = THREE.SRGBColorSpace;  // sRGB recommandé pour textures albedo/couleur
// Output Color Space - Options: THREE.SRGBColorSpace (standard écran), THREE.LinearSRGBColorSpace (rendu linéaire), THREE.DisplayP3ColorSpace (écrans P3)
let outputColorSpace = THREE.SRGBColorSpace;  // Output sRGB recommandé pour affichage écran standard

// Configuration de l'environnement
let useEnvironmentMap = false;  // true = Utiliser une environment map, false = Utiliser la couleur de fond
let environmentMapPath = null;  // Chemin vers l'environment map HDR (ex: 'environment.hdr') ou null pour couleur unie
let envMapIntensity = 1.0;  // Intensité de l'environment map en mode Lit (0.0 à 2.0+)
let envMapRotation = 0;  // Rotation de l'environment map en radians (0 à Math.PI * 2)
// Mode Unlit : utilise ambientLightIntensity et backgroundColor comme équivalence
let backgroundColorUnlit = 0xffffff;  // Couleur de fond en mode Unlit (équivalent envMap)
let ambientLightIntensityUnlit = 0.5;  // Intensité ambiante en mode Unlit (équivalent envMapIntensity)
let envirfilename = ['Default','Env_01', 'Env_02'];
// Browser-aware defaults for circular label helpers (modifiable at runtime)
// Detect basic browser family to normalize text direction across Firefox/Chrome/Safari
const _isFirefox = typeof navigator !== 'undefined' && /Firefox\//i.test(navigator.userAgent);
// preferredDirection: Firefox tends to render textPath direction matching 'ccw' visually,
// Chromium/WebKit often appear reversed — choose direction to make visual result consistent.
// Global runtime toggles (exposed for debugging/override)
// Defaults now depend on the detected browser. If you want to force values
// from outside this script, set the corresponding `window._*` variable before
// this file is executed (or call `setCircularLabelBehavior()` at runtime).
const _ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
const _isChrome = /Chrome\//i.test(_ua) && !/Edg\//i.test(_ua) && !/OPR\//i.test(_ua) && !/Chromium\//i.test(_ua);
const _isEdge = /Edg(e|A|iOS)?\//i.test(_ua) || /Edge\//i.test(_ua);
const _isSafari = /Safari\//i.test(_ua) && !/Chrome\//i.test(_ua) && !/Chromium\//i.test(_ua) && !/Android/i.test(_ua);
// _isFirefox already exists above as `_isFirefox` — reuse when available
const _detectedBrowser = _isFirefox ? 'firefox' : (_isChrome ? 'chrome' : (_isEdge ? 'edge' : (_isSafari ? 'safari' : 'other')));

const _browserDefaults = {
    firefox: { invertCircularText: true, enableSweepFlag: true,  enableBottomRotation: false, direction: 'cw', rotationDeg: 90, showCodeLabel: true, codeLabelFormat: '${code}' },
    chrome:  { invertCircularText: true,  enableSweepFlag: true,  enableBottomRotation: false, direction: 'cw',  rotationDeg: 0,  showCodeLabel: true, codeLabelFormat: '${code}' },
    edge:    { invertCircularText: true,  enableSweepFlag: true,  enableBottomRotation: false, direction: 'cw',  rotationDeg: 0,  showCodeLabel: true, codeLabelFormat: '${code}' },
    safari:  { invertCircularText: true,  enableSweepFlag: false, enableBottomRotation: false, direction: 'cw',  rotationDeg: 0,  showCodeLabel: true, codeLabelFormat: '${code}' },
    other:   { invertCircularText: true,  enableSweepFlag: true,  enableBottomRotation: false, direction: 'cw',  rotationDeg: 0,  showCodeLabel: true, codeLabelFormat: '${code}' }
};

const _defaults = _browserDefaults[_detectedBrowser] || _browserDefaults.other;

// Only set defaults if the window flags are not already defined (allows manual override)
if (typeof window._invertCircularText === 'undefined') window._invertCircularText = !!_defaults.invertCircularText;
if (typeof window._enableSweepFlag === 'undefined') window._enableSweepFlag = !!_defaults.enableSweepFlag;
if (typeof window._enableBottomRotation === 'undefined') window._enableBottomRotation = !!_defaults.enableBottomRotation;
// expose a browser-dependent default rotation value
if (typeof window._circularRotationDeg === 'undefined') window._circularRotationDeg = Number(_defaults.rotationDeg || 0);

// Expose a small helper to change the behavior at runtime (console-friendly)
window.setCircularLabelBehavior = (opts = {}) => {
    if (typeof opts.invertCircularText !== 'undefined') window._invertCircularText = !!opts.invertCircularText;
    if (typeof opts.enableSweepFlag !== 'undefined') window._enableSweepFlag = !!opts.enableSweepFlag;
    if (typeof opts.enableBottomRotation !== 'undefined') window._enableBottomRotation = !!opts.enableBottomRotation;
    if (typeof opts.rotationDeg !== 'undefined') window._circularRotationDeg = Number(opts.rotationDeg) || 0;
    console.log('circularLabelBehavior:', {
        browser: _detectedBrowser,
        invertCircularText: window._invertCircularText,
        enableSweepFlag: window._enableSweepFlag,
        enableBottomRotation: window._enableBottomRotation
    });
    return {
        browser: _detectedBrowser,
        invertCircularText: window._invertCircularText,
        enableSweepFlag: window._enableSweepFlag,
        enableBottomRotation: window._enableBottomRotation
    };
};

// Global defaults for circular label helpers (modifiable at runtime)
const CIRCULAR_LABEL_DEFAULTS_ENV = { fontSize: 32, radius: 72, startOffset: '2%', color: '#242323ff', textAnchor: 'start', startAt: 'bottom', direction: _defaults.direction, rotationDeg: _defaults.rotationDeg || 0, showCodeLabel: !!_defaults.showCodeLabel, codeLabelFormat: _defaults.codeLabelFormat || '${code}' };
const CIRCULAR_LABEL_DEFAULTS_COLOR = { fontSize: 32, radius: 72, startOffset: '2%', color: '#242323ff', textAnchor: 'start', startAt: 'bottom', direction: _defaults.direction, rotationDeg: _defaults.rotationDeg || 0, showCodeLabel: !!_defaults.showCodeLabel, codeLabelFormat: _defaults.codeLabelFormat || '${code}' };

// NOTE: helper functions and their runtime calls have been moved
// down next to the UI generation code (generateEnvironmentSelector / generateColorButtons)
// pour garder la logique proche des éléments DOM qu'elles manipulent.

// Fonction de logging
function log(message, type = 'info') {
    if (!enableLogging) return;
    const logContent = document.getElementById('log-content');
    const logEntry = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString();
    const color = type === 'error' ? '#ff0000' : type === 'warning' ? '#ffaa00' : '#00ff00';
    logEntry.style.color = color;
    logEntry.textContent = `[${timestamp}] ${message}`;
    logContent.appendChild(logEntry);
    logContent.scrollTop = logContent.scrollHeight;
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Texture-specific logger: only logs when global logging is enabled AND texture logging enabled
function textureLog(message, type = 'info') {
    if (!enableLogging || !enableTextureLogging) return;
    log(message, type);
}

log('Initialisation de la visionneuse 3D...');

// Variables pour les lumières (déclarées globalement avant leur utilisation)
let ambientLight;
let directionalLight;

// Variables pour le produit
let modelName = 'fauteuil'; // Nom du modèle, sans extension
let modelExtension = null; // Extension détectée automatiquement (glb ou gltf)
let productParts = ['Pied', 'Assise']//,'Autre']; // Tableau des parties configurables du produit
// Codes de matériaux disponibles par partie (détectés automatiquement)
let materialCodesPerPart = {};
let currentColorIndex = {}; // Index dans le tableau de codes

// Liste des environment maps disponibles (détectées automatiquement)
let availableEnvironmentMaps = [];

// Fonction pour scanner les dossiers de textures et extraire les codes matériaux
async function scanMaterialCodes() {
    log('Scan des dossiers de textures...');
    
    for (const part of productParts) {
        const codes = new Set();
        const basePath = `Textures/${modelName}/${part}/`;
        
        // Tenter de charger un fichier index.json si disponible (optionnel)
        try {
            const response = await fetch(`${basePath}index.json`);
            if (response.ok) {
                const data = await response.json();
                materialCodesPerPart[part] = data.codes || [];
                currentColorIndex[part] = 0;
                log(`✓ Codes chargés pour ${part}: ${data.codes.join(', ')}`);
                continue;
            }
        } catch (e) {
            // Pas d'index.json, on continue avec la détection par essai
        }
        
        // Fallback: essayer des codes communs (à personnaliser selon vos besoins)
        const commonPrefixes = ['W', 'M', 'F', 'L', 'P', 'C', 'G', 'T', 'S', 'V','X'];
        const foundCodes = [];
        
        for (const prefix of commonPrefixes) {
            for (let i = 1; i <= 999; i++) {
                const code = `${prefix}${String(i).padStart(3, '0')}`;
                const testPath = `${basePath}Color_${code}_Albedo.png`;
                
                // Test si le fichier existe (HEAD request pour éviter de télécharger)
                try {
                    const response = await fetch(testPath, { method: 'HEAD' });
                    if (response.ok) {
                        foundCodes.push(code);
                        // On s'arrête après avoir trouvé le dernier code de cette série
                    } else if (foundCodes.length > 0 && foundCodes[foundCodes.length - 1].startsWith(prefix)) {
                        // Si on a trouvé des codes avec ce préfixe et qu'on vient d'échouer, on passe au préfixe suivant
                        break;
                    }
                } catch (e) {
                    if (foundCodes.length > 0 && foundCodes[foundCodes.length - 1].startsWith(prefix)) {
                        break;
                    }
                }
            }
        }
        
        materialCodesPerPart[part] = foundCodes.length > 0 ? foundCodes : ['W001']; // Valeur par défaut
        currentColorIndex[part] = 0;
        log(`✓ Codes détectés pour ${part}: ${materialCodesPerPart[part].join(', ')}`);
    }
    
    log('Scan des textures terminé');
}

// Fonction pour scanner le dossier environement et détecter les fichiers disponibles
async function scanEnvironmentMaps() {
    log('Scan des environment maps...');
    const basePath = 'Textures/environement/';
    const extensions = ['jpg', 'jpeg', 'png', 'hdr', 'exr'];

    // 1) Prefer index.json if present: fast single request to build UI
    try {
        const idxResp = await fetch(basePath + 'index.json');
        if (idxResp.ok) {
            const list = await idxResp.json();
            const maps = [];
            for (const item of list) {
                const file = item.file || item.path || (item.name ? item.name : null);
                if (!file) continue;
                const ext = (file.split('.').pop() || '').toLowerCase();
                maps.push({
                    name: item.name || file.replace(/\.[^.]+$/, ''),
                    path: basePath + file,
                    extension: ext,
                    displayName: item.displayName || item.name || file,
                    thumb: item.thumb ? (basePath + item.thumb) : null,
                    type: item.type || ext
                });
            }
            availableEnvironmentMaps = maps;
            log(`✓ ${maps.length} environment map(s) chargée(s) depuis index.json`);
            // Si l'index contient au moins un item, considérer le premier comme option par défaut
            if (maps.length > 0) {
                // Ne pas forcer si on est en mode Unlit
                if (!unlitMode) {
                    useEnvironmentMap = true;
                    // Respecter explicitement le choix précédent si déjà défini
                    if (!environmentMapPath) {
                        environmentMapPath = maps[0].path;
                        log(`→ Environment map par défaut définie depuis index.json: ${environmentMapPath}`);
                    } else {
                        log(`→ Environment map déjà définie (préservée): ${environmentMapPath}`);
                    }
                }
            }
            return maps;
        }
    } catch (e) {
        // ignore and fallback to heuristic scan
    }

    // Fallback: heuristic scan (existing behaviour)
    const foundMaps = [];
    // Liste de noms communs à tester (peut être étendue)
    const commonNames = envirfilename;

    // Tester chaque combinaison nom + extension
    for (const name of commonNames) {
        for (const ext of extensions) {
            const testPath = `${basePath}${name}.${ext}`;
            try {
                const response = await fetch(testPath, { method: 'HEAD' });
                if (response.ok) {
                    const mapEntry = {
                        name: name,
                        path: testPath,
                        extension: ext,
                        displayName: `${name} (.${ext})`,
                        thumb: null
                    };
                    // tenter de détecter une vignette côté serveur (basename + _thumb.png/jpg/webp)
                    try {
                        const thumb = await findEnvThumbnail(basePath, name);
                        if (thumb) mapEntry.thumb = thumb;
                    } catch (e) {
                        // ignore
                    }
                    foundMaps.push(mapEntry);
                    log(`✓ Environment map trouvée: ${name}.${ext}`);
                }
            } catch (e) {
                // Fichier non trouvé, continuer
            }
        }
    }

    availableEnvironmentMaps = foundMaps;

    if (foundMaps.length === 0) {
        log('⚠ Aucune environment map trouvée dans Textures/environement/', 'warning');
    } else {
        log(`✓ ${foundMaps.length} environment map(s) détectée(s)`);
    }

    return foundMaps;
}

// Helper: vérifie si une image existe (load via Image)
function checkImageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

// Cherche une vignette d'environment : basename + '_thumb' + ext
async function findEnvThumbnail(basePath, baseName) {
    const exts = ['jpg', 'png', 'webp'];
    for (const ext of exts) {
        const p = `${basePath}${baseName}_thumb.${ext}`;
        if (await checkImageExists(p)) return p;
    }
    return null;
}

// Texture loading strategy globals
// 'B' = fetch -> blob -> HTMLImageElement (default, lightweight, avoids WebGL warnings)
// 'C' = draw into canvas and optionally premultiply pixels (fallback / heavier)
let textureLoadStrategy = 'B';
let texturePremultiplyOnCanvas = false; // when using 'C', whether to premultiply manually
let textureForcePremultiply = false; // when using 'B', whether to set premultiplyAlpha on the texture

window.setTextureLoadStrategy = (s) => { textureLoadStrategy = s; };
window.setTexturePremultiplyOnCanvas = (b) => { texturePremultiplyOnCanvas = !!b; };
window.setTextureForcePremultiply = (b) => { textureForcePremultiply = !!b; };

// Utility: load image as a DOM HTMLImageElement via fetch->blob->objectURL
async function loadImageAsDOM(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Fetch failed: ' + resp.status);
    const blob = await resp.blob();
    return await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { resolve(img); URL.revokeObjectURL(img.src); };
        img.onerror = (e) => { try { URL.revokeObjectURL(img.src); } catch (er) {} reject(e); };
        img.src = URL.createObjectURL(blob);
    });
}

// Utility: draw an image into a canvas and optionally premultiply alpha (costly)
function imageToCanvasWithOptionalPremult(img, doPremultiply = false) {
    const w = img.width || 1;
    const h = img.height || 1;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,w,h);
    ctx.drawImage(img, 0, 0, w, h);
    if (doPremultiply) {
        try {
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const a = data[i + 3] / 255;
                data[i] = Math.round(data[i] * a);
                data[i + 1] = Math.round(data[i + 1] * a);
                data[i + 2] = Math.round(data[i + 2] * a);
            }
            ctx.putImageData(imageData, 0, 0);
        } catch (e) {
            // getImageData can fail if the image is tainted (CORS). In that case, return the canvas as-is.
            console.warn('Premultiplication failed (CORS or large image):', e);
        }
    }
    return canvas;
}

// Initialisation Three.js
const scene = new THREE.Scene();
scene.background = transparentBackground ? null : new THREE.Color(backgroundColor);

// Use the #viewer element size for camera aspect and renderer size (frame centered)
const viewerElement = document.getElementById('viewer');
const initialWidth = viewerElement.clientWidth || window.innerWidth;
const initialHeight = viewerElement.clientHeight || window.innerHeight;

const camera = new THREE.PerspectiveCamera(cameraFov, initialWidth / initialHeight, cameraNear, cameraFar);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('threejs-canvas'), alpha: transparentBackground });
renderer.setSize(initialWidth, initialHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Configuration du tone mapping et color space
renderer.toneMapping = unlitMode ? toneMappingUnlit : toneMappingLit;
renderer.toneMappingExposure = unlitMode ? toneMappingExposureUnlit : toneMappingExposureLit;
renderer.outputColorSpace = outputColorSpace;
// rendre la couleur de clear transparente si demandé
renderer.setClearColor(0x000000, transparentBackground ? 0 : 1);
// ensure canvas DOM shows transparent background so page background is visible
if (renderer.domElement) renderer.domElement.style.background = transparentBackground ? 'transparent' : '';
log(`Renderer configuré: toneMapping=${getToneMappingName(renderer.toneMapping)}, exposure=${renderer.toneMappingExposure}, outputColorSpace=${outputColorSpace}, transparentBackground=${transparentBackground}`);

// Lumières (initialisation avant initializeEnvironment)
ambientLight = new THREE.AmbientLight(0xffffff, ambientLightIntensity);
scene.add(ambientLight);

directionalLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Initialiser l'environnement après les lumières
initializeEnvironment();

// Contrôles
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enablePan = true;
controls.enableRotate = true;
controls.autoRotateSpeed = autoRotateSpeed;

// Charger le modèle GLB
let model;
let materials = {}; // Objet pour stocker les matériaux par partie

// Fonction pour détecter l'extension du modèle disponible
async function detectModelExtension() {
    const extensions = ['glb', 'gltf'];
    for (const ext of extensions) {
        try {
            const response = await fetch(`${modelName}.${ext}`, { method: 'HEAD' });
            if (response.ok) {
                modelExtension = ext;
                log(`✓ Modèle trouvé: ${modelName}.${ext}`);
                return ext;
            }
        } catch (e) {
            // Fichier non trouvé, continuer
        }
    }
    log('✗ Aucun fichier .glb ou .gltf trouvé, tentative avec .glb par défaut', 'warning');
    modelExtension = 'glb';
    return 'glb';
}

// Détecter l'extension, scanner les textures et environment maps, puis charger le modèle
detectModelExtension()
    .then(() => scanMaterialCodes())
    .then(() => scanEnvironmentMaps())
    .then(() => {
        // Générer l'interface après avoir scanné les environment maps
        generateEnvironmentSelector();
    })
    .then(() => {
    const modelFile = `${modelName}.${modelExtension}`;
    log(`Chargement du modèle: ${modelFile}`);
    const loader = new GLTFLoader();

    // Configurer le DRACOLoader pour les modèles compressés
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(modelFile, (gltf) => {
    log(`Modèle ${modelExtension.toUpperCase()} chargé avec succès`);
    model = gltf.scene;
    scene.add(model);

    // Analyser tous les matériaux présents dans le modèle
    log('=== ANALYSE DES MATÉRIAUX DU MODÈLE ===');
    const allMaterials = new Map();
    let meshCount = 0;
    
    model.traverse((child) => {
        if (child.isMesh) {
            meshCount++;
            log(`Mesh #${meshCount}: "${child.name}"`);
            
            // Vérifier les UVs
            const geometry = child.geometry;
            if (geometry) {
                const hasUV = geometry.attributes.uv !== undefined;
                const hasUV2 = geometry.attributes.uv2 !== undefined;
                log(`  ├─ Géométrie: ${geometry.type}`);
                log(`  ├─ Vertices: ${geometry.attributes.position ? geometry.attributes.position.count : 0}`);
                log(`  ├─ UV (channel 0): ${hasUV ? '✓ Présent' : '✗ ABSENT'}`);
                if (hasUV) {
                    log(`  │  └─ ${geometry.attributes.uv.count} UVs`);
                }
                log(`  ├─ UV2 (channel 1): ${hasUV2 ? '✓ Présent' : '✗ Absent'}`);
                if (hasUV2) {
                    log(`  │  └─ ${geometry.attributes.uv2.count} UV2s`);
                }
                
                if (!hasUV) {
                    log(`  ⚠ ATTENTION: Pas d'UV sur ce mesh, les textures ne s'afficheront pas!`, 'error');
                }
            }
            
            // Gérer les matériaux multiples ou uniques
            const materialsArray = Array.isArray(child.material) ? child.material : [child.material];
            
            materialsArray.forEach((mat, index) => {
                const matInfo = {
                    name: mat.name || 'Sans nom',
                    type: mat.type,
                    uuid: mat.uuid,
                    meshName: child.name,
                    slotIndex: index
                };
                
                log(`  └─ Slot ${index}: "${mat.name}" (${mat.type})`);
                
                // Stocker les infos du matériau
                if (!allMaterials.has(mat.uuid)) {
                    allMaterials.set(mat.uuid, matInfo);
                }
            });
        }
    });
    
    log(`=== TOTAL: ${meshCount} mesh(es), ${allMaterials.size} matériau(x) unique(s) ===`);
    
    // Afficher tous les noms de matériaux uniques
    log('Liste des matériaux uniques:');
    allMaterials.forEach((info, uuid) => {
        log(`  • "${info.name}" (${info.type})`);
    });
    
    // Afficher les normales si activé
    if (showNormals) {
        log('=== AFFICHAGE DES NORMALES ACTIVÉ ===');
        model.traverse((child) => {
            if (child.isMesh) {
                const helper = new VertexNormalsHelper(child, normalHelperSize, normalHelperColor);
                scene.add(helper);
                log(`✓ Helper normales ajouté pour mesh: "${child.name}"`);
            }
        });
    }

    // Trouver les matériaux pour chaque partie configurée
    log('=== CORRESPONDANCE AVEC PARTIES CONFIGURABLES ===');
    let foundMaterials = 0;
    model.traverse((child) => {
        if (child.isMesh) {
            const materialsArray = Array.isArray(child.material) ? child.material : [child.material];
            
            materialsArray.forEach((mat, index) => {
                productParts.forEach(part => {
                    if (mat.name.toLowerCase() === part.toLowerCase()) {
                        // Remplacer par MeshBasicMaterial si demandé
                        if (forceBasicMaterial) {
                            const basicMat = createBasicMaterialFromExisting(mat);
                            materials[part] = basicMat;
                            // Remplacer le matériau sur le mesh
                            if (Array.isArray(child.material)) {
                                child.material[index] = basicMat;
                            } else {
                                child.material = basicMat;
                            }
                            foundMaterials++;
                            log(`✓ Matériau "${mat.name}" (${mat.type}) remplacé par MeshBasicMaterial pour partie: ${part}`);
                        } else {
                            materials[part] = mat;
                            foundMaterials++;
                            log(`✓ Matériau "${mat.name}" (${mat.type}) assigné à partie: ${part}`);
                        }
                    }
                });
            });
        }
    });
    
    if (foundMaterials === 0) {
        log('⚠ ATTENTION: Aucun matériau ne correspond aux parties configurées!', 'warning');
        log('Vérifiez que les noms dans productParts correspondent aux noms dans le GLB', 'warning');
    } else {
        log(`✓ Total matériaux assignés: ${foundMaterials}/${productParts.length}`);
    }
    
    // Afficher les parties non trouvées
    productParts.forEach(part => {
        if (!materials[part]) {
            log(`✗ Partie "${part}" non trouvée dans le modèle`, 'warning');
        }
    });
    log('=== FIN ANALYSE ===');

    // Charger les textures initiales pour chaque partie (attendre puis charger les dossiers additionnels)
    const initialLoadPromises = productParts.map(part => {
        const materialCode = materialCodesPerPart[part] && materialCodesPerPart[part][currentColorIndex[part]] ? materialCodesPerPart[part][currentColorIndex[part]] : (materialCodesPerPart[part] ? materialCodesPerPart[part][0] : null);
        textureLog(`Chargement des textures pour: ${part} (matériau ${materialCode})`);
        return loadTextures(part, currentColorIndex[part]).catch(e => { log(`Erreur chargement textures pour ${part}: ${e && e.message ? e.message : e}`, 'warning'); return null; });
    });

    Promise.all(initialLoadPromises).then(() => {
        // Après avoir chargé les textures pour les parties configurées, tenter de charger d'autres dossiers listés
        // dans un index.json au niveau du dossier produit (Textures/<modelName>/index.json)
        loadOtherTextureFoldersAndApply().catch(err => { log(`Erreur lors du chargement des dossiers additionnels: ${err && err.message ? err.message : err}`, 'warning'); });
    });

    // Cadre automatique du modèle : utilise les variables initiales (focal length, hauteur, azimut, fill)
    frameModel(model, { fill: initialCameraFill, azimuthDeg: initialOrbitDeg, cameraHeight: initialCameraHeight, focalLengthMm: initialFocalLengthMm });
    log('Chargement terminé avec succès');
    
    // Charger l'environment map par défaut si en mode Lit
    if (!unlitMode) {
        // Si un environment map a été défini (par example via index.json), l'utiliser.
        if (useEnvironmentMap && environmentMapPath) {
            log(`Chargement de l'environment map par défaut définie: ${environmentMapPath}`);
            changeEnvironment({ type: 'envmap', envMapPath: environmentMapPath, intensity: envMapIntensity, rotation: envMapRotation })
                .then(() => { log('✓ Environment map par défaut appliquée'); })
                .catch((error) => { log(`⚠ Impossible de charger l'environment map par défaut: ${error.message}`, 'warning'); });
        } else {
            const defaultEnvMapPath = 'Textures/environement/Default_Lit.hdr';
            log('Chargement de l\'environment map par défaut: Default_Lit.hdr');
            changeEnvironment({ type: 'envmap', envMapPath: defaultEnvMapPath, intensity: envMapIntensity, rotation: envMapRotation })
                .then(() => { log('✓ Environment map par défaut appliquée'); })
                .catch((error) => { log(`⚠ Impossible de charger l'environment map par défaut: ${error.message}`, 'warning'); });
        }
    }
    
    // Générer les boutons de couleur dynamiquement (après le chargement)
    generateColorButtons();
}, undefined, (error) => {
    log(`Erreur chargement ${modelExtension.toUpperCase()}: ${error.message}`, 'error');
    console.error(`Erreur chargement ${modelExtension.toUpperCase()}:`, error);
});
});

// Fonction pour charger les textures
// Retourne une Promise résolvant sur l'objet `textures` (ou null si échec)
async function loadTextures(part, colorIndex) {
    const textureLoader = new THREE.TextureLoader();

    // Si le dossier a un index.json local, tenter de le lire pour récupérer les codes
    try {
        if (!materialCodesPerPart[part]) {
            const idxResp = await fetch(`Textures/${modelName}/${part}/index.json`);
            if (idxResp.ok) {
                const data = await idxResp.json();
                if (data && Array.isArray(data.codes) && data.codes.length > 0) {
                    materialCodesPerPart[part] = data.codes;
                    currentColorIndex[part] = 0;
                    log(`✓ Codes chargés pour ${part} depuis ${modelName}/${part}/index.json: ${data.codes.join(', ')}`);
                }
            }
        }
    } catch (e) {
        // ignore index.json errors
    }

    const rawMaterialCode = (materialCodesPerPart[part] && materialCodesPerPart[part][colorIndex]) ? materialCodesPerPart[part][colorIndex] : (materialCodesPerPart[part] && materialCodesPerPart[part][0]) ? materialCodesPerPart[part][0] : null;
    const materialCode = normalizeMaterialCode(rawMaterialCode || '');
    const basePath = `Textures/${modelName}/${part}/Color_${materialCode}_`;

    // Fonction helper pour essayer de charger une texture avec plusieurs extensions
    function loadTextureWithFallback(name, extensions = ['png', 'jpg'], flipY = true) {
        return new Promise((resolve) => {
            let attemptIndex = 0;
            
            function tryLoad() {
                if (attemptIndex >= extensions.length) {
                    log(`✗ Aucune texture trouvée pour ${name}`, 'warning');
                    resolve(null);
                    return;
                }
                
                const ext = extensions[attemptIndex];
                const path = `${basePath}${name}.${ext}`;
                
                // Preferred approach: try to fetch as blob -> HTMLImageElement so we upload from a DOM element
                (async () => {
                    try {
                        const img = await loadImageAsDOM(path);
                        let texImage = null;
                        if (textureLoadStrategy === 'C') {
                            // draw into canvas and optionally premultiply
                            const canvas = imageToCanvasWithOptionalPremult(img, texturePremultiplyOnCanvas);
                            texImage = canvas;
                        } else {
                            // Strategy B: use the HTMLImageElement directly
                            texImage = img;
                        }

                        const t = new THREE.Texture(texImage);
                        // Apply flipY as requested (DOM uploads support flipY)
                        t.flipY = flipY;

                        // Apply premultiplication policy
                        if (textureLoadStrategy === 'C' && texturePremultiplyOnCanvas) {
                            // we already premultiplied pixels on canvas -> do not ask GPU to premultiply
                            t.premultiplyAlpha = false;
                        } else {
                            // delegate premultiply to GL if requested globally
                            t.premultiplyAlpha = !!textureForcePremultiply;
                        }

                        // Color space decision
                        if (name.toLowerCase().includes('albedo') || name.toLowerCase().includes('emission')) {
                            t.colorSpace = textureColorSpace;
                        } else {
                            t.colorSpace = THREE.LinearSRGBColorSpace;
                        }

                        t.needsUpdate = true;
                        textureLog(`✓ Texture chargée (via fetch->img): Color_${materialCode}_${name}.${ext} (flipY: ${t.flipY}, colorSpace: ${t.colorSpace})`);
                        resolve(t);
                        return;
                    } catch (e) {
                        // fetch/objectURL or img creation failed -> fallback to TextureLoader
                    }

                    // fallback: try the default TextureLoader (this will handle caching and decoding)
                    textureLoader.load(
                        path,
                        (loadedTexture) => {
                            loadedTexture.flipY = flipY;
                            if (name.toLowerCase().includes('albedo') || name.toLowerCase().includes('emission')) {
                                loadedTexture.colorSpace = textureColorSpace;
                            } else {
                                loadedTexture.colorSpace = THREE.LinearSRGBColorSpace;
                            }
                            textureLog(`✓ Texture chargée (fallback): Color_${materialCode}_${name}.${ext} (flipY: ${flipY}, colorSpace: ${loadedTexture.colorSpace})`);
                            resolve(loadedTexture);
                        },
                        undefined,
                        () => {
                            attemptIndex++;
                            tryLoad();
                        }
                    );
                })();
            }
            
            tryLoad();
        });
    }

    // Charger uniquement les textures activées
    const texturePromises = [];
    const enabledChannels = [];
    
    Object.entries(textureChannels).forEach(([channel, config]) => {
        if (config.enabled) {
            // Capitaliser la première lettre pour le nom de fichier
                const channelName = channel.charAt(0).toUpperCase() + channel.slice(1);
            texturePromises.push(loadTextureWithFallback(channelName, config.extensions, config.flipY));
            enabledChannels.push(channel);
                textureLog(`  → Chargement ${channel} activé (flipY: ${config.flipY})`);
        } else {
                textureLog(`  ⊘ Chargement ${channel} désactivé`, 'info');
        }
    });
    
    return Promise.all(texturePromises).then((loadedTextures) => {
        // Créer un objet avec les textures chargées
        const textures = {};
        enabledChannels.forEach((channel, index) => {
            textures[channel] = loadedTextures[index];
        });

        // Assigner aux matériaux
        // Pour éviter de ne mettre à jour qu'une seule instance de matériau (cas où plusieurs
        // objets ont des instances de matériaux distinctes mais portant le même nom),
        // on applique maintenant les textures à toutes les instances de matériau dont
        // le nom correspond à la partie (comparaison insensible à la casse).
        const appliedMaterials = [];
        try {
            model.traverse((child) => {
                if (!child.isMesh) return;
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((mat) => {
                    if (!mat || !mat.name) return;
                    try {
                        if (String(mat.name).toLowerCase() === String(part).toLowerCase()) {
                            applyMaterialMode(mat, textures);
                            mat.needsUpdate = true;
                            appliedMaterials.push(mat);
                        }
                    } catch (e) {
                        // ignore per-material errors
                    }
                });
            });
        } catch (e) {
            // traversal error
            log(`Erreur lors de l'application des textures sur les matériaux: ${e && e.message ? e.message : e}`, 'warning');
        }

        if (appliedMaterials.length > 0) {
            log(`✓ Textures appliquées sur ${appliedMaterials.length} matériau(x) correspondant(s) à: ${part}`);

            // Utiliser la première instance trouvée pour les traitements qui nécessitent
            // une référence unique (génération d'UV, setup UV2 pour AO, maj des swatchs UI)
            const materialForHelpers = appliedMaterials[0];

            // Vérifier et générer les UVs si nécessaire (utiliser materialForHelpers pour la détection)
            if (uvSettings.autoGenerateUV) {
                let hasUVs = false;
                model.traverse((child) => {
                    if (child.isMesh) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        if (mats.includes(materialForHelpers)) {
                            hasUVs = child.geometry.attributes.uv !== undefined;
                            if (!hasUVs) {
                                log(`⚠ Mesh "${child.name}" n'a pas d'UVs, génération automatique...`, 'warning');
                                if (!child.geometry.attributes.uv) {
                                    const uvArray = [];
                                    const posArray = child.geometry.attributes.position.array;
                                    for (let i = 0; i < posArray.length; i += 3) {
                                        uvArray.push((posArray[i] + 1) / 2, (posArray[i + 1] + 1) / 2);
                                    }
                                    child.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvArray, 2));
                                    log(`✓ UVs générés automatiquement pour "${child.name}"`);
                                }
                            }
                        }
                    }
                });
            }

            // Gérer les UV2 pour l'AO map si nécessaire
            setupUV2ForAO(materialForHelpers, textures);

            log(`✓ Matériaux ${part} mis à jour`);

            // Mettre à jour le panneau de preview avec les textures chargées
            window._lastLoadedTextures = textures;
            updateTexturePreviewPanel(textures);

            // essayer de trouver un swatch serveur et mettre à jour le bouton (utilise la 1re instance)
            (async () => {
                try {
                    const rawMaterialCode = materialCodesPerPart[part] && materialCodesPerPart[part][colorIndex] ? materialCodesPerPart[part][colorIndex] : (materialCodesPerPart[part] ? materialCodesPerPart[part][0] : null);
                    const materialCode = normalizeMaterialCode(rawMaterialCode);
                    const folderPath = `Textures/${modelName}/${part}/`;
                    const swatch = await findSwatchForMaterial(folderPath, materialCode);
                    if (swatch) {
                        const btn = document.getElementById(`${part.toLowerCase()}-color-btn`);
                        if (btn) {
                            const sw = btn.querySelector('.swatch');
                            if (sw) {
                                sw.style.backgroundImage = `url('${swatch}')`;
                                sw.style.backgroundColor = 'transparent';
                                sw.textContent = '';
                            }
                        }
                    } else {
                        updateColorButtonSwatch(part, textures);
                    }
                } catch (e) {
                    updateColorButtonSwatch(part, textures);
                }
            })();

            return textures;
        } else {
            log(`✗ Aucun matériau trouvé pour ${part}`, 'warning');
            return null;
        }
    });
}

// Après le chargement initial, lire Textures/<modelName>/index.json (si présent)
// et tenter de charger/apply les textures des dossiers supplémentaires.
async function loadOtherTextureFoldersAndApply() {
    const idxPath = `Textures/${modelName}/index.json`;
    try {
        const resp = await fetch(idxPath);
        if (!resp.ok) {
            log(`Aucun index.json au niveau du produit (${idxPath}), pas de dossiers additionnels à charger`);
            return;
        }
        const data = await resp.json();
        if (!data) return;

        // Supporter plusieurs formats: { parts: [...] } | { folders: [...] } | { items: [ { name } ] } | array
        let folders = [];
        if (Array.isArray(data)) {
            folders = data.map(it => typeof it === 'string' ? it : (it.name || it.folder || null)).filter(Boolean);
        } else if (Array.isArray(data.parts)) {
            folders = data.parts.slice();
        } else if (Array.isArray(data.folders)) {
            folders = data.folders.slice();
        } else if (Array.isArray(data.items)) {
            folders = data.items.map(it => typeof it === 'string' ? it : (it.name || it.folder || null)).filter(Boolean);
        } else if (Array.isArray(data.files)) {
            // essayer d'extraire dossier à partir de chemins
            folders = data.files.map(f => {
                if (typeof f === 'string' && f.includes('/')) return f.split('/')[0];
                return null;
            }).filter(Boolean);
        }

        // Dédupliquer et exclure les productParts déjà gérés
        folders = [...new Set(folders.map(f => String(f)))].filter(f => f && !productParts.includes(f));
        if (folders.length === 0) {
            log('Aucun dossier additionnel trouvé dans l\'index du produit.');
            return;
        }

        for (const folder of folders) {
            try {
                log(`Chargement textures dossier additionnel: ${folder}`);
                // charger textures (loadTextures tente de lire folder/index.json si présent)
                const textures = await loadTextures(folder, currentColorIndex[folder] || 0);
                if (!textures) continue;

                // Appliquer aux matériaux correspondant au nom de dossier
                model.traverse((child) => {
                    if (!child.isMesh) return;
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    mats.forEach((mat) => {
                        if (!mat || !mat.name) return;
                        if (mat.name.toLowerCase() === folder.toLowerCase()) {
                            applyMaterialMode(mat, textures);
                            mat.needsUpdate = true;
                            log(`✓ Textures appliquées au matériau ${mat.name} depuis dossier ${folder}`);
                        }
                    });
                });
            } catch (e) {
                log(`Erreur chargement dossier ${folder}: ${e && e.message ? e.message : e}`, 'warning');
            }
        }
    } catch (e) {
        log(`Impossible de lire ${idxPath} ou traiter son contenu: ${e && e.message ? e.message : e}`, 'warning');
    }
}

// Normalize material code: accept either 'W001' or 'Color_W001' and return 'W001'
function normalizeMaterialCode(code) {
    if (!code) return code;
    const s = String(code);
    return s.replace(/^Color_/i, '');
}

// In-memory cache to avoid repeated network checks for swatches
const _swatchLookupCache = new Map();

/**
 * Trouve la vignette (swatch) pour un matériau donné.
 * Recherche d'abord un `index.json` côté dossier (optionnel) puis tente des patterns connus.
 * @param {string} folderPath - Chemin du dossier (ex: 'Textures/fauteuil/Assise/')
 * @param {string} materialCode - Code matériau normalisé (ex: 'L001' ou 'Color_L001')
 * @returns {Promise<string|null>} - URL de la vignette ou null si introuvable
 */
async function findSwatchForMaterial(folderPath, materialCode) {
    if (!folderPath) return null;
    const folder = folderPath.endsWith('/') ? folderPath : folderPath + '/';
    const code = normalizeMaterialCode(materialCode);
    const cacheKey = folder + code;
    if (_swatchLookupCache.has(cacheKey)) return _swatchLookupCache.get(cacheKey);

    // 1) Tentative : lire un index.json local (par-part) si présent
    try {
        const resp = await fetch(folder + 'index.json');
        if (resp.ok) {
            const data = await resp.json();
            // Format attendu possible : { swatches: { "L001": "Color_L001_thumb.jpg" }, files: [...], items: [...] }
            if (data && typeof data === 'object') {
                if (data.swatches && data.swatches[code]) {
                    const candidate = folder + data.swatches[code];
                    if (await checkImageExists(candidate)) {
                        _swatchLookupCache.set(cacheKey, candidate);
                        return candidate;
                    }
                }

                const arrayCandidates = data.items || data.files || data.list || null;
                if (Array.isArray(arrayCandidates)) {
                    for (const it of arrayCandidates) {
                        if (typeof it === 'string') {
                            // string could be filename
                            if (it.includes(code)) {
                                const p = folder + it;
                                if (await checkImageExists(p)) {
                                    _swatchLookupCache.set(cacheKey, p);
                                    return p;
                                }
                            }
                        } else if (it && typeof it === 'object') {
                            const itCode = it.code || it.name || it.id || null;
                            if (itCode && String(itCode).includes(code)) {
                                const thumb = it.thumb || it.file || it.path || null;
                                if (thumb) {
                                    const p = folder + thumb;
                                    if (await checkImageExists(p)) {
                                        _swatchLookupCache.set(cacheKey, p);
                                        return p;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        // ignore index.json errors and fallback to pattern search
    }

    // 2) Patterns : préférer suffixe `_thumb` (jpg/jpeg/png/webp), fallback `_Swatch`
    const preferredExts = ['jpg', 'jpeg', 'png', 'webp'];
    const suffixes = ['_thumb', '_Swatch'];

    for (const suffix of suffixes) {
        for (const ext of preferredExts) {
            const p = `${folder}Color_${code}${suffix}.${ext}`;
            if (await checkImageExists(p)) {
                _swatchLookupCache.set(cacheKey, p);
                return p;
            }
        }
        // essayer aussi sans le préfixe `Color_` (certaines intégrations stockent juste `<code>_thumb.jpg`)
        for (const ext of preferredExts) {
            const p2 = `${folder}${code}${suffix}.${ext}`;
            if (await checkImageExists(p2)) {
                _swatchLookupCache.set(cacheKey, p2);
                return p2;
            }
        }
    }

    _swatchLookupCache.set(cacheKey, null);
    return null;
}

// ================================================================================
// FONCTIONS DE GESTION DE L'ENVIRONNEMENT
// ================================================================================

/**
 * Initialise l'environnement de la scène (background et environment map)
 * Configure différemment selon le mode Unlit ou Lit
 */
function initializeEnvironment() {
    if (unlitMode) {
        applyUnlitEnvironment();
    } else {
        applyLitEnvironment();
    }
}

/**
 * Applique l'environnement pour le mode Unlit
 * Utilise la couleur de fond et l'intensité ambiante comme équivalents
 */
function applyUnlitEnvironment() {
    // Couleur de fond
    scene.background = transparentBackground ? null : new THREE.Color(backgroundColorUnlit);
    log(`Environnement Unlit: background=${transparentBackground ? 'transparent' : backgroundColorUnlit.toString(16)}, ambientIntensity=${ambientLightIntensityUnlit}`);
    
    // Ajuster l'intensité de la lumière ambiante (équivalent envMapIntensity)
    if (ambientLight) {
        ambientLight.intensity = ambientLightIntensityUnlit;
    }
    
    // Pas d'environment map en mode Unlit (textures bakées)
    scene.environment = null;
}

/**
 * Applique l'environnement pour le mode Lit
 * Utilise environment map si disponible, sinon couleur de fond
 */
async function applyLitEnvironment() {
    if (useEnvironmentMap && environmentMapPath) {
        // Charger l'environment map
        try {
            log(`Chargement de l'environment map: ${environmentMapPath}`);
            const envMap = await loadEnvironmentMap(environmentMapPath);
            
            if (envMap) {
                // Appliquer la rotation si spécifiée
                if (envMapRotation !== 0) {
                    // Rotation de l'environment map via une matrice
                    scene.environmentRotation = new THREE.Euler(0, envMapRotation, 0);
                }
                
                scene.environment = envMap;
                // Utiliser l'envMap comme background uniquement si on n'a pas demandé la transparence
                scene.background = transparentBackground ? null : envMap;
                
                // Appliquer l'intensité aux matériaux
                applyEnvMapIntensityToMaterials(envMapIntensity);
                
                log(`✓ Environment map appliquée (intensity: ${envMapIntensity}, rotation: ${envMapRotation} rad)`);
            } else {
                log('✗ Échec chargement environment map, utilisation couleur de fond', 'warning');
                scene.background = transparentBackground ? null : new THREE.Color(backgroundColor);
                scene.environment = null;
            }
        } catch (error) {
            log(`✗ Erreur environment map: ${error.message}`, 'error');
            scene.background = transparentBackground ? null : new THREE.Color(backgroundColor);
            scene.environment = null;
        }
    } else {
        // Pas d'environment map, utiliser couleur de fond
        scene.background = transparentBackground ? null : new THREE.Color(backgroundColor);
        scene.environment = null;
        log(`Environnement Lit: background ${transparentBackground ? 'transparent' : 'couleur unie (0x' + backgroundColor.toString(16) + ')'}`);
    }
}

/**
 * Charge une environment map depuis un fichier HDR ou texture équirectangulaire
 * Supporte: JPG, PNG, HDR (via RGBELoader), EXR (via EXRLoader)
 * @param {string} path - Chemin vers le fichier d'environment map
 * @returns {Promise<THREE.Texture>} - La texture d'environment map chargée
 */
async function loadEnvironmentMap(path) {
    return new Promise((resolve, reject) => {
        // Détecter l'extension du fichier
        const extension = path.split('.').pop().toLowerCase();
        let loader;
        
        if (extension === 'hdr') {
            // RGBELoader pour fichiers HDR
            loader = new RGBELoader();
            loader.load(
                path,
                (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    texture.colorSpace = THREE.LinearSRGBColorSpace; // HDR en linear
                    log('✓ Environment map HDR chargée');
                    resolve(texture);
                },
                undefined,
                (error) => {
                    reject(error);
                }
            );
            
        } else if (extension === 'exr') {
            // EXRLoader pour fichiers EXR
            loader = new EXRLoader();
            loader.load(
                path,
                (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    texture.colorSpace = THREE.LinearSRGBColorSpace; // EXR en linear
                    log('✓ Environment map EXR chargée');
                    resolve(texture);
                },
                undefined,
                (error) => {
                    reject(error);
                }
            );
            
        } else if (extension === 'jpg' || extension === 'jpeg' || extension === 'png') {
            // TextureLoader pour JPG/PNG (LDR)
            loader = new THREE.TextureLoader();
            loader.load(
                path,
                (texture) => {
                    texture.mapping = THREE.EquirectangularReflectionMapping;
                    texture.colorSpace = THREE.SRGBColorSpace; // LDR en sRGB
                    log('✓ Environment map LDR chargée');
                    resolve(texture);
                },
                undefined,
                (error) => {
                    reject(error);
                }
            );
            
        } else {
            reject(new Error(`Format non supporté: ${extension}`));
        }
    });
}

/**
 * Applique l'intensité de l'environment map à tous les matériaux de la scène
 * @param {number} intensity - Intensité de l'environment map (0.0 à 2.0+)
 */
function applyEnvMapIntensityToMaterials(intensity) {
    if (!model) return;
    
    model.traverse((child) => {
        if (child.isMesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
                if (mat.envMapIntensity !== undefined) {
                    mat.envMapIntensity = intensity;
                    mat.needsUpdate = true;
                }
            });
        }
    });
}

/**
 * Change l'environnement dynamiquement (couleur ou environment map)
 * @param {Object} options - Options de configuration
 * @param {string} options.type - Type: 'color' ou 'envmap'
 * @param {number} options.color - Couleur hexadécimale (si type='color')
 * @param {string} options.envMapPath - Chemin vers envMap (si type='envmap')
 * @param {number} options.intensity - Intensité (envMapIntensity pour Lit, ambientLight pour Unlit)
 * @param {number} options.rotation - Rotation en radians (mode Lit uniquement)
 */
async function changeEnvironment(options = {}) {
    const { type = 'color', color = 0xffffff, envMapPath = null, intensity = 1.0, rotation = 0 } = options;
    
    if (unlitMode) {
        // Mode Unlit: changer couleur de fond et intensité ambiante
        backgroundColorUnlit = color;
        ambientLightIntensityUnlit = intensity;
        log(`Changement environnement Unlit: color=0x${color.toString(16)}, intensity=${intensity}`);
        applyUnlitEnvironment();
    } else {
        // Mode Lit: changer envMap ou couleur
        if (type === 'envmap' && envMapPath) {
            useEnvironmentMap = true;
            environmentMapPath = envMapPath;
            envMapIntensity = intensity;
            envMapRotation = rotation;
            log(`Changement environnement Lit: envMap=${envMapPath}, intensity=${intensity}, rotation=${rotation}`);
            await applyLitEnvironment();
            
            // Réappliquer aux matériaux existants
            applyEnvMapIntensityToMaterials(intensity);
            // Mettre à jour le label circulaire du toggle d'environment si présent
            try {
                const container = document.getElementById('env-dropdown');
                if (container && container._envTextPath) {
                    // Trouver le displayName correspondant si disponible
                    const found = availableEnvironmentMaps.find(m => m.path === envMapPath);
                    const label = found ? (found.displayName || found.name) : (envMapPath ? envMapPath.split('/').pop() : 'Env');
                    const thumb = found ? found.thumb : null;
                    container._envTextPath.textContent = label;
                    // Si le toggle img existe, update src
                    const toggleImg = container.querySelector('.env-dropdown-toggle img');
                    if (toggleImg && (thumb || envMapPath)) toggleImg.src = thumb || envMapPath;
                    if (toggleImg) toggleImg.style.display = thumb || envMapPath ? '' : 'none';
                }
            } catch (e) { /* ignore UI update errors */ }
        } else {
            useEnvironmentMap = false;
            backgroundColor = color;
            log(`Changement environnement Lit: color=0x${color.toString(16)}`);
            scene.background = transparentBackground ? null : new THREE.Color(color);
            scene.environment = null;
        }
    }
}

// ================================================================================
// FONCTIONS DE GESTION DES MATÉRIAUX ET MODES D'ÉCLAIRAGE
// ================================================================================

/**
 * Crée un MeshBasicMaterial à partir d'un matériau existant
 * Conserve les propriétés de base (nom, transparence, couleur)
 * @param {THREE.Material} existingMaterial - Le matériau existant à convertir
 * @returns {THREE.MeshBasicMaterial} - Le nouveau matériau basique
 */
function createBasicMaterialFromExisting(existingMaterial) {
    const basicMat = new THREE.MeshBasicMaterial({
        name: existingMaterial.name,
        color: existingMaterial.color ? existingMaterial.color.clone() : new THREE.Color(0xffffff),
        transparent: existingMaterial.transparent || false,
        opacity: existingMaterial.opacity !== undefined ? existingMaterial.opacity : 1.0,
        side: existingMaterial.side !== undefined ? existingMaterial.side : THREE.FrontSide,
        alphaTest: existingMaterial.alphaTest || 0,
        depthWrite: existingMaterial.depthWrite !== undefined ? existingMaterial.depthWrite : true,
        depthTest: existingMaterial.depthTest !== undefined ? existingMaterial.depthTest : true
    });
    
    // Copier les textures existantes si présentes
    if (existingMaterial.map) {
        basicMat.map = existingMaterial.map;
    }
    if (existingMaterial.alphaMap) {
        basicMat.alphaMap = existingMaterial.alphaMap;
    }
    if (existingMaterial.aoMap) {
        basicMat.aoMap = existingMaterial.aoMap;
    }
    
    return basicMat;
}

/**
 * Applique le mode d'éclairage (Unlit ou Lit) au matériau avec les textures fournies
 * Met à jour également les paramètres du renderer (tone mapping, exposition) et l'environnement
 * @param {THREE.Material} material - Le matériau Three.js à modifier
 * @param {Object} textures - Objet contenant les textures chargées (albedo, alpha, emission, etc.)
 */
function applyMaterialMode(material, textures) {
    if (unlitMode) {
        // Appliquer les paramètres de rendu Unlit
        renderer.toneMapping = toneMappingUnlit;
        renderer.toneMappingExposure = toneMappingExposureUnlit;
        log(`  ℹ Renderer: toneMapping=${getToneMappingName(toneMappingUnlit)}, exposure=${toneMappingExposureUnlit}`);
        applyUnlitMode(material, textures);
        // Mettre à jour l'environnement Unlit
        applyUnlitEnvironment();
    } else {
        // Appliquer les paramètres de rendu Lit
        renderer.toneMapping = toneMappingLit;
        renderer.toneMappingExposure = toneMappingExposureLit;
        log(`  ℹ Renderer: toneMapping=${getToneMappingName(toneMappingLit)}, exposure=${toneMappingExposureLit}`);
        applyLitMode(material, textures);
        // Mettre à jour l'environnement Lit (asynchrone)
        applyLitEnvironment();
    }
}

/**
 * Retourne le nom lisible du type de tone mapping
 * @param {number} toneMappingType - Le type de tone mapping Three.js
 * @returns {string} - Le nom du tone mapping
 */
function getToneMappingName(toneMappingType) {
    switch(toneMappingType) {
        case THREE.NoToneMapping: return 'NoToneMapping';
        case THREE.LinearToneMapping: return 'LinearToneMapping';
        case THREE.ReinhardToneMapping: return 'ReinhardToneMapping';
        case THREE.CinematicToneMapping: return 'CinematicToneMapping';
        case THREE.ACESFilmicToneMapping: return 'ACESFilmicToneMapping';
        case THREE.CustomToneMapping: return 'CustomToneMapping';
        default: return 'Unknown';
    }
}

/**
 * Mode Unlit - Affiche les textures bakées sans éclairage temps réel
 * Utilise emissiveMap (si MeshStandardMaterial) ou map (si MeshBasicMaterial)
 */
function applyUnlitMode(material, textures) {
    log(`  → Application mode Unlit`);
    
    const isMeshBasic = material.type === 'MeshBasicMaterial';
    
    if (isMeshBasic) {
        // MeshBasicMaterial - Utiliser directement la map (pas besoin d'emissive)
        log(`  ℹ MeshBasicMaterial détecté - utilisation de map directe`);
        
        if (textures.albedo) {
            material.map = textures.albedo;
            // Le colorSpace est déjà défini lors du chargement de la texture
            log(`  ✓ Albedo appliqué sur map (MeshBasicMaterial)`);
        }
    } else {
        // MeshStandardMaterial ou autre - Utiliser emissive
        log(`  ℹ ${material.type} détecté - utilisation d'emissiveMap`);
        
        // Réinitialiser les propriétés d'éclairage PBR
        material.map = null;
        if (material.metalnessMap !== undefined) material.metalnessMap = null;
        if (material.roughnessMap !== undefined) material.roughnessMap = null;
        if (material.normalMap !== undefined) material.normalMap = null;
        if (material.metalness !== undefined) material.metalness = 0;
        if (material.roughness !== undefined) material.roughness = 1;
        
        // Utiliser emissive pour afficher les textures bakées
        if (textures.albedo) {
            material.emissiveMap = textures.albedo;
            material.emissive = new THREE.Color(emissiveColor);
            material.emissiveIntensity = emissiveIntensity;
            // Le colorSpace est déjà défini lors du chargement de la texture
            log(`  ✓ Albedo appliqué en émissif (Unlit) - couleur: 0x${emissiveColor.toString(16)}, intensité: ${emissiveIntensity}`);
        }
    }
    
    // Alpha (transparence) - fonctionne en mode Unlit
    if (textures.alpha) {
        material.alphaMap = textures.alpha;
        material.transparent = true;
        log(`  ✓ Alpha appliqué`);
    }
    
    // Emission supplémentaire (si texture d'émission séparée)
    if (textures.emission) {
        log(`  ℹ Emission ignorée en mode Unlit (albedo utilisé comme émissif)`);
    }
    
    // Occlusion - peut être combiné avec emissive en mode multiply
    if (textures.occlusion) {
        material.aoMap = textures.occlusion;
        material.aoMapIntensity = 1.0;
        log(`  ✓ Occlusion appliqué (multiply avec émissif)`);
    }
    
    // Textures ignorées en mode Unlit
    if (textures.height) {
        log(`  ⊘ Height ignoré en mode Unlit`);
    }
    if (textures.metallic) {
        log(`  ⊘ Metallic ignoré en mode Unlit`);
    }
    if (textures.normalGL) {
        log(`  ⊘ NormalGL ignoré en mode Unlit`);
    }
}

/**
 * Mode Lit - Utilise l'éclairage temps réel avec PBR (Physically Based Rendering)
 * Applique toutes les textures pour un rendu réaliste avec lumières dynamiques
 */
function applyLitMode(material, textures) {
    log(`  → Application mode Lit (PBR)`);
    
    // Réinitialiser l'émissif
    material.emissiveMap = null;
    material.emissive = new THREE.Color(0x000000);
    material.emissiveIntensity = 0;
    
    // Albedo (couleur de base)
    if (textures.albedo) {
        material.map = textures.albedo;
        // Le colorSpace est déjà défini lors du chargement de la texture
        log(`  ✓ Albedo appliqué`);
    }
    
    // Alpha (transparence)
    if (textures.alpha) {
        material.alphaMap = textures.alpha;
        material.transparent = true;
        log(`  ✓ Alpha appliqué`);
    }
    
    // Emission (zones autoluminescentes)
    if (textures.emission) {
        material.emissiveMap = textures.emission;
        material.emissive = new THREE.Color(0xffffff);
        material.emissiveIntensity = 1.0;
        log(`  ✓ Emission appliqué`);
    }
    
    // Height/Displacement (relief géométrique)
    if (textures.height) {
        material.displacementMap = textures.height;
        material.displacementScale = 0.1;
        log(`  ✓ Height/Displacement appliqué`);
    }
    
    // Metallic (métalité)
    if (textures.metallic) {
        material.metalnessMap = textures.metallic;
        material.metalness = 1.0;
        log(`  ✓ Metallic appliqué`);
        // GPU metallic correction removed (injection disabled)
    }
    // Roughness (valeur de rugosité fournie directement)
    if (textures.roughness) {
        material.roughnessMap = textures.roughness;
        material.roughness = 1.0; // la map pilote la roughness
        log(`  ✓ Roughness appliqué`);
    }
    
    // NormalGL (détails de surface)
    if (textures.normalGL) {
        material.normalMap = textures.normalGL;
        material.normalScale = new THREE.Vector2(1, 1);
        log(`  ✓ NormalGL appliqué`);
    }
    
    // Occlusion (ombres ambiantes)
    if (textures.occlusion) {
        material.aoMap = textures.occlusion;
        material.aoMapIntensity = 1.0;
        log(`  ✓ Occlusion appliqué`);
    }
}

/**
 * Configure les UV2 pour les AO maps si nécessaire
 * Les AO maps nécessitent un canal UV2, on copie UV vers UV2 si absent
 */
function setupUV2ForAO(material, textures) {
    if (textures.occlusion && uvSettings.autoGenerateUV2) {
        model.traverse((child) => {
            if (child.isMesh) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                if (mats.includes(material) && !child.geometry.attributes.uv2) {
                    child.geometry.setAttribute('uv2', child.geometry.attributes.uv);
                    log(`  ℹ UV2 copié depuis UV pour Occlusion sur "${child.name}"`);
                }
            }
        });
    }
}

/**
 * Cadre automatique du modèle : positionne la caméra en vue 3/4 légèrement plongeante
 * et calcule la distance pour que le modèle occupe environ `fill` de la hauteur visible.
 * @param {THREE.Object3D} model
 * @param {Object} options
 * @param {number} options.fill - fraction de la hauteur de la vue à remplir (0.0-1.0)
 * @param {number} options.azimuth - angle azimutal autour de Y (radians)
 * @param {number} options.elevation - angle d'élévation au-dessus de l'horizon (radians)
 */
function frameModel(model, options = {}) {
    const {
        fill = initialCameraFill,
        azimuthDeg = initialOrbitDeg, // degrees
        cameraHeight = initialCameraHeight,
        focalLengthMm = initialFocalLengthMm
    } = options;

    if (!model || !camera) return;

    // Si focalLengthMm fourni, appliquer via la méthode Three.js
    try {
        if (typeof camera.setFocalLength === 'function' && focalLengthMm) {
            camera.setFocalLength(focalLengthMm);
            camera.updateProjectionMatrix();
        }
    } catch (e) {
        // ignore si non supporté
    }

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Utiliser la plus grande dimension comme hauteur approximative à cadrer
    const height = Math.max(size.y, size.x, size.z);

    // Convertir FOV vertical en radians après avoir éventuellement appliqué le focal length
    const fov = (camera.fov || 50) * (Math.PI / 180);

    // Distance (ligne de visée) nécessaire pour que l'objet de hauteur `height` occupe `fill` de la hauteur de la vue
    const requiredDistance = (height) / (2 * fill * Math.tan(fov / 2));

    // Si l'utilisateur a forcé une distance de zoom (en unités scène, ex: mètres), l'utiliser
    // `initialZoomDistance` doit être > 0 pour forcer. Sinon on utilise la distance calculée.
    const forcedDistance = (typeof initialZoomDistance === 'number' && initialZoomDistance > 0) ? initialZoomDistance : requiredDistance;

    // Hauteur verticale souhaitée de la caméra par rapport au centre
    const dy = cameraHeight;

    // Calcul de la composante horizontale (plan XZ) à partir de la distance utilisée
    let horizontal = 0;
    if (forcedDistance > Math.abs(dy)) {
        horizontal = Math.sqrt(Math.max(0, forcedDistance * forcedDistance - dy * dy));
    } else {
        horizontal = 0;
    }

    const azimuth = (azimuthDeg || 0) * (Math.PI / 180);

    // Log des options de caméra (utile pour debug) — on logue via la fonction `log` (respecte enableLogging)
    // et via console.info pour garantir visibilité pendant le développement.
    const distanceSource = (forcedDistance === requiredDistance) ? 'auto' : 'forced';
    const cameraOptionsMsg = `camera options -> fill=${fill}, focalMm=${focalLengthMm}, cameraHeight=${cameraHeight}, azimuthDeg=${azimuthDeg}, zoomDist=${forcedDistance} (${distanceSource})`;
    try { log(cameraOptionsMsg); } catch (e) { /* ignore logging errors */ }
    try { console.info('[CAMERA] ' + cameraOptionsMsg); } catch (e) { /* ignore */ }

    const px = center.x + horizontal * Math.sin(azimuth);
    const pz = center.z + horizontal * Math.cos(azimuth);
    const py = center.y + dy;

    camera.position.set(px, py, pz);
    camera.lookAt(center);

    if (controls) {
        controls.target.copy(center);
        controls.update();
    }

    log(`✓ Modèle cadré (fill=${fill}, azimuthDeg=${azimuthDeg}, cameraHeight=${cameraHeight}, focalMm=${focalLengthMm})`);
}

// Fonction pour générer les boutons de couleur dynamiquement
// Helper: apply label options when the target container exists (retries a few times)
function applyLabelOptionsWhenReady(containerId, options = {}, maxTries = 20, intervalMs = 200) {
    let tries = 0;
    const tryApply = () => {
        const container = document.getElementById(containerId);
        if (container) {
            try {
                setCircularLabelOptions(Object.assign({ containerId }, options));
            } catch (e) {
                // ignore
            }
            return;
        }
        tries++;
        if (tries < maxTries) setTimeout(tryApply, intervalMs);
    };
    tryApply();
}

// Utility: Adjust circular label options for env toggle at runtime
function setEnvToggleLabelOptions(options = {}) {
    const {
        containerId = 'env-dropdown',
        fontSize = (typeof options.fontSize !== 'undefined' ? options.fontSize : undefined),
        radius = (typeof options.radius !== 'undefined' ? options.radius : undefined),
        startOffset = (typeof options.startOffset !== 'undefined' ? options.startOffset : undefined),
        color = (typeof options.color !== 'undefined' ? options.color : undefined),
        textAnchor = (typeof options.textAnchor !== 'undefined' ? options.textAnchor : undefined),
        startAt = (typeof options.startAt !== 'undefined' ? options.startAt : undefined),
        direction = (typeof options.direction !== 'undefined' ? options.direction : undefined),
        rotationDeg = (typeof options.rotationDeg !== 'undefined' ? options.rotationDeg : undefined),
        showCodeLabel = (typeof options.showCodeLabel !== 'undefined' ? options.showCodeLabel : undefined),
        codeLabelFormat = (typeof options.codeLabelFormat !== 'undefined' ? options.codeLabelFormat : undefined)
    } = options;

    try {
        const container = document.getElementById(containerId);
        if (!container) return;
        const svg = container.querySelector('.env-toggle-svg, .circular-label-svg');
        if (!svg) return;
        const path = svg.querySelector('path');
        const text = svg.querySelector('text');
        const textPath = svg.querySelector('textPath');

        // Resolve options with precedence: explicit option -> part-specific defaults -> env defaults (master)
        const globalDefaults = CIRCULAR_LABEL_DEFAULTS_ENV || {};
        const partDefaults = (containerId === 'env-dropdown') ? CIRCULAR_LABEL_DEFAULTS_ENV : CIRCULAR_LABEL_DEFAULTS_COLOR || {};

        const useFontSize = (typeof fontSize !== 'undefined') ? fontSize : (typeof partDefaults.fontSize !== 'undefined' ? partDefaults.fontSize : globalDefaults.fontSize);
        const useRadius = (typeof radius !== 'undefined') ? radius : (typeof partDefaults.radius !== 'undefined' ? partDefaults.radius : globalDefaults.radius);
        const useStartOffset = (typeof startOffset !== 'undefined') ? startOffset : (typeof partDefaults.startOffset !== 'undefined' ? partDefaults.startOffset : globalDefaults.startOffset);
        const useColor = (typeof color !== 'undefined') ? color : (typeof partDefaults.color !== 'undefined' ? partDefaults.color : globalDefaults.color);
        const useTextAnchor = (typeof textAnchor !== 'undefined') ? textAnchor : (typeof partDefaults.textAnchor !== 'undefined' ? partDefaults.textAnchor : globalDefaults.textAnchor);
        const useStartAt = (typeof startAt !== 'undefined') ? startAt : (typeof partDefaults.startAt !== 'undefined' ? partDefaults.startAt : globalDefaults.startAt);
        const useDirection = (typeof direction !== 'undefined') ? direction : (typeof partDefaults.direction !== 'undefined' ? partDefaults.direction : globalDefaults.direction);
        const useRotationDeg = (typeof rotationDeg !== 'undefined') ? Number(rotationDeg) : (typeof partDefaults.rotationDeg !== 'undefined' ? Number(partDefaults.rotationDeg) : (typeof globalDefaults.rotationDeg !== 'undefined' ? Number(globalDefaults.rotationDeg) : 0));
        const useShowCodeLabel = (typeof showCodeLabel !== 'undefined') ? !!showCodeLabel : (typeof partDefaults.showCodeLabel !== 'undefined' ? !!partDefaults.showCodeLabel : !!globalDefaults.showCodeLabel);
        const useCodeLabelFormat = (typeof codeLabelFormat !== 'undefined') ? String(codeLabelFormat) : (partDefaults.codeLabelFormat || globalDefaults.codeLabelFormat || '${code}');

        // update radius (path 'd') if present
        if (path && typeof useRadius === 'number') {
            const startOffsetY = (String(useStartAt).toLowerCase() === 'bottom') ? `${useRadius}` : `-${useRadius}`;
            // Respect global inversion toggle if set by developer
            let effectiveDirection = String(useDirection).toLowerCase();
            try {
                if (window && window._invertCircularText) {
                    effectiveDirection = (effectiveDirection === 'ccw') ? 'cw' : 'ccw';
                }
            } catch (e) { /* ignore if window not available */ }

            // Compute sweepFlag optionally (toggleable)
            const sweepFlag = (typeof window !== 'undefined' && window._enableSweepFlag === false)
                ? 1
                : ((effectiveDirection === 'ccw') ? 0 : 1);

            path.setAttribute('d', `M50,50 m0,${startOffsetY} a${useRadius},${useRadius} 0 1,${sweepFlag} -0.01,0`);
        }

        if (text) {
            try {
                const px = `${Number(useFontSize)}px`;
                text.setAttribute('style', `font-size: ${px}; fill: ${useColor}; text-anchor: ${useTextAnchor};`);
                if (textPath) textPath.setAttribute('style', `font-size: ${px}; fill: ${useColor}; text-anchor: ${useTextAnchor};`);
                text.setAttribute('font-size', String(useFontSize));
                text.setAttribute('fill', useColor);
                text.setAttribute('text-anchor', String(useTextAnchor));
                if (textPath) {
                    textPath.setAttribute('font-size', String(useFontSize));
                    textPath.setAttribute('fill', useColor);
                    textPath.setAttribute('text-anchor', String(useTextAnchor));
                    try {
                        // best-effort: set non-standard 'side' attribute based on effective direction
                        let effectiveDirForSide = String(useDirection).toLowerCase();
                        if (window && window._invertCircularText) effectiveDirForSide = (effectiveDirForSide === 'ccw') ? 'cw' : 'ccw';
                        textPath.setAttribute('side', effectiveDirForSide === 'ccw' ? 'right' : 'left');
                    } catch (e) { /* ignore */ }
                }
            } catch (e) {
                if (textPath) {
                    textPath.setAttribute('font-size', String(useFontSize));
                    textPath.setAttribute('fill', useColor);
                    textPath.setAttribute('text-anchor', String(useTextAnchor));
                }
            }
        }

        if (text) {
            try {
                // base rotation from `startAt: 'bottom'` behavior (kept for backward-compat)
                let baseRot = 0;
                if (String(useStartAt).toLowerCase() === 'bottom') {
                    if (typeof window === 'undefined' || window._enableBottomRotation !== false) {
                        baseRot = 180;
                    }
                }

                const totalRot = (Number(baseRot) || 0) + (Number(useRotationDeg) || 0);
                if (totalRot !== 0) {
                    text.setAttribute('transform', `rotate(${totalRot} 50 50)`);
                } else {
                    text.removeAttribute('transform');
                }
            } catch (e) { /* ignore */ }
        }

        if (textPath) {
            textPath.setAttribute('startOffset', String(useStartOffset));
        }

        // Update per-item code labels for color dropdowns
        try {
            if (container && container.classList && container.classList.contains('color-dropdown')) {
                const items = container.querySelectorAll('.color-swatch-btn');
                items.forEach((item) => {
                    let lbl = item.querySelector('.swatch-code-label');
                    if (!lbl) {
                        lbl = document.createElement('div');
                        lbl.className = 'swatch-code-label';
                        lbl.style.fontSize = '10px';
                        lbl.style.marginTop = '4px';
                        lbl.style.textAlign = 'center';
                        item.appendChild(lbl);
                    }
                    const code = item.title || item.dataset.code || '';
                    const idx = item.dataset.index || '';
                    let formatted = String(useCodeLabelFormat).replace('${code}', code).replace('${index}', String(Number(idx) + 1));
                    lbl.textContent = formatted;
                    lbl.style.display = useShowCodeLabel ? '' : 'none';
                });
            }

            // Environment thumbnail captions intentionally not modified here
        } catch (e) { /* ignore per-item label updates */ }
    } catch (e) {
        // ignore errors
    }
}

// Alias / generic helper: allow controlling any circular label (env or color toggles)
function setCircularLabelOptions(options = {}) {
    return setEnvToggleLabelOptions(options);
}

// Expose the helper globally for runtime calls
window.setCircularLabelOptions = setCircularLabelOptions;
window.setEnvToggleLabelOptions = setEnvToggleLabelOptions;
function generateColorButtons() {
    const colorButtonsDiv = document.getElementById('color-buttons');
    colorButtonsDiv.innerHTML = '';

    productParts.forEach(part => {
        const codes = materialCodesPerPart[part] || [];
        const container = document.createElement('div');
        container.className = 'color-dropdown';
        container.id = `${part.toLowerCase()}-color-dropdown`;

        // Toggle (shows current selection swatch only)
        const toggle = document.createElement('button');
        toggle.className = 'color-dropdown-toggle';
        toggle.type = 'button';
        toggle.title = part;
        const toggleSw = document.createElement('div');
        toggleSw.className = 'swatch';
        toggle.appendChild(toggleSw);

        // Create a circular SVG label around the toggle (same system as env selector)
        try {
            const SVG_NS = 'http://www.w3.org/2000/svg';
            const uniqueId = `circ-path-${Math.random().toString(36).slice(2,9)}`;
            const svg = document.createElementNS(SVG_NS, 'svg');
            svg.setAttribute('viewBox', '0 0 100 100');
            svg.setAttribute('class', 'circular-label-svg');
            svg.setAttribute('aria-hidden', 'true');

            const defs = document.createElementNS(SVG_NS, 'defs');
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('id', uniqueId);
            // default radius 36
            path.setAttribute('d', 'M50,50 m0,-36 a36,36 0 1,1 -0.01,0');
            defs.appendChild(path);
            svg.appendChild(defs);

            const text = document.createElementNS(SVG_NS, 'text');
            const textPath = document.createElementNS(SVG_NS, 'textPath');
            textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${uniqueId}`);
            textPath.setAttribute('startOffset', '50%');
            textPath.setAttribute('text-anchor', 'middle');
            textPath.textContent = part;
            text.appendChild(textPath);
            svg.appendChild(text);

            toggle.appendChild(svg);
            // store reference on the container for later updates if needed
            container.dataset.circLabelId = uniqueId;
            container._circTextPath = textPath;
        } catch (e) {
            // ignore SVG creation errors
        }
        container.appendChild(toggle);

        // Menu
        const menu = document.createElement('div');
        menu.className = 'color-dropdown-menu';

        // Create swatch items
        if (codes.length === 0) {
            const none = document.createElement('div');
            none.textContent = 'Aucune option';
            none.style.fontSize = '10px';
            none.style.color = '#333';
            menu.appendChild(none);
        } else {
            codes.forEach((code, idx) => {
                const item = document.createElement('button');
                item.className = 'color-swatch-btn';
                item.type = 'button';
                item.dataset.index = idx;
                item.title = code;

                const s = document.createElement('div');
                s.className = 'swatch';

                // placeholder green with index if no thumb will be applied later
                s.style.background = '#9ae69a';
                s.textContent = String(idx + 1);
                s.style.fontSize = '10px';
                s.style.color = '#000';
                s.style.display = 'flex';
                s.style.alignItems = 'center';
                s.style.justifyContent = 'center';

                item.appendChild(s);

                // optional code label under the swatch (visible if enabled in defaults)
                try {
                    const showCode = !!(CIRCULAR_LABEL_DEFAULTS_COLOR && CIRCULAR_LABEL_DEFAULTS_COLOR.showCodeLabel);
                    const fmt = (CIRCULAR_LABEL_DEFAULTS_COLOR && CIRCULAR_LABEL_DEFAULTS_COLOR.codeLabelFormat) || '${code}';
                    const lbl = document.createElement('div');
                    lbl.className = 'swatch-code-label';
                    lbl.style.fontSize = '10px';
                    lbl.style.marginTop = '4px';
                    lbl.style.textAlign = 'center';
                    lbl.textContent = String(fmt).replace('${code}', code).replace('${index}', String(idx + 1));
                    lbl.style.display = showCode ? '' : 'none';
                    item.appendChild(lbl);
                } catch (e) {
                    // ignore label creation errors
                }

                // Charger la vignette côté serveur pour cet item (si disponible)
                (async () => {
                    try {
                        const folderPath = `Textures/${modelName}/${part}/`;
                        const sw = await findSwatchForMaterial(folderPath, code);
                        if (sw) {
                            s.style.backgroundImage = `url('${sw}')`;
                            s.style.backgroundColor = 'transparent';
                            s.textContent = '';
                        }
                    } catch (e) {
                        // ignore individual item errors
                    }
                })();

                item.addEventListener('click', () => {
                    currentColorIndex[part] = idx;
                    const materialCode = materialCodesPerPart[part][currentColorIndex[part]];
                    log(`Changement ${part}: ${materialCode}`);
                    loadTextures(part, currentColorIndex[part]);
                    // close
                    container.classList.remove('open');
                    // update toggle swatch immediately if server swatch exists
                    updateToggleSwatch(part, idx);
                });

                menu.appendChild(item);
            });
        }

        container.appendChild(menu);

        // toggle behavior
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            // close other dropdowns
            document.querySelectorAll('.color-dropdown.open').forEach(el => {
                if (el !== container) el.classList.remove('open');
            });
            container.classList.toggle('open');
        });

        // close when clicking outside
        document.addEventListener('click', (ev) => {
            if (!container.contains(ev.target)) container.classList.remove('open');
        });

        colorButtonsDiv.appendChild(container);

            // Apply circular label defaults for this dropdown when ready
            try { applyLabelOptionsWhenReady(container.id, CIRCULAR_LABEL_DEFAULTS_COLOR); } catch (e) { /* ignore */ }

        // initialise toggle swatch (try server swatch or fallback)
            (async () => {
                if (codes.length > 0) {
                    const idx = currentColorIndex[part] || 0;
                    const basePath = `Textures/${modelName}/${part}/`;
                    const rawMaterialCode = codes[idx];
                    const materialCode = normalizeMaterialCode(rawMaterialCode);
                    const swatch = await findSwatchForMaterial(basePath, materialCode);
                if (swatch) {
                    toggleSw.style.backgroundImage = `url('${swatch}')`;
                    toggleSw.style.backgroundColor = 'transparent';
                    toggleSw.textContent = '';
                } else {
                    // will be updated when textures load
                    toggleSw.style.background = '#9ae69a';
                    toggleSw.textContent = String(idx + 1);
                }
            }
        })();

        log(`✓ Dropdown créé pour ${part} avec ${codes.length} options`);
    });
}

// Update the toggle swatch for a part/index (called after selection or when swatch becomes available)
async function updateToggleSwatch(part, idx) {
    try {
        const container = document.getElementById(`${part.toLowerCase()}-color-dropdown`);
        if (!container) return;
        const toggleSw = container.querySelector('.color-dropdown-toggle .swatch');
        const basePath = `Textures/${modelName}/${part}/`;
        const rawMaterialCode = materialCodesPerPart[part][idx];
        const materialCode = normalizeMaterialCode(rawMaterialCode);
        const swatch = await findSwatchForMaterial(basePath, materialCode);
        if (swatch) {
            toggleSw.style.backgroundImage = `url('${swatch}')`;
            toggleSw.style.backgroundColor = 'transparent';
            toggleSw.textContent = '';
        } else {
            // try to use existing loaded textures preview
            const currentTextures = window._lastLoadedTextures || {};
            updateColorButtonSwatch(part, currentTextures);
        }
    } catch (e) { /* ignore */ }
}

// Met à jour la swatch du bouton couleur pour une partie donnée avec la texture albedo si disponible
function updateColorButtonSwatch(part, textures) {
    try {
        // Trouver le container dropdown et la swatch du toggle
        const container = document.getElementById(`${part.toLowerCase()}-color-dropdown`);
        if (!container) return;
        const sw = container.querySelector('.color-dropdown-toggle .swatch');
        if (!sw) return;

        // chercher une source pour la texture albedo
        let src = null;
        if (textures && textures.albedo && textures.albedo.image) {
            const imgObj = textures.albedo.image;
            if (imgObj.src) src = imgObj.src;
            else if (imgObj instanceof HTMLCanvasElement) src = imgObj.toDataURL();
        }

        if (src) {
            sw.style.backgroundImage = `url('${src}')`;
            sw.style.background = 'transparent';
            sw.textContent = '';
        } else {
            // fallback: afficher le numéro sélectionné (1-based) si aucun swatch/image
            const idx = currentColorIndex[part] || 0;
            sw.style.backgroundImage = '';
            sw.style.background = '#ddd';
            sw.textContent = String(idx + 1);
            sw.style.display = 'flex';
            sw.style.alignItems = 'center';
            sw.style.justifyContent = 'center';
            sw.style.fontSize = '10px';
            sw.style.color = '#000';
        }
    } catch (e) {
        // ignore
    }
}



// Fonction pour générer le sélecteur d'environment maps
function generateEnvironmentSelector() {
    const selector = document.getElementById('environment-selector');
    if (!selector) {
        log('✗ Élément environment-selector introuvable dans le DOM', 'error');
        return;
    }

    // Replace the native select with a visual dropdown of thumbnails
    const parent = selector.parentElement || selector.parentNode;
    // remove existing select element
    selector.style.display = 'none';

    // create env dropdown container
    let container = document.getElementById('env-dropdown');
    if (!container) {
        container = document.createElement('div');
        container.id = 'env-dropdown';
        container.className = 'env-dropdown';
        parent.insertBefore(container, selector.nextSibling);
    }

    container.innerHTML = '';

    const toggle = document.createElement('button');
    toggle.className = 'env-dropdown-toggle';
    toggle.type = 'button';
    // thumbnail image inside the round toggle
    const thumbImg = document.createElement('img');
    thumbImg.alt = 'env-thumb';
    toggle.appendChild(thumbImg);

    // SVG text around the button (circular path)
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const uniqueId = `env-path-${Math.random().toString(36).slice(2,9)}`;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'env-toggle-svg');
    svg.setAttribute('aria-hidden', 'true');

    const defs = document.createElementNS(SVG_NS, 'defs');
    const path = document.createElementNS(SVG_NS, 'path');
    // circle path centered at 50,50 with radius 36 (adjust to sit around the thumb)
    path.setAttribute('id', uniqueId);
    path.setAttribute('d', 'M50,50 m0,-36 a36,36 0 1,1 -0.01,0');
    defs.appendChild(path);
    svg.appendChild(defs);

    const text = document.createElementNS(SVG_NS, 'text');
    const textPath = document.createElementNS(SVG_NS, 'textPath');
    // Use href for modern browsers
    textPath.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `#${uniqueId}`);
    textPath.setAttribute('startOffset', '50%');
    textPath.setAttribute('text-anchor', 'middle');
    textPath.textContent = 'Aucun';
    text.appendChild(textPath);
    svg.appendChild(text);

    // keep references on container for later updates
    container.dataset.envTextPathId = uniqueId;
    container._envTextPath = textPath;

    toggle.appendChild(svg);
    container.appendChild(toggle);

    const menu = document.createElement('div');
    menu.className = 'env-dropdown-menu';

    // add a 'none' item
    const noneItem = document.createElement('div');
    noneItem.className = 'env-item';
    noneItem.innerHTML = `<div class="env-label">Aucun</div>`;
    noneItem.addEventListener('click', async () => {
        await changeEnvironment({ type: 'color', color: backgroundColorUnlit, intensity: ambientLightIntensityUnlit });
        container.classList.remove('open');
        thumbImg.style.display = 'none';
        // update circular label
        if (container && container._envTextPath) container._envTextPath.textContent = 'Aucun';
    });
    menu.appendChild(noneItem);

    // add env map items
        availableEnvironmentMaps.forEach((envMap) => {
        const item = document.createElement('div');
        item.className = 'env-item';

        const img = document.createElement('img');
        // prefer thumb if available
        if (envMap.thumb) img.src = envMap.thumb; else img.src = envMap.path;
        item.appendChild(img);

        const tlabel = document.createElement('div');
        tlabel.className = 'env-label';
        tlabel.textContent = envMap.displayName;
        item.appendChild(tlabel);

            // Caption handled centrally by setEnvToggleLabelOptions to avoid duplicates

        item.addEventListener('click', async () => {
            log(`Changement d'environment map: ${envMap.path}`);
            await changeEnvironment({ type: 'envmap', envMapPath: envMap.path, intensity: envMapIntensity, rotation: envMapRotation });
            // update toggle thumb and circular label
            thumbImg.src = envMap.thumb || envMap.path;
            thumbImg.style.display = '';
            if (container && container._envTextPath) container._envTextPath.textContent = envMap.displayName || envMap.name || envMap.path.split('/').pop();
            container.classList.remove('open');
        });

        menu.appendChild(item);
    });

    container.appendChild(menu);

    // toggle behavior
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.env-dropdown.open').forEach(el => { if (el !== container) el.classList.remove('open'); });
        container.classList.toggle('open');
    });

    document.addEventListener('click', (ev) => { if (!container.contains(ev.target)) container.classList.remove('open'); });

    log(`✓ Sélecteur d'environment créé avec ${availableEnvironmentMaps.length} option(s)`);

    // Apply circular label defaults for environment toggle when ready
    try { applyLabelOptionsWhenReady('env-dropdown', CIRCULAR_LABEL_DEFAULTS_ENV); } catch (e) { /* ignore */ }
}

// (duplicate helper removed — implementation kept earlier near UI generation)

// -----------------------------------------------------------------------------
// Panneau dynamique des previews de textures
// -----------------------------------------------------------------------------
function createTexturePreviewPanel() {
    if (!showTexturePreviewPanel) return null;
    if (document.getElementById(texturePreviewContainerId)) return document.getElementById(texturePreviewContainerId);

    const panel = document.createElement('div');
    panel.id = texturePreviewContainerId;
    panel.style.position = 'fixed';
    panel.style.right = '10px';
    panel.style.top = '80px';
    panel.style.width = `${texturePreviewSize + 24}px`;
    panel.style.maxHeight = '70vh';
    panel.style.overflowY = 'auto';
    panel.style.background = 'rgba(0,0,0,0.6)';
    panel.style.padding = '8px';
    panel.style.borderRadius = '6px';
    panel.style.zIndex = '9999';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.alignItems = 'center';
    panel.style.gap = '8px';
    panel.style.color = '#fff';

    const title = document.createElement('div');
    title.textContent = 'Previews textures';
    title.style.fontSize = '12px';
    title.style.marginBottom = '6px';
    panel.appendChild(title);

    document.body.appendChild(panel);
    return panel;
}

function clearTexturePreviewPanel() {
    const panel = document.getElementById(texturePreviewContainerId);
    if (panel) panel.parentElement.removeChild(panel);
}

function setTexturePreviewEnabled(enabled) {
    showTexturePreviewPanel = !!enabled;
    if (!showTexturePreviewPanel) {
        clearTexturePreviewPanel();
    } else {
        createTexturePreviewPanel();
    }

    // Mettre à jour la présence du bouton toggle selon l'option
    try {
        const id = 'texture-preview-toggle';
        const existing = document.getElementById(id);
        if (showTexturePreviewPanel) {
            if (!existing) createTexturePreviewToggle();
        } else {
            if (existing && existing.parentElement) existing.parentElement.removeChild(existing);
        }
    } catch (e) {
        // ignore
    }
}

function updateTexturePreviewPanel(textures) {
    if (!showTexturePreviewPanel) return;
    const panel = createTexturePreviewPanel();
    if (!panel) return;
    // supprimer les vignettes précédentes (laisser le titre)
    while (panel.children.length > 1) panel.removeChild(panel.lastChild);

    const entries = Object.keys(textures || {});
    if (entries.length === 0) {
        const none = document.createElement('div');
        none.textContent = 'Aucune texture chargée';
        none.style.fontSize = '12px';
        panel.appendChild(none);
        return;
    }

    entries.forEach((channel) => {
        const tex = textures[channel];
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.alignItems = 'center';

        const img = document.createElement('img');
        img.width = texturePreviewSize;
        img.height = texturePreviewSize;
        img.style.objectFit = 'cover';
        img.style.background = '#333';
        img.style.border = '1px solid rgba(255,255,255,0.08)';
        img.style.borderRadius = '4px';

        // Déterminer la source à partir de la texture Three.js
        let src = null;
        try {
            if (tex && tex.image) {
                const imgObj = tex.image;
                if (imgObj.src) {
                    src = imgObj.src;
                } else if (imgObj instanceof HTMLCanvasElement) {
                    src = imgObj.toDataURL();
                } else if (typeof ImageBitmap !== 'undefined' && imgObj instanceof ImageBitmap) {
                    const c = document.createElement('canvas');
                    c.width = imgObj.width || texturePreviewSize;
                    c.height = imgObj.height || texturePreviewSize;
                    c.getContext('2d').drawImage(imgObj, 0, 0);
                    src = c.toDataURL();
                } else if (imgObj.data) {
                    // Tentative pour DataTexture
                    const w = imgObj.width || texturePreviewSize;
                    const h = imgObj.height || texturePreviewSize;
                    const c = document.createElement('canvas');
                    c.width = w;
                    c.height = h;
                    const ctx = c.getContext('2d');
                    try {
                        const imageData = ctx.createImageData(w, h);
                        imageData.data.set(imgObj.data);
                        ctx.putImageData(imageData, 0, 0);
                        src = c.toDataURL();
                    } catch (e) {
                        src = null;
                    }
                }
            }
        } catch (e) {
            src = null;
        }

        if (!src) {
            // placeholder simple
            const placeholder = document.createElement('canvas');
            placeholder.width = texturePreviewSize;
            placeholder.height = texturePreviewSize;
            const pctx = placeholder.getContext('2d');
            pctx.fillStyle = '#444';
            pctx.fillRect(0, 0, placeholder.width, placeholder.height);
            pctx.fillStyle = '#888';
            pctx.font = '12px sans-serif';
            pctx.textAlign = 'center';
            pctx.textBaseline = 'middle';
            pctx.fillText(channel, placeholder.width / 2, placeholder.height / 2);
            src = placeholder.toDataURL();
        }

        img.src = src;

        const label = document.createElement('div');
        label.textContent = channel;
        label.style.fontSize = '11px';
        label.style.marginTop = '6px';

        item.appendChild(img);
        item.appendChild(label);
        panel.appendChild(item);
    });
}

// Créer un petit bouton toggle pour afficher/masquer le panneau
function createTexturePreviewToggle() {
    const id = 'texture-preview-toggle';
    if (document.getElementById(id)) return;
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = 'Textures';
    btn.style.position = 'fixed';
    btn.style.right = '10px';
    btn.style.top = '40px';
    btn.style.zIndex = '10000';
    btn.style.padding = '6px 8px';
    btn.style.borderRadius = '4px';
    btn.style.border = 'none';
    btn.style.background = '#222';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', () => {
        setTexturePreviewEnabled(!showTexturePreviewPanel);
        if (showTexturePreviewPanel) updateTexturePreviewPanel(window._lastLoadedTextures || {});
    });
    document.body.appendChild(btn);
}

// Initialisation du toggle (créé seulement si l'option est activée)
if (showTexturePreviewPanel) {
    createTexturePreviewToggle();
}

// -----------------------------------------------------------------------------
// Left text panel (custom text display, toggleable)
// -----------------------------------------------------------------------------
function createLeftTextPanel() {
    if (document.getElementById('left-text-panel')) return document.getElementById('left-text-panel');
    const panel = document.createElement('div');
    panel.id = 'left-text-panel';

    // Close button (styled like other UI buttons)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'panel-close';
    closeBtn.title = 'Fermer';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => setLeftTextPanelEnabled(false));
    panel.appendChild(closeBtn);

    const content = document.createElement('div');
    content.id = 'left-text-panel-content';
    panel.appendChild(content);

    document.body.appendChild(panel);
    return panel;
}

function clearLeftTextPanel() {
    const panel = document.getElementById('left-text-panel');
    if (panel && panel.parentElement) panel.parentElement.removeChild(panel);
}

function setLeftTextPanelEnabled(enabled) {
    const panel = createLeftTextPanel();
    panel.style.display = enabled ? 'block' : 'none';
}

/**
 * Charge et affiche un fichier texte depuis une URL dans le panneau gauche.
 * Si aucune URL fournie, tente de charger `left-panel.txt` à la racine.
 */
async function loadLeftTextFromUrl(url = 'left-panel.txt') {
    try {
        const panel = createLeftTextPanel();
        const contentDiv = document.getElementById('left-text-panel-content');
        contentDiv.textContent = 'Chargement...';
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const txt = await resp.text();

        // Si marked + DOMPurify sont disponibles, transformer Markdown -> HTML -> sanitize
        try {
            if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                const rawHtml = marked.parse(txt);
                const safe = DOMPurify.sanitize(rawHtml);
                contentDiv.innerHTML = safe;
            } else {
                // Fallback: afficher en texte brut préformaté
                contentDiv.innerHTML = '';
                const pre = document.createElement('pre');
                pre.textContent = txt;
                contentDiv.appendChild(pre);
            }
        } catch (renderErr) {
            // En cas d'erreur pendant le rendu, retomber sur texte brut
            contentDiv.innerHTML = '';
            const pre = document.createElement('pre');
            pre.textContent = txt;
            contentDiv.appendChild(pre);
        }

        setLeftTextPanelEnabled(true);
        log(`✓ Texte chargé depuis ${url}`);
    } catch (e) {
        const contentDiv = document.getElementById('left-text-panel-content');
        if (contentDiv) contentDiv.textContent = 'Impossible de charger le fichier texte: ' + e.message;
        setLeftTextPanelEnabled(true);
        log(`✗ Erreur chargement texte: ${e.message}`, 'warning');
    }
}

function createLeftTextToggle() {
    if (document.getElementById('text-panel-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'text-panel-toggle';
    btn.textContent = 'i';
    btn.title = 'Afficher / cacher informations';
    btn.addEventListener('click', () => {
        const panel = document.getElementById('left-text-panel');
        const isVisible = panel && panel.style.display !== 'none';
        if (isVisible) {
            setLeftTextPanelEnabled(false);
        } else {
            // Si le panel est vide, tenter de charger un fichier par défaut
            const contentDiv = document.getElementById('left-text-panel-content');
            if (!contentDiv || contentDiv.innerHTML.trim() === '') {
                loadLeftTextFromUrl();
            } else {
                setLeftTextPanelEnabled(true);
            }
        }
    });
    document.body.appendChild(btn);
}

// Créer le toggle pour le panneau de texte (toujours disponible)
createLeftTextToggle();

// Exposer la fonction globalement pour usage manuel
window.loadLeftTextFromUrl = loadLeftTextFromUrl;
window.setLeftTextPanelEnabled = setLeftTextPanelEnabled;

// (no browser forcing UI present)

// Metallic GPU correction UI removed

// Boutons UI
document.getElementById('fullscreen-btn').addEventListener('click', () => {
    document.getElementById('viewer').requestFullscreen();
});

document.getElementById('play-btn').addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
});

// Redimensionnement
window.addEventListener('resize', () => {
    // Use viewer element size for responsive frame
    const vw = viewerElement.clientWidth || window.innerWidth;
    const vh = viewerElement.clientHeight || window.innerHeight;
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    renderer.setSize(vw, vh);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();