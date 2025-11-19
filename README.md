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
      - `index.json` (optionnel, liste des codes matériaux)
      - `Color__W001_Albedo.jpg` (Wood 001)
      - `Color__W001_Alpha.jpg`
      - `Color__W001_Emission.jpg`
      - `Color__W001_Height.jpg`
      - `Color__W001_Metallic.jpg`
      - `Color__W001_NormalGL.png`
      - `Color__W001_Occlusion.jpg`
      - `Color__W002_...` (Wood 002)
      - `Color__M001_...` (Metal 001)
    - `Assise/`
      - `index.json` (optionnel)
      - `Color__F001_Albedo.jpg` (Fabric 001)
      - `Color__F001_Alpha.jpg`
      - `Color__F001_Metallic.jpg`
      - `Color__F001_NormalGL.png`
      - `Color__F001_Occlusion.jpg`
      - `Color__F002_...` (Fabric 002)
      - `Color__L001_...` (Leather 001)
      - etc.

### Types de textures supportés
Le système charge automatiquement les textures suivantes (configurables via `textureChannels`) :
- **Albedo** : Couleur de base (`.jpg` ou `.png`)
- **Alpha** : Transparence (`.jpg` ou `.png`)
- **Emission** : Émission lumineuse (`.jpg` ou `.png`)
- **Height** : Carte de relief/displacement (`.jpg` ou `.png`)
- **Metallic** : Carte de métallic (`.jpg` ou `.png`)
- **NormalGL** : Carte de normales OpenGL (`.png` ou `.jpg`, PNG recommandé)
- **Occlusion** : Ambient occlusion (`.jpg` ou `.png`)

Vous pouvez activer/désactiver chaque canal dans la variable `textureChannels` du fichier `app.js`.

## Installation et utilisation
1. Placez le fichier `fauteuil.glb` dans le dossier `Configurateur_HTM/`.
2. Créez la structure de dossiers `Textures/fauteuil/Pied/` et `Textures/fauteuil/Assise/` avec les textures pour chaque couleur (indices 0, 1, 2, etc.).
3. Ouvrez `index.html` dans un navigateur web moderne (Chrome, Firefox, etc.).
4. Pour hébergement sur serveur : placez tous les fichiers sur votre serveur web (attention aux CORS pour les textures).

## Configuration du modèle
- **Formats supportés** : `.glb` (binaire) ou `.gltf` (texte) - détection automatique
  - Priorité : `.glb` d'abord (plus optimisé), puis `.gltf`
  - Placez votre fichier `fauteuil.glb` ou `fauteuil.gltf` dans le dossier racine
- Le modèle doit avoir des matériaux nommés selon les parties configurables (ex: 'Pied', 'Assise')
- Les textures sont chargées dynamiquement depuis le dossier `Textures/`
- Résolution des textures : 720x720 px comme spécifié
- **Codes de matériaux** : Format alphanumérique à 4 caractères (1 lettre + 3 chiffres)
  - Exemples : `W001` (Wood 001), `M001` (Metal 001), `F001` (Fabric 001), `L001` (Leather 001), `P001` (Plastic 001)
  - Jusqu'à 999 références par catégorie de matériau

## Réglages exposés
Dans `app.js`, modifiez les variables suivantes pour ajuster le rendu :

### Paramètres de la caméra et du rendu
- `cameraFov` : Champ de vision de la caméra (75 par défaut)
- `cameraNear` / `cameraFar` : Plans de clipping
- `lightIntensity` : Intensité de la lumière directionnelle
- `ambientLightIntensity` : Intensité de la lumière ambiante
- `autoRotateSpeed` : Vitesse d'autorotation
- `backgroundColor` : Couleur de fond (0xffffff)

### Configuration du produit
- `modelName` : Nom du modèle (sans extension)
- `productParts` : Tableau des parties configurables (ex: ['Pied', 'Assise'])
- `materialCodesPerPart` : Objet avec codes de matériaux par partie (ex: {Pied: ['W001', 'W002', 'M001'], Assise: ['F001', 'L001']})

### Configuration des canaux de textures
- `textureChannels` : Objet pour activer/désactiver les canaux de textures et définir leurs extensions
  ```javascript
  {
    albedo: { enabled: true, extensions: ['jpg', 'png'], flipY: false },
    alpha: { enabled: false, extensions: ['jpg', 'png'], flipY: false },
    emission: { enabled: false, extensions: ['jpg', 'png'], flipY: false },
    height: { enabled: false, extensions: ['jpg', 'png'], flipY: false },
    metallic: { enabled: false, extensions: ['jpg', 'png'], flipY: false },
    normalGL: { enabled: false, extensions: ['png', 'jpg'], flipY: false },
    occlusion: { enabled: false, extensions: ['jpg', 'png'], flipY: false }
  }
  ```
  - `enabled: true/false` : Active ou désactive le chargement de ce canal
  - `extensions: ['jpg', 'png']` : Ordre de priorité des extensions à essayer
  - `flipY: true/false` : Retourne la texture verticalement (false = orientation originale)

### Mode d'éclairage et rendu
#### Mode Unlit vs Lit
- `unlitMode` : `true` = Mode Unlit (textures bakées, pas d'éclairage temps réel), `false` = Mode Lit (éclairage dynamique PBR)
- `forceBasicMaterial` : `true` = Remplace les matériaux GLB par MeshBasicMaterial (optimal pour Unlit), `false` = Utilise les matériaux existants
- `emissiveColor` : Couleur émissive en mode Unlit (ex: `0xffffff` = blanc)
- `emissiveIntensity` : Intensité émissive en mode Unlit (1.0 = 100%, 0.5 = 50%)

#### Tone Mapping
Le tone mapping contrôle comment les couleurs HDR sont converties pour l'affichage à l'écran.

**Options disponibles :**
- `THREE.NoToneMapping` : Aucun tone mapping (recommandé pour Unlit avec textures bakées)
- `THREE.LinearToneMapping` : Tone mapping linéaire simple
- `THREE.ReinhardToneMapping` : Algorithme Reinhard classique
- `THREE.CinematicToneMapping` : Look cinématographique
- `THREE.ACESFilmicToneMapping` : ACES standard (recommandé pour Lit)

**Configuration :**
```javascript
// Mode Unlit (textures bakées)
toneMappingUnlit = THREE.NoToneMapping;  // Rendu fidèle aux textures
toneMappingExposureUnlit = 1.0;  // Exposition neutre

// Mode Lit (éclairage dynamique)
toneMappingLit = THREE.ACESFilmicToneMapping;  // Look cinéma
toneMappingExposureLit = 1.0;  // Ajuster selon l'éclairage
```

- `toneMappingExposure` : Contrôle la luminosité globale (0.5 = sombre, 1.0 = neutre, 2.0 = lumineux)

#### Color Space (Gestion des couleurs)
**Textures :**
- `textureColorSpace` : Space couleur pour les textures albedo/émission
  - `THREE.SRGBColorSpace` : sRGB standard (recommandé pour textures couleur)
  - `THREE.LinearSRGBColorSpace` : Espace linéaire (pour données techniques)
  - Les textures de données (normal, metallic, ao, height) sont automatiquement en linéaire

**Output du Renderer :**
- `outputColorSpace` : Space couleur de sortie pour l'affichage
  - `THREE.SRGBColorSpace` : Standard pour écrans classiques (recommandé)
  - `THREE.LinearSRGBColorSpace` : Rendu linéaire
  - `THREE.DisplayP3ColorSpace` : Pour écrans Wide Gamut (Apple, certains écrans HDR)

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