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
      - `Color_0_Albedo.jpg`
      - `Color_0_AO.jpg`
      - `Color_0_Normal.png`
      - `Color_0_Spec.jpg`
      - `Color_0_Alpha.jpg`
      - `Color_1_...` (pour chaque couleur)
    - `Assise/`
      - `Color_0_Albedo.jpg`
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
- `numColorsPerPart` : Objet avec nombre de couleurs par partie (ex: {Pied: 3, Assise: 3})

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