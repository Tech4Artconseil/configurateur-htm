import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
let numColorsPerPart = {Pied: 1, Assise: 1, Autre: 1}; // Nombre de couleurs par partie
let currentColorIndex = {Pied: 0, Assise: 0, Autre: 0}; // Index de couleur actuel par partie

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
log(`Chargement du modèle: ${modelName}.glb`);
const loader = new GLTFLoader();
let model;
let materials = {}; // Objet pour stocker les matériaux par partie

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
        log(`Chargement des textures pour: ${part} (couleur ${currentColorIndex[part]})`);
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

// Fonction pour charger les textures
function loadTextures(part, colorIndex) {
    const textureLoader = new THREE.TextureLoader();
    const basePath = `Textures/${modelName}/${part}/Color_${colorIndex}_`;

    // Fonction helper pour essayer de charger une texture avec plusieurs extensions
    function loadTextureWithFallback(name, extensions = ['jpg', 'png']) {
        let texture = null;
        let loaded = false;
        extensions.forEach(ext => {
            const path = `${basePath}${name}.${ext}`;
            try {
                texture = textureLoader.load(path, 
                    () => {
                        if (!loaded) {
                            log(`✓ Texture chargée: ${name}.${ext}`);
                            loaded = true;
                        }
                    }, // onLoad
                    undefined, // onProgress
                    (error) => {
                        log(`✗ Texture non trouvée: ${name}.${ext}`, 'warning');
                    }
                );
            } catch (e) {
                log(`✗ Erreur chargement: ${name}.${ext}`, 'error');
            }
        });
        return texture;
    }

    const textures = {
        albedo: loadTextureWithFallback('Albedo', ['jpg', 'png']),
        ao: loadTextureWithFallback('AO', ['jpg', 'png']),
        normal: loadTextureWithFallback('Normal', ['png', 'jpg']),
        specular: loadTextureWithFallback('Spec', ['jpg', 'png']),
        alpha: loadTextureWithFallback('Alpha', ['jpg', 'png'])
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
        currentColorIndex[part] = (currentColorIndex[part] + 1) % numColorsPerPart[part];
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