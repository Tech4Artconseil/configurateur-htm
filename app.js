//
// Variables de réglage exposées
let cameraFov = 75;
let cameraNear = 0.1;
let cameraFar = 1000;
let lightIntensity = 1;
let ambientLightIntensity = 0.5;
let autoRotateSpeed = 0.5;
let backgroundColor = 0xffffff;

// Variables pour textures
let modelName = 'fauteuil'; // Nom du modèle, même que GLB sans extension
let numColorsPieds = 3; // Nombre de couleurs disponibles pour pieds
let numColorsAssise = 3; // Nombre de couleurs disponibles pour assise
let currentPiedsColor = 0;
let currentAssiseColor = 0;

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
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.enablePan = true;
controls.enableRotate = true;
controls.autoRotateSpeed = autoRotateSpeed;

// Charger le modèle GLB
const loader = new THREE.GLTFLoader();
let model;
let materialPieds;
let materialAssise;

loader.load(`${modelName}.glb`, (gltf) => {
    model = gltf.scene;
    scene.add(model);

    // Trouver les matériaux
    model.traverse((child) => {
        if (child.isMesh) {
            if (child.material.name === 'pieds') {
                materialPieds = child.material;
            } else if (child.material.name === 'assise') {
                materialAssise = child.material;
            }
        }
    });

    // Charger les textures initiales
    loadTextures('Pied', currentPiedsColor);
    loadTextures('Assise', currentAssiseColor);

    // Centrer la caméra sur le modèle
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    controls.target.copy(center);
    camera.lookAt(center);
}, undefined, (error) => {
    console.error('Erreur chargement GLB:', error);
});

// Fonction pour charger les textures
function loadTextures(part, colorIndex) {
    const textureLoader = new THREE.TextureLoader();
    const basePath = `Textures/${modelName}/${part}/Color_${colorIndex}_`;

    const textures = {
        albedo: textureLoader.load(`${basePath}Albedo.jpg`),
        ao: textureLoader.load(`${basePath}AO.jpg`),
        normal: textureLoader.load(`${basePath}Normal.png`),
        specular: textureLoader.load(`${basePath}Spec.jpg`),
        alpha: textureLoader.load(`${basePath}Alpha.jpg`)
    };

    // Assigner aux matériaux
    let material;
    if (part === 'Pied') {
        material = materialPieds;
    } else if (part === 'Assise') {
        material = materialAssise;
    }

    if (material) {
        material.map = textures.albedo;
        material.aoMap = textures.ao;
        material.normalMap = textures.normal;
        material.specularMap = textures.specular;
        material.alphaMap = textures.alpha;
        material.needsUpdate = true;
    }
}

// Boutons UI
document.getElementById('fullscreen-btn').addEventListener('click', () => {
    document.getElementById('viewer').requestFullscreen();
});

document.getElementById('play-btn').addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
});

document.getElementById('pieds-color-btn').addEventListener('click', () => {
    currentPiedsColor = (currentPiedsColor + 1) % numColorsPieds;
    loadTextures('Pied', currentPiedsColor);
});

document.getElementById('assise-color-btn').addEventListener('click', () => {
    currentAssiseColor = (currentAssiseColor + 1) % numColorsAssise;
    loadTextures('Assise', currentAssiseColor);
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