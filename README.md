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

Note importante — valeur par défaut pour les options couleurs
- Si `Textures/<model>/<part>/index.json` est présent et contient un tableau `codes`, l'application utilise le premier élément de ce tableau comme option sélectionnée par défaut pour la partie concernée (équivalent à `currentColorIndex[part] = 0`).
- Exemple `Textures/fauteuil/Assise/index.json` :
  ```json
  {
    "codes": ["L001", "W001", "M010"],
    "swatches": { "L001": "Color_L001_thumb.jpg" }
  }
  ```
  Dans cet exemple, `L001` sera la couleur par défaut pour `Assise` au démarrage.
 - Pour forcer une couleur différente sans modifier l'index.json, vous pouvez définir `currentColorIndex["Assise"]` dans `app.js` avant l'initialisation.
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

### Gestion de l'environnement
Le système permet de configurer l'environnement de la scène de manière différente selon le mode d'éclairage.

#### Configuration automatique au démarrage
Au chargement du modèle 3D, si `unlitMode = false`, le système charge automatiquement l'environment map par défaut :
- **Fichier** : `Textures/environement/Default_Lit.hdr`
- **Paramètres utilisés** : `envMapIntensity` et `envMapRotation` définis dans les variables
- Si le fichier n'est pas trouvé, un avertissement est affiché et la couleur de fond est utilisée

Choix par défaut via `index.json`
- Si un fichier `Textures/environement/index.json` est présent, l'application lit ce fichier en priorité pour construire la liste des environment maps disponibles. Lorsque le fichier existe et contient au moins un élément, l'application considère désormais le premier élément du tableau comme l'environment map par défaut au démarrage (sauf si `unlitMode === true`).
- Exemple `Textures/environement/index.json` :
  ```json
  [
    { "file": "Env_01.hdr", "thumb": "Env_01_thumb.jpg", "displayName": "Studio" },
    { "file": "Env_02.exr", "thumb": "Env_02_thumb.jpg", "displayName": "Showroom" }
  ]
  ```
  Dans cet exemple, `Env_01.hdr` sera utilisée comme environment map par défaut au démarrage.
- Vous pouvez toujours overrider ce comportement en définissant manuellement `useEnvironmentMap = true` et `environmentMapPath = 'Textures/environement/Env_02.exr'` dans `app.js` avant l'initialisation.

#### Mode Lit (éclairage dynamique)
Utilise des **environment maps** pour les réflections et l'éclairage indirect :

**Configuration :**
```javascript
// Activer l'environment map
useEnvironmentMap = true;
environmentMapPath = 'Textures/environement/Default_Lit.hdr';  // Chemin vers l'env map
envMapIntensity = 1.0;  // Intensité des réflections (0.0 à 2.0+)
envMapRotation = 0;  // Rotation en radians (0 à Math.PI * 2)
```

**Variables disponibles :**
- `useEnvironmentMap` : Active/désactive l'environment map
- `environmentMapPath` : Chemin vers une image équirectangulaire (JPG/PNG/HDR/EXR) ou null pour couleur unie
- `envMapIntensity` : Intensité des réflections sur les matériaux (0.0 = pas de réflection, 1.0 = normal, 2.0 = réflections intenses)
- `envMapRotation` : Rotation de l'environment map en radians pour ajuster l'orientation de l'éclairage
- `backgroundColor` : Couleur de fond si pas d'environment map
- `envirfilename` : Tableau des noms de fichiers à scanner dans le dossier `Textures/environement/`

**Formats supportés :**
- **JPG/PNG** : Images équirectangulaires 360° standard (LDR - colorSpace: SRGBColorSpace)
- **HDR** : High Dynamic Range Radiance (via RGBELoader - colorSpace: LinearSRGBColorSpace)
- **EXR** : OpenEXR format (via EXRLoader - colorSpace: LinearSRGBColorSpace)

