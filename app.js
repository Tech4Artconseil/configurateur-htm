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
        const commonPrefixes = ['W', 'M', 'F', 'L', 'P', 'C', 'G', 'T', 'S', 'V'];
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

    // Trouver les matériaux pour chaque partie
    let foundMaterials = 0;
    model.traverse((child) => {
        if (child.isMesh) {
            productParts.forEach(part => {
                if (child.material.name === part.toLowerCase()) {
                    materials[part] = child.material;
                    foundMaterials++;
                    log(`Matériau trouvé: ${part}`);
                }
            });
        }
    });
    log(`Total matériaux trouvés: ${foundMaterials}/${productParts.length}`);

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
        let texture = null;
        let loaded = false;
        extensions.forEach(ext => {
            const path = `${basePath}${name}.${ext}`;
            try {
                texture = textureLoader.load(path, 
                    () => {
                        if (!loaded) {
                            log(`✓ Texture chargée: Color_${materialCode}_${name}.${ext}`);
                            loaded = true;
                        }
                    }, // onLoad
                    undefined, // onProgress
                    (error) => {
                        log(`✗ Texture non trouvée: Color_${materialCode}_${name}.${ext}`, 'warning');
                    }
                );
            } catch (e) {
                log(`✗ Erreur chargement: Color_${materialCode}_${name}.${ext}`, 'error');
            }
        });
        return texture;
    }

    const textures = {
        albedo: loadTextureWithFallback('Albedo', ['png', 'jpg']),
        ao: loadTextureWithFallback('AO', ['png', 'jpg']),
        normal: loadTextureWithFallback('Normal', ['png', 'jpg']),
        specular: loadTextureWithFallback('Spec', ['png', 'jpg']),
        alpha: loadTextureWithFallback('Alpha', ['png', 'jpg'])
    };

    // Assigner aux matériaux
    const material = materials[part];
    if (material) {
        if (textures.albedo) material.map = textures.albedo;
        if (textures.ao) material.aoMap = textures.ao;
        if (textures.normal) material.normalMap = textures.normal;
        if (textures.specular) material.specularMap = textures.specular;
        if (textures.alpha) material.alphaMap = textures.alpha;
        material.needsUpdate = true;
    }
}

// Générer les boutons de couleur dynamiquement
const colorButtonsDiv = document.getElementById('color-buttons');
productParts.forEach(part => {
    const btn = document.createElement('button');
    btn.id = `${part.toLowerCase()}-color-btn`;
    btn.className = 'color-btn';
    btn.textContent = part;
    btn.addEventListener('click', () => {
        currentColorIndex[part] = (currentColorIndex[part] + 1) % materialCodesPerPart[part].length;
        const materialCode = materialCodesPerPart[part][currentColorIndex[part]];
        log(`Changement ${part}: ${materialCode}`);
        loadTextures(part, currentColorIndex[part]);
    });
    colorButtonsDiv.appendChild(btn);
});

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