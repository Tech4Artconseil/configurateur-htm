# Visionneuse Fauteuil 3D

Cette visionneuse permet d'afficher un modèle 3D de fauteuil au format GLB/GLTF avec options de configuration simples pour les pieds et l'assise, utilisant des textures externes.

## Technologies utilisées
- Three.js (dernière version stable r167)
- HTML5 Canvas
- CSS pour l'interface

## Structure des fichiers
- `index.html` : Page principale HTML
- `styles.css` : Styles CSS
- `app.js` : Code JavaScript Three.js
- `fauteuil.glb` : Modèle 3D (à placer dans le dossier)
- `Textures/` : Dossier des textures externes
  - `[Model Name]/` (ex: `fauteuil/`)
    - `Pied/`
      - `Color_W001_Albedo.png` (Wood 001)
      - `Color_W001_AO.png`
      - `Color_W001_Normal.png`
      - `Color_W001_Spec.png`
      - `Color_W001_Alpha.png`
      - `Color_W002_...` (Wood 002)
      - `Color_M001_...` (Metal 001)
    - `Assise/`
      - `Color_F001_Albedo.png` (Fabric 001)
      - `Color_F002_Albedo.png` (Fabric 002)
      - `Color_L001_...` (Leather 001)
      - etc.

## Installation et utilisation
1. Placez le fichier `fauteuil.glb` dans le dossier `Configurateur_HTM/`.
2. Créez la structure de dossiers `Textures/fauteuil/Pied/` et `Textures/fauteuil/Assise/` avec les textures pour chaque couleur (indices 0, 1, 2, etc.).
3. Ouvrez `index.html` dans un navigateur web moderne (Chrome, Firefox, etc.).
4. Pour hébergement sur serveur : placez tous les fichiers sur votre serveur web (attention aux CORS pour les textures).

## Configuration du modèle
- Le modèle GLB doit avoir des matériaux nommés 'pieds' et 'assise'.
- Les textures sont chargées dynamiquement depuis le dossier `Textures/`.
- Résolution des textures : 720x720 px comme spécifié.
- **Codes de matériaux** : Format alphanumérique à 4 caractères (1 lettre + 3 chiffres)
  - Exemples : `W001` (Wood 001), `M001` (Metal 001), `F001` (Fabric 001), `L001` (Leather 001), `P001` (Plastic 001)
  - Jusqu'à 999 références par catégorie de matériau

## Réglages exposés
Dans `app.js`, modifiez les variables suivantes pour ajuster le rendu :
- `cameraFov` : Champ de vision de la caméra (75 par défaut)
- `cameraNear` / `cameraFar` : Plans de clipping
- `lightIntensity` : Intensité de la lumière directionnelle
- `ambientLightIntensity` : Intensité de la lumière ambiante
- `autoRotateSpeed` : Vitesse d'autorotation
- `backgroundColor` : Couleur de fond (0xffffff)
- `modelName` : Nom du modèle (sans extension)
- `productParts` : Tableau des parties configurables (ex: ['Pied', 'Assise'])
- `materialCodesPerPart` : Objet avec codes de matériaux par partie (ex: {Pied: ['W001', 'W002', 'M001'], Assise: ['F001', 'L001']})

## Contrôles
- **Souris** :
  - Clic gauche + déplacer : Orbiter autour du fauteuil
  - Molette : Zoom
  - Clic droit + déplacer : Pan
- **Boutons UI** :
  - ⛶ : Plein écran
  - ▶ : Activer/désactiver autorotation
  - Boutons de couleur : Un bouton par partie configurable (généré dynamiquement selon `productParts`), pour changer la couleur

## Améliorations futures
- Ajouter plus de couleurs
- Interface pour sélectionner couleur spécifique
- Sauvegarde/chargement de configurations
- Export d'images

## Dépendances
- Three.js : https://cdnjs.cloudflare.com/ajax/libs/three.js/r167/three.min.js
- OrbitControls et GLTFLoader inclus via CDN