**Structure du dossier environement :**
```
Textures/
  └─ environement/
      ├─ Default_Lit.hdr       (chargé automatiquement en mode Lit)
      ├─ Env_01_Lit.hdr
      ├─ Env_01_UnLit.jpg
      ├─ Env_02_Lit.exr
      ├─ Env_02_UnLit.png
      └─ ...
```

### Nomenclature des fichiers d'environment et édition de `index.json`

Pour accélérer le démarrage de l'UI, le projet supporte un fichier `index.json` dans `Textures/environement/` décrivant les environment maps disponibles et leurs miniatures. Lorsqu'il est présent, l'application lit `index.json` en priorité (une seule requête) et construit immédiatement le sélecteur d'environment avec les miniatures LDR. Les fichiers lourds HDR/EXR sont ensuite chargés en lazy-load lors de la sélection.

Règles de nommage recommandées :

- Fichier d'environment : `BaseName.ext` (ex. `Default.hdr`, `Env_01.exr`, `Env_02.exr`).
- Miniature (thumb) : `BaseName_thumb.jpg` (ou `.png`, `.webp`) — ici nous recommandons JPEG pour compatibilité et taille réduite.
- Vignette côté serveur : placer `Default_thumb.jpg`, `Env_01_thumb.jpg`, `Env_02_thumb.jpg` dans `Textures/environement/`.

Format et champs utiles de `index.json` :

- `file` : (required) nom du fichier d'environment tel qu'il est sur le serveur (ex: `Env_01.exr`).
- `name` : identifiant court (optionnel) utilisé en interne.
- `displayName` : texte affiché dans l'UI (optionnel).
- `thumb` : chemin relatif vers la miniature (ex: `Env_01_thumb.jpg`) — si fourni, l'UI affiche la vignette immédiatement.
- `type` : `hdr` | `exr` | `ldr` (optionnel, sinon déduit par extension).
- `priority` : nombre optionnel pour ordonner l'affichage (plus grand = plus haut)
- `prefiltered` : chemin vers une version PMREM/préfiltrée (optionnel - utile si vous pré-générez des KTX2/PMREM côté serveur)

Exemple minimal de `index.json` (placer dans `Textures/environement/index.json`) :

```json
[
  {
    "name": "Default",
    "file": "Default.hdr",
    "type": "hdr",
    "displayName": "Default",
    "thumb": "Default_thumb.jpg"
  },
  {
    "name": "Env_01",
    "file": "Env_01.exr",
    "type": "exr",
    "displayName": "Env 01",
    "thumb": "Env_01_thumb.jpg"
  },
  {
    "name": "Env_02",
    "file": "Env_02.exr",
    "type": "exr",
    "displayName": "Env 02",
    "thumb": "Env_02_thumb.jpg"
  }
]
```

Bonnes pratiques et notes :

- Si `index.json` est absent ou invalide, l'application retombe sur le scan heuristique existant (HEAD requests). Ainsi vous pouvez déployer progressivement `index.json` sans casser le service.
- Servez `index.json` et les miniatures avec des en-têtes HTTP de cache (Cache-Control) pour accélérer les visites suivantes.
- Si vous avez la possibilité, fournissez une version préfiltrée (`prefiltered`) ou KTX2 pour éviter le coût CPU côté client (PMREM). Le champ `prefiltered` permet au client d'utiliser cette texture directement.
- Conservez les miniatures petites (ex: 160×80 ou 256×128) pour une UI réactive.

Modification du JSON :

- Éditez `Textures/environement/index.json` sur le serveur pour ajouter/retirer des entrées.
- Après modification, invalidez le cache HTTP si nécessaire (ou changez le nom du fichier) pour forcer la mise à jour côté client.
- Exemple de champ additionnel pour priorité : `{ "file": "Default.hdr", "priority": 100 }` — le loader lira le tableau dans l'ordre fourni, vous pouvez également trier côté serveur.


