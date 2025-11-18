import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Variables de réglage exposées
let cameraFov = 75;
let cameraNear = 0.1;
let cameraFar = 1000;
let lightIntensity = 1;
let ambientLightIntensity = 0.5;
let autoRotateSpeed = 0.5;
let backgroundColor = 0xffffff;

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
let modelName = 'fauteuil'; // Nom du modèle, même que GLB sans extension
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

// Scanner les textures d'abord, puis charger le modèle
scanMaterialCodes().then(() => {
    log(`Chargement du modèle: ${modelName}.glb`);
    const loader = new GLTFLoader();

    // Configurer le DRACOLoader pour les modèles compressés
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(`${modelName}.glb`, (gltf) => {
    log('Modèle GLB chargé avec succès');
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

    // Trouver les matériaux pour chaque partie configurée
    log('=== CORRESPONDANCE AVEC PARTIES CONFIGURABLES ===');
    let foundMaterials = 0;
    model.traverse((child) => {
        if (child.isMesh) {
            const materialsArray = Array.isArray(child.material) ? child.material : [child.material];
            
            materialsArray.forEach((mat) => {
                productParts.forEach(part => {
                    if (mat.name.toLowerCase() === part.toLowerCase()) {
                        materials[part] = mat;
                        foundMaterials++;
                        log(`✓ Matériau "${mat.name}" assigné à partie: ${part}`);
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
    log(`Erreur chargement GLB: ${error.message}`, 'error');
    console.error('Erreur chargement GLB:', error);
});
});

// Fonction pour charger les textures
function loadTextures(part, colorIndex) {
    const textureLoader = new THREE.TextureLoader();
    const materialCode = materialCodesPerPart[part][colorIndex];
    const basePath = `Textures/${modelName}/${part}/Color_${materialCode}_`;

    // Fonction helper pour essayer de charger une texture avec plusieurs extensions
    function loadTextureWithFallback(name, extensions = ['png', 'jpg']) {
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
                    () => {
                        log(`✓ Texture chargée: Color_${materialCode}_${name}.${ext}`);
                        resolve(texture);
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

    // Charger toutes les textures de manière asynchrone
    Promise.all([
        loadTextureWithFallback('Albedo', ['png', 'jpg']),
        loadTextureWithFallback('AO', ['png', 'jpg']),
        loadTextureWithFallback('Normal', ['png', 'jpg']),
        loadTextureWithFallback('Spec', ['png', 'jpg']),
        loadTextureWithFallback('Alpha', ['png', 'jpg'])
    ]).then(([albedo, ao, normal, specular, alpha]) => {
        const textures = { albedo, ao, normal, specular, alpha };

        // Assigner aux matériaux
        const material = materials[part];
        if (material) {
            log(`Application des textures sur matériau: ${part}`);
            
            // Vérifier si le mesh associé a des UVs
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
            
            if (textures.albedo) {
                material.map = textures.albedo;
                material.map.encoding = THREE.sRGBEncoding; // Important pour les couleurs
            }
            if (textures.ao) {
                material.aoMap = textures.ao;
                material.aoMapIntensity = 1.0; // Ajustable
                // AO map nécessite UV2, on utilise UV si UV2 n'existe pas
                model.traverse((child) => {
                    if (child.isMesh) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        if (mats.includes(material) && !child.geometry.attributes.uv2) {
                            child.geometry.setAttribute('uv2', child.geometry.attributes.uv);
                            log(`ℹ UV2 copié depuis UV pour AO map sur "${child.name}"`);
                        }
                    }
                });
            }
            if (textures.normal) {
                material.normalMap = textures.normal;
            }
            if (textures.specular) {
                // Pour MeshStandardMaterial, utiliser roughnessMap ou metalnessMap
                if (material.type === 'MeshStandardMaterial' || material.type === 'MeshPhysicalMaterial') {
                    material.roughnessMap = textures.specular;
                } else {
                    material.specularMap = textures.specular;
                }
            }
            if (textures.alpha) {
                material.alphaMap = textures.alpha;
                material.transparent = true;
            }
            
            material.needsUpdate = true;
            log(`✓ Matériau ${part} mis à jour`);
        } else {
            log(`✗ Aucun matériau trouvé pour ${part}`, 'warning');
        }
    });
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