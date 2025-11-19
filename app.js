import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';

// Variables de réglage exposées
let cameraFov = 75;
let cameraNear = 0.1;
let cameraFar = 1000;
let lightIntensity = 1;
let ambientLightIntensity = 0.5;
let autoRotateSpeed = 0.5;
let backgroundColor = 0xffffff;

// Configuration des canaux de textures à charger (true = actif, false = désactivé)
// flipY: true = retourner verticalement (défaut), false = garder orientation originale
let textureChannels = {
    albedo: { enabled: true, extensions: ['jpg', 'png'], flipY: false },
    alpha: { enabled: false, extensions: ['jpg', 'png'], flipY: false },
    emission: { enabled: false, extensions: ['jpg', 'png'], flipY: false },
    height: { enabled: false, extensions: ['jpg', 'png'], flipY: false },
    metallic: { enabled: false, extensions: ['jpg', 'png'], flipY: false },
    normalGL: { enabled: false, extensions: ['png', 'jpg'], flipY: false },
    occlusion: { enabled: false, extensions: ['jpg', 'png'], flipY: false }
};

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
let unlitMode = true;  // true = Mode Unlit (pas d'éclairage temps réel, textures bakées), false = Mode lit (éclairage dynamique)
let emissiveColor = 0xffffff;  // Couleur émissive en mode Unlit (0xffffff = blanc, affichage fidèle)
let emissiveIntensity = 1.0;  // Intensité émissive en mode Unlit (1.0 = 100%, 0.5 = 50%, etc.)
let forceBasicMaterial = true;  // true = Remplacer les matériaux GLB par MeshBasicMaterial (optimal pour Unlit), false = Utiliser les matériaux existants

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

// Fonction de logging
function log(message, type = 'info') {
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

log('Initialisation de la visionneuse 3D...');

// Variables pour le produit
let modelName = 'fauteuil'; // Nom du modèle, sans extension
let modelExtension = null; // Extension détectée automatiquement (glb ou gltf)
let productParts = ['Pied', 'Assise', "Autre"]; // Tableau des parties configurables du produit
// Codes de matériaux disponibles par partie (détectés automatiquement)
let materialCodesPerPart = {};
let currentColorIndex = {}; // Index dans le tableau de codes

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

// Initialisation Three.js
const scene = new THREE.Scene();
scene.background = new THREE.Color(backgroundColor);

const camera = new THREE.PerspectiveCamera(cameraFov, window.innerWidth / window.innerHeight, cameraNear, cameraFar);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('threejs-canvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Configuration du tone mapping et color space
renderer.toneMapping = unlitMode ? toneMappingUnlit : toneMappingLit;
renderer.toneMappingExposure = unlitMode ? toneMappingExposureUnlit : toneMappingExposureLit;
renderer.outputColorSpace = outputColorSpace;
log(`Renderer configuré: toneMapping=${getToneMappingName(renderer.toneMapping)}, exposure=${renderer.toneMappingExposure}, outputColorSpace=${outputColorSpace}`);

// Initialiser l'environnement
initializeEnvironment();

// Lumières
const ambientLight = new THREE.AmbientLight(0xffffff, ambientLightIntensity);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);

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

// Détecter l'extension, scanner les textures, puis charger le modèle
detectModelExtension().then(() => scanMaterialCodes()).then(() => {
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

    // Charger les textures initiales pour chaque partie
    productParts.forEach(part => {
        const materialCode = materialCodesPerPart[part][currentColorIndex[part]];
        log(`Chargement des textures pour: ${part} (matériau ${materialCode})`);
        loadTextures(part, currentColorIndex[part]);
    });

    // Centrer la caméra sur le modèle
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    controls.target.copy(center);
    camera.lookAt(center);
    log('Caméra centrée sur le modèle');
    log('Chargement terminé avec succès');
    
    // Générer les boutons de couleur dynamiquement (après le chargement)
    generateColorButtons();
}, undefined, (error) => {
    log(`Erreur chargement ${modelExtension.toUpperCase()}: ${error.message}`, 'error');
    console.error(`Erreur chargement ${modelExtension.toUpperCase()}:`, error);
});
});

// Fonction pour charger les textures
function loadTextures(part, colorIndex) {
    const textureLoader = new THREE.TextureLoader();
    const materialCode = materialCodesPerPart[part][colorIndex];
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
                
                const texture = textureLoader.load(
                    path,
                    // onLoad
                    (loadedTexture) => {
                        loadedTexture.flipY = flipY;
                        // Appliquer le colorSpace approprié selon le type de texture
                        if (name.toLowerCase().includes('albedo') || name.toLowerCase().includes('emission')) {
                            loadedTexture.colorSpace = textureColorSpace;
                        } else {
                            // Textures de données (normal, metallic, roughness, ao, height) en linéaire
                            loadedTexture.colorSpace = THREE.LinearSRGBColorSpace;
                        }
                        log(`✓ Texture chargée: Color_${materialCode}_${name}.${ext} (flipY: ${flipY}, colorSpace: ${loadedTexture.colorSpace})`);
                        resolve(loadedTexture);
                    },
                    // onProgress
                    undefined,
                    // onError
                    () => {
                        attemptIndex++;
                        tryLoad();
                    }
                );
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
            log(`  → Chargement ${channel} activé (flipY: ${config.flipY})`);
        } else {
            log(`  ⊘ Chargement ${channel} désactivé`, 'info');
        }
    });
    
    Promise.all(texturePromises).then((loadedTextures) => {
        // Créer un objet avec les textures chargées
        const textures = {};
        enabledChannels.forEach((channel, index) => {
            textures[channel] = loadedTextures[index];
        });

        // Assigner aux matériaux
        const material = materials[part];
        if (material) {
            log(`Application des textures sur matériau: ${part} (mode: ${unlitMode ? 'Unlit' : 'Lit'})`);
            
            // Appliquer le mode Unlit ou Lit
            applyMaterialMode(material, textures);
            
            // Vérifier et générer les UVs si nécessaire
            if (uvSettings.autoGenerateUV) {
                let hasUVs = false;
                model.traverse((child) => {
                    if (child.isMesh) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        if (mats.includes(material)) {
                            hasUVs = child.geometry.attributes.uv !== undefined;
                            if (!hasUVs) {
                                log(`⚠ Mesh "${child.name}" n'a pas d'UVs, génération automatique...`, 'warning');
                                // Tentative de génération d'UVs basiques (box projection)
                                if (!child.geometry.attributes.uv) {
                                    const uvArray = [];
                                    const posArray = child.geometry.attributes.position.array;
                                    for (let i = 0; i < posArray.length; i += 3) {
                                        // Projection basique XY
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
            setupUV2ForAO(material, textures);
            
            material.needsUpdate = true;
            log(`✓ Matériau ${part} mis à jour`);
        } else {
            log(`✗ Aucun matériau trouvé pour ${part}`, 'warning');
        }
    });
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
    scene.background = new THREE.Color(backgroundColorUnlit);
    log(`Environnement Unlit: background=${backgroundColorUnlit.toString(16)}, ambientIntensity=${ambientLightIntensityUnlit}`);
    
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
                scene.background = envMap;  // Utiliser aussi comme background
                
                // Appliquer l'intensité aux matériaux
                applyEnvMapIntensityToMaterials(envMapIntensity);
                
                log(`✓ Environment map appliquée (intensity: ${envMapIntensity}, rotation: ${envMapRotation} rad)`);
            } else {
                log('✗ Échec chargement environment map, utilisation couleur de fond', 'warning');
                scene.background = new THREE.Color(backgroundColor);
                scene.environment = null;
            }
        } catch (error) {
            log(`✗ Erreur environment map: ${error.message}`, 'error');
            scene.background = new THREE.Color(backgroundColor);
            scene.environment = null;
        }
    } else {
        // Pas d'environment map, utiliser couleur de fond
        scene.background = new THREE.Color(backgroundColor);
        scene.environment = null;
        log(`Environnement Lit: background couleur unie (${backgroundColor.toString(16)})`);
    }
}

/**
 * Charge une environment map depuis un fichier HDR ou texture équirectangulaire
 * @param {string} path - Chemin vers le fichier d'environment map
 * @returns {Promise<THREE.Texture>} - La texture d'environment map chargée
 */
async function loadEnvironmentMap(path) {
    return new Promise((resolve, reject) => {
        // Pour HDR, il faudrait RGBELoader
        // Pour l'instant, on supporte les images standard (JPG/PNG) en équirectangulaire
        const loader = new THREE.TextureLoader();
        
        loader.load(
            path,
            (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                texture.colorSpace = THREE.SRGBColorSpace;
                resolve(texture);
            },
            undefined,
            (error) => {
                reject(error);
            }
        );
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
        } else {
            useEnvironmentMap = false;
            backgroundColor = color;
            log(`Changement environnement Lit: color=0x${color.toString(16)}`);
            scene.background = new THREE.Color(color);
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

// Fonction pour générer les boutons de couleur dynamiquement
function generateColorButtons() {
    const colorButtonsDiv = document.getElementById('color-buttons');
    colorButtonsDiv.innerHTML = ''; // Vider les boutons existants
    
    productParts.forEach(part => {
        if (materialCodesPerPart[part] && materialCodesPerPart[part].length > 0) {
            const btn = document.createElement('button');
            btn.id = `${part.toLowerCase()}-color-btn`;
            btn.className = 'color-btn';
            btn.textContent = `${part} (${materialCodesPerPart[part].length})`;
            btn.addEventListener('click', () => {
                currentColorIndex[part] = (currentColorIndex[part] + 1) % materialCodesPerPart[part].length;
                const materialCode = materialCodesPerPart[part][currentColorIndex[part]];
                log(`Changement ${part}: ${materialCode}`);
                loadTextures(part, currentColorIndex[part]);
            });
            colorButtonsDiv.appendChild(btn);
            log(`✓ Bouton créé pour ${part} avec ${materialCodesPerPart[part].length} options`);
        } else {
            log(`✗ Pas de codes matériaux pour ${part}`, 'warning');
        }
    });
}

// Boutons UI
document.getElementById('fullscreen-btn').addEventListener('click', () => {
    document.getElementById('viewer').requestFullscreen();
});

document.getElementById('play-btn').addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
});

// Redimensionnement
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();