**Sélecteur d'environment maps :**
- Au démarrage, le système scanne le dossier `Textures/environement/` pour détecter les fichiers disponibles
- Les noms à rechercher sont définis dans la variable `envirfilename`
- Un menu déroulant est généré automatiquement dans l'interface avec :
  - Option "Aucun (couleur de fond)" pour désactiver l'environment map
  - Liste de toutes les environment maps détectées avec leur format
- La sélection change dynamiquement l'environnement via la fonction `changeEnvironment()`

#### Mode Unlit (textures bakées)
Utilise des **paramètres simplifiés** comme équivalents :

**Configuration :**
```javascript
// Apparence en mode Unlit
backgroundColorUnlit = 0xffffff;  // Couleur de fond (équivalent envMap)
ambientLightIntensityUnlit = 0.5;  // Intensité ambiante (équivalent envMapIntensity)
```

**Variables disponibles :**
- `backgroundColorUnlit` : Couleur de fond de la scène (valeur hexadécimale)
- `ambientLightIntensityUnlit` : Intensité de la lumière ambiante (0.0 = sombre, 1.0 = lumineux)

**Équivalences Mode Lit ↔ Mode Unlit :**
| Mode Lit | Mode Unlit | Description |
|----------|------------|-------------|
| `environmentMap` | `backgroundColor` | Environnement visuel |
| `envMapIntensity` | `ambientLightIntensity` | Intensité lumineuse globale |
| `envMapRotation` | N/A | Rotation (non applicable en Unlit) |

#### Changer l'environnement dynamiquement
Utilisez la fonction `changeEnvironment()` pour modifier l'environnement en cours d'exécution :

**Exemple 1 - Charger une environment map (Mode Lit) :**
```javascript
await changeEnvironment({
    type: 'envmap',
    envMapPath: 'Textures/environement/Env_01_Lit.hdr',
    intensity: 1.5,
    rotation: Math.PI / 4  // 45 degrés
});
```

**Exemple 2 - Couleur unie (Mode Lit ou Unlit) :**
```javascript
await changeEnvironment({
    type: 'color',
    color: 0x87CEEB,  // Bleu ciel
    intensity: 0.8
});
```

**Exemple 3 - Fond sombre pour mode Unlit :**
```javascript
unlitMode = true;
backgroundColorUnlit = 0x1a1a1a;  // Gris foncé
ambientLightIntensityUnlit = 0.3;
initializeEnvironment();
```

## Contrôles
- **Souris** :
  - Clic gauche + déplacer : Orbiter autour du fauteuil
  - Molette : Zoom
  - Clic droit + déplacer : Pan
- **Boutons UI** :
  - ⛶ : Plein écran
  - ▶ : Activer/désactiver autorotation
  - Boutons de couleur : Un bouton par partie configurable (généré dynamiquement selon `productParts`), pour changer la couleur

  ## Aide & dépannage rapide

  Voici des conseils pratiques pour lancer, diagnostiquer et corriger les problèmes courants :

  - **Lancer localement (PowerShell)** : depuis le répertoire du projet, ouvrez PowerShell et utilisez l'une des commandes suivantes :

  ```powershell
  cd 'c:\Travail\DEV\Devdivers\Configurateur_HTM'
  # Avec Python 3
  python -m http.server 8000
  # Ou, si vous avez Node.js/npm
  npx http-server -p 8000
  ```

  - **Page à ouvrir** : `http://localhost:8000/` — ouvrez-la dans Chrome ou Firefox.

  - **Si les textures ne s'affichent pas** :
    - Vérifiez la **console** pour les erreurs CORS (cross-origin). Si vous voyez `tainted canvas` ou erreurs de chargement, servez les fichiers depuis un serveur local (ne pas ouvrir le fichier `file://`).
    - Contrôlez la **nomenclature** des fichiers dans `Textures/<model>/<part>/` : `Color_<CODE>_Albedo.jpg`, `Color_<CODE>_NormalGL.png`, etc. Le code doit correspondre à ceux listés dans `index.json` (si présent).

  - **Pas de vignette (swatch) pour certains dossiers** :
    - Les dossiers listés via `Textures/<model>/index.json` mais **non** inclus dans `productParts` sont traités comme "dossiers additionnels" et **n'ont pas de vignettes** recherchées automatiquement. Ceci évite des requêtes inutiles pour des dossiers "Autre".

  - **Forcer une couleur au démarrage** : définissez `currentColorIndex['Assise'] = 2;` (ou l'indice souhaité) dans `app.js` avant l'initialisation pour sélectionner la 3ᵉ option par défaut.

  - **Activer le logging pour diagnostiquer** : dans `app.js`, mettez `enableLogging = true;` et `enableTextureLogging = true;` pour obtenir des logs détaillés dans la console (chargements, fallback, recherche de vignettes).

  - **Matériaux non trouvés** : si le matériau du GLB ne porte pas exactement le même nom que le dossier (ex: `Seat` vs `Assise`), on peut :
    - Renommer le matériau dans le GLB pour qu'il corresponde à `productParts`, ou
    - Ajouter un mapping (optionnel) dans `Textures/<model>/index.json` via un champ `materialName` — dites-moi si vous voulez que je l'implémente maintenant.

  - **Overlay de chargement** : le player affiche désormais un overlay pendant le chargement initial (modèle + textures). Si l'overlay reste affiché, vérifiez la console pour des erreurs ou timeout sur les requêtes réseau.

  - **Conseil performance** : fournissez des miniatures (`*_thumb.jpg`) pour les swatches et préfiltrez les environment maps (KTX2/PMREM) côté serveur pour réduire le travail CPU côté client.

  Si vous voulez, j'ajoute une checklist automatique dans le README (vérifications à faire avant déploiement) ou j'implémente le mapping `materialName` dans `index.json` maintenant.

## API / Fonctions utiles

### Fonctions d'environnement
- `scanEnvironmentMaps()` : Scanne le dossier `Textures/environement/` pour détecter les fichiers disponibles
  - Recherche les noms définis dans `envirfilename` avec les extensions JPG, JPEG, PNG, HDR, EXR
  - Retourne un tableau d'objets avec `{name, path, extension, displayName}`
- `generateEnvironmentSelector()` : Génère le menu déroulant de sélection d'environment maps
  - Crée l'option "Aucun (couleur de fond)"
  - Ajoute toutes les environment maps détectées
  - Connecte le changement au `changeEnvironment()`
- `loadEnvironmentMap(path)` : Charge une environment map depuis un fichier
  - Détection automatique du format (JPG/PNG/HDR/EXR)
  - Utilise le loader approprié (TextureLoader, RGBELoader, EXRLoader)
  - Configure automatiquement le colorSpace selon le format
- `initializeEnvironment()` : Initialise l'environnement au démarrage
- `changeEnvironment(options)` : Change l'environnement dynamiquement
  - Options : `{type, color, envMapPath, intensity, rotation}`
- `applyEnvMapIntensityToMaterials(intensity)` : Applique l'intensité aux matériaux
- `applyUnlitEnvironment()` : Applique l'environnement en mode Unlit (couleur + lumière ambiante)
- `applyLitEnvironment()` : Applique l'environnement en mode Lit (environment map ou couleur)

### Fonctions de matériaux
- `applyMaterialMode(material, textures)` : Applique le mode Unlit ou Lit à un matériau
- `createBasicMaterialFromExisting(material)` : Crée un MeshBasicMaterial depuis un matériau existant

## Améliorations futures
- Interface pour sélectionner couleur spécifique
- Contrôles UI pour ajuster l'intensité et la rotation de l'environment map en temps réel
- Sauvegarde/chargement de configurations
- Export d'images
- Prévisualisation miniature des environment maps dans le sélecteur

## Dépendances
- Three.js : https://cdnjs.cloudflare.com/ajax/libs/three.js/r167/three.min.js
- OrbitControls et GLTFLoader inclus via CDN

## Variables configurables (récapitulatif)

Pour une référence rapide, voici la liste compacte des variables modifiables dans `app.js` (type — valeur par défaut — description) :

### Caméra
- `cameraFov` (number) — `75` : FOV caméra (degrés)
- `cameraNear` (number) — `0.1` : Plan near
- `cameraFar` (number) — `1000` : Plan far
- `initialFocalLengthMm` (number) — `55` : Focale initiale (mm)
- `initialCameraHeight` (number) — `1.2` : Hauteur caméra relative au centre du modèle
- `initialOrbitDeg` (number) — `325` : Azimut initial en degrés
- `initialZoomDistance` (number|null) — `null` : Distance forcée (null = auto)
- `initialCameraFill` (number) — `0.7` : Fraction de la hauteur de vue occupée par le modèle

### Rendu / ColorSpace
- `transparentBackground` (boolean) — `true` : Canvas transparent
- `backgroundColor` (number) — `0xffffff` : Couleur de fond
- `toneMappingUnlit` / `toneMappingLit` — Tone mapping pour Unlit / Lit
- `toneMappingExposureUnlit` / `toneMappingExposureLit` — Exposition
- `textureColorSpace` / `outputColorSpace` — Color spaces

### Lumières / Environnement
- `lightIntensity`, `ambientLightIntensity`, `useEnvironmentMap`, `environmentMapPath`, `envMapIntensity`, `envMapRotation`, `backgroundColorUnlit`, `ambientLightIntensityUnlit`, `envirfilename`

### Textures
- `textureChannels` — objet de configuration par canal (enabled, extensions, flipY)

#### Stratégie de chargement des textures
- `textureLoadStrategy` (string) — `'B'` : Stratégie par défaut (`'B'` = fetch -> blob -> `HTMLImageElement`) ; option `'C'` = canvas + prémultiplication manuelle
- `texturePremultiplyOnCanvas` (boolean) — `false` : lorsque `textureLoadStrategy === 'C'`, indique si l'on doit appliquer la prémultiplication (RGB * A) côté CPU
- `textureForcePremultiply` (boolean) — `false` : lorsque `textureLoadStrategy === 'B'`, indique si l'on demande au GPU d'appliquer `premultiplyAlpha = true` sur la `THREE.Texture`
- `window.setTextureLoadStrategy('B'|'C')` — fonction exposée pour basculer la stratégie à l'exécution
- `window.setTexturePremultiplyOnCanvas(true|false)` — toggle exposé pour la prémultiplication côté canvas
- `window.setTextureForcePremultiply(true|false)` — toggle exposé pour forcer `premultiplyAlpha` côté GPU

Ces variables permettent de contrôler la manière dont les images sont chargées et uploadées en GPU afin d'éviter les warnings WebGL relatifs à `flipY` / `premultiplyAlpha` et d'autoriser un traitement pixel-wise si nécessaire.

#### Swatches / Miniatures
- `_swatchLookupCache` — (internal) `Map` en mémoire pour mettre en cache les URL de vignettes côté serveur
- `findSwatchForMaterial(folderPath, materialCode)` — helper asynchrone qui recherche des miniatures côté serveur en priorisant `*_thumb` puis un fallback `_Swatch` et lisant `index.json` au besoin

### UV / Géométrie
- `uvSettings.autoGenerateUV` — `false`
- `uvSettings.autoGenerateUV2` — `true`

### Debug / UI
- `showNormals`, `normalHelperSize`, `normalHelperColor`, `unlitMode`, `emissiveColor`, `emissiveIntensity`, `forceBasicMaterial`
- `showTexturePreviewPanel`, `texturePreviewSize`, `texturePreviewContainerId`, `enableLogging`
- `enableTextureLogging` (boolean) — `false` : contrôle les logs relatifs au chargement/gestion des textures (les messages ne s'affichent que si `enableLogging && enableTextureLogging`)

#### Overlay de chargement
- `createLoadingOverlay()` — crée l'overlay avec spinner et barre de progression (IDs: `t4a-loading-overlay`, `t4a-loading-msg`, `t4a-loading-bar`, `t4a-loading-percent`)
- `showLoadingOverlay(message)` — affiche l'overlay avec message personnalisé
- `updateLoadingMessage(message)` — met à jour le texte affiché
- `updateLoadingProgress(percent)` — met à jour la barre de progression (0-100)
- `hideLoadingOverlay()` — masque et supprime l'overlay avec transition

#### Labels circulaires (defaults)
- `CIRCULAR_LABEL_DEFAULTS_ENV` — objet global de defaults pour le label circulaire des environnements (`fontSize`, `radius`, `startOffset`, `color`, `textAnchor`, `startAt`, `direction`, `rotationDeg`, `showCodeLabel`, `codeLabelFormat`)
- `CIRCULAR_LABEL_DEFAULTS_COLOR` — objet global de defaults pour les labels circulaires des boutons de couleur (mêmes champs)
- `window.setCircularLabelOptions(options)` — helper exposé pour appliquer ces options à chaud
- `window.setEnvToggleLabelOptions(options)` — alias spécifique pour le toggle d'environnement
- `window.setCircularLabelBehavior(options)` — configure les flags de compatibilité navigateur (`invertCircularText`, `enableSweepFlag`, `enableBottomRotation`)

### Nouveaux toggles et compatibilité cross-browser

Le rendu du texte le long d'un `textPath` peut varier légèrement entre navigateurs (Firefox vs Chromium/WebKit). Pour obtenir un rendu visuel cohérent, le code initialise désormais plusieurs valeurs par défaut en fonction du navigateur, et expose des toggles globaux pour forcer ou ajuster le comportement à chaud.

Principaux flags exposés :

- `window._invertCircularText` (boolean) — si `true`, inverse la direction calculée pour l'écriture le long du chemin (utile pour forcer l'affichage si votre navigateur montre le texte « à l'envers`).
- `window._enableSweepFlag` (boolean) — si `false`, le `sweepFlag` utilisé pour construire l'arc est fixé et la logique de flip automatique est désactivée.
- `window._enableBottomRotation` (boolean) — si `false`, la transformation `rotate(180 50 50)` appliquée lorsque `startAt === 'bottom'` est ignorée.

#### Détection automatique de navigateur

Pour centraliser la configuration par navigateur, le système utilise une table `_browserDefaults` qui définit des comportements optimisés par navigateur :

```javascript
const _browserDefaults = {
  firefox: { invertCircularText: false, enableSweepFlag: true, enableBottomRotation: true, direction: 'ccw' },
  chrome: { invertCircularText: false, enableSweepFlag: true, enableBottomRotation: true, direction: 'cw' },
  edge: { invertCircularText: false, enableSweepFlag: true, enableBottomRotation: true, direction: 'cw' },
  safari: { invertCircularText: false, enableSweepFlag: false, enableBottomRotation: false, direction: 'cw' },
  other: { invertCircularText: false, enableSweepFlag: true, enableBottomRotation: true, direction: 'cw' }
};
```

Au démarrage, le script détecte le navigateur via `navigator.userAgent` et applique automatiquement les defaults correspondants. Cela permet d'avoir un rendu visuel cohérent des labels circulaires SVG sur Firefox, Chrome, Edge, Safari sans intervention manuelle.

API runtime pour ajuster le comportement

Pour modifier ces valeurs à chaud, utilisez l'helper suivant exposé dans la page :

```javascript
// Appliquer de nouveaux réglages à chaud
window.setCircularLabelBehavior({
  invertCircularText: false,       // true/false
  enableSweepFlag: true,           // true/false
  enableBottomRotation: false      // true/false
});

// La fonction logge et retourne l'état appliqué :
// { browser: 'chrome'|'firefox'|'edge'|'safari'|'other', invertCircularText, enableSweepFlag, enableBottomRotation }
```

Le helper ne force rien de façon irréversible : si vous préférez définir explicitement un flag avant que `app.js` soit exécuté (par exemple via un script inline dans `index.html`), la valeur fournie sera respectée et ne sera pas écrasée par les defaults détectés.

Exemples rapides (console) :

```javascript
// Forcer l'inversion visuelle
window.setCircularLabelBehavior({ invertCircularText: true });

// Désactiver l'usage du sweepFlag
window.setCircularLabelBehavior({ enableSweepFlag: false });

// Activer la rotation bottom
window.setCircularLabelBehavior({ enableBottomRotation: true });
```

Remarque : si vous préférez une méthode « feature-detection » plus fiable que l'User-Agent (test visuel SVG pour déduire le comportement réel), l'équipe peut ajouter un petit test runtime qui mesure l'affichage et règle automatiquement ces flags — dites-le si vous voulez que je l'implémente.

### Modèle & Contrôles
- `modelName`, `modelExtension`, `productParts`, `materialCodesPerPart`, `currentColorIndex`, `availableEnvironmentMaps`, `autoRotateSpeed`

Modifier ces variables dans `app.js` permet d'ajuster le comportement au démarrage. Si vous souhaitez, j'ajoute également un tableau Markdown complet (variable | type | défaut | description) pour remplacer ce récapitulatif.

---

## Aide : options des labels circulaires (texte autour des boutons)

## Chargement des textures — stratégie DOM vs Canvas

Le player implémente aujourd'hui une stratégie par défaut pour charger les images de textures qui privilégie la compatibilité et la conformité aux normes modernes :

- Stratégie par défaut : **B (fetch -> blob -> HTMLImageElement)**.
  - Le code récupère l'image via `fetch` (Blob), crée un `HTMLImageElement` via `URL.createObjectURL(blob)` et construit la `THREE.Texture` à partir de cet élément DOM.
  - Avantages : évite les warnings WebGL liés à `flipY` et `premultiplyAlpha` pour les sources non-DOM, respecte les conventions récentes des navigateurs, et reste léger côté client (pas de traitement pixel-wise coûteux).
  - C'est la stratégie recommandée si vous souhaitez garder le player polyvalent et léger tout en conservant la possibilité d'utiliser `flipY` et la prémultiplication alpha côté GPU.

- Stratégie optionnelle : **C (canvas + prémultiplication)**.
  - Le code dessine l'image dans un `<canvas>` DOM et peut appliquer une prémultiplication manuelle (RGB * A) sur les pixels avant d'assigner le canvas à la `THREE.Texture`.
  - Avantages : permet de forcer la prémultiplication côté client et de contrôler précisément les pixels. Utile pour cas particuliers (petites images, workflows spécifiques).
  - Inconvénients : opération coûteuse en CPU (getImageData / putImageData) pour de grandes textures, et soumise aux restrictions CORS (si l'image est "tainted", `getImageData` échouera).

Comment basculer et configurer
- Variables globales exposées depuis `app.js` :
  - `window.setTextureLoadStrategy('B'|'C')` : choisis la stratégie (par défaut `'B'`).
  - `window.setTexturePremultiplyOnCanvas(true|false)` : lorsque stratégie `'C'` est active, indique s'il faut appliquer la prémultiplication manuelle sur le canvas.
  - `window.setTextureForcePremultiply(true|false)` : lorsque stratégie `'B'` est active, indique si la texture doit demander au GPU d'appliquer la prémultiplication (`premultiplyAlpha = true`).

Pourquoi ce choix pour ce projet
- Respect des contraintes : la stratégie **B** permet de garder un player léger et polyvalent tout en évitant les pratiques dépréciées (warning WebGL) et en permettant flipY/premultiply quand le serveur fournit des images standards servies avec CORS.
- Extensibilité : la stratégie **C** est maintenue et activable au besoin (option pour scénarios où la prémultiplication doit être forcée côté client ou pour de petits assets nécessitant un traitement pixel-wise).
- Meilleure pratique recommandée : si possible, préparer/pre-filtrer les textures côté serveur (KTX2, Basis, PMREM) — voir la section "Améliorations futures" — pour un rendu optimal (performance et qualité).

Cette section documente les options disponibles pour contrôler les textes circulaires générés autour des boutons (sélecteurs d'environnement et boutons de couleur).

- `containerId` : `string` — Identifiant du conteneur DOM cible (ex: `pied-color-dropdown`, `env-dropdown`).
- `startAt` : `"top" | "bottom"` — Place le chemin du texte au-dessus (`top`) ou en dessous (`bottom`) du centre du bouton. Pour afficher le texte en haut du bouton utilisez `startAt: 'top'`.
- `radius` : `number` — Rayon (en px) du chemin circulaire par rapport au centre du bouton. Valeurs typiques : `30` à `70` selon la taille du bouton.
- `startOffset` : `string|number` — Position le long du chemin où commence le texte. Exemple : `'50%'` centre le texte autour du point choisi. Utilisez `'50%'` pour centrer le texte en haut.
- `textAnchor` : `"middle" | "start" | "end"` — Alignement du texte par rapport à `startOffset`. Pour centrer : `textAnchor: 'middle'`.
- `fontSize` : `number` — Taille du texte en px (ex: `10`, `12`, `18`).
- `color` : `string` — Couleur du texte (hex, `rgb(...)`, etc.).
- `direction` : `"cw" | "ccw"` — Sens d'écriture le long du cercle : `cw` = horaire (par défaut), `ccw` = antihoraire.

Conseil rapide pour placer le texte centré en haut du bouton :

```javascript
window.setCircularLabelOptions({
  containerId: 'pied-color-dropdown',
  startAt: 'top',
  radius: 40,
  startOffset: '50%',
  textAnchor: 'middle',
  fontSize: 12,
  color: '#222',
  direction: 'cw'
});
```

Si le DOM n'est pas encore prêt, utilisez le helper de retry :

```javascript
applyLabelOptionsWhenReady('pied-color-dropdown', {
  startAt: 'top', radius: 40, startOffset: '50%', textAnchor: 'middle', fontSize: 12
});
```

Si le texte ne s'affiche pas comme prévu, essayez d'augmenter `radius` ou `fontSize`, ou vérifiez que l'élément `containerId` existe dans le DOM.

## Propriété intellectuelle & licence

Ce projet est la propriété de Tech4Art Conseil (Jean-Baptiste BARON).

- Auteur : Jean-Baptiste BARON
- Contact : tech4artconseil@gmail.com
- Site : https://tech4art.fr
- Société : Tech4Art Conseil
- SIRET : 48017112300064

Licence : ce code est distribué sous une licence propriétaire restrictive ("All rights reserved").
L'utilisation, la copie, la modification, la distribution ou la publication du code
ne sont pas autorisées sans l'accord écrit explicite du titulaire des droits.

Voir le fichier `LICENSE_PROPRIETARY.txt` pour le texte complet de la licence,
les mentions légales : https://tech4art.fr/mentions-legales/
et la page Propriété Intellectuelle : https://tech4art.fr/propriete-intellectuelle-tech4artconseil-fr/

Pour toute demande commerciale, d'intégration, d'achat de licence ou de réutilisation,
contactez : tech4artconseil@gmail.com

Référence / guide pour la formulation de licences :
https://doc-publique.pages.xlim.fr/une%20licence%20sur%20mon%20code/
