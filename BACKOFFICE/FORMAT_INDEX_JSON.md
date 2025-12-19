# Format des fichiers index.json

## Vue d'ensemble
Le système utilise différents formats de fichiers `index.json` selon le type de dossier et son contenu.

## 1. Format TEXTURES (dossiers de texture sets)

### Quand ce format est utilisé
Automatiquement détecté pour les dossiers contenant des fichiers avec le pattern `Color_XXX_YYY.ext` où :
- `XXX` = code matériau (1 lettre + 3 chiffres, ex: F001, W002, M003)
- `YYY` = type de canal (Albedo, NormalGL, Roughness, etc.)
- `ext` = extension (jpg, png, etc.)

### Structure
```json
{
  "_comment": "CONFIGURATEUR 3D - Index niveau PARTIE (NomPartie)",
  "_help": {
    "role": "Liste les codes matériaux disponibles pour cette partie configurable",
    "format": "Array de codes alphanumériques (1 lettre + 3 chiffres). Ordre = ordre d'affichage dans l'UI",
    "exemple": "Ajouter nouveau tissu: 'F005' (nécessite fichiers Color_F005_Albedo.jpg, etc.)",
    "contraintes": "Chaque code doit avoir ses fichiers textures correspondants dans ce dossier",
    "impact": "Premier code = sélection par défaut au démarrage. Génère les boutons couleur dans l'interface",
    "fichiers_requis": "Color_<CODE>_Albedo.jpg, Color_<CODE>_NormalGL.png, etc. selon textureChannels activés"
  },
  "codes": ["F001", "F002", "F003", "F004"]
}
```

### Champs
- **`_comment`** : Description du fichier (auto-généré avec le nom de la partie)
- **`_help`** : Documentation inline pour faciliter l'édition manuelle
- **`codes`** : Tableau simple de codes matériaux (ordre = ordre d'affichage)

### Exemples de dossiers utilisant ce format
- `Textures/fauteuil/Assise/` → codes: ["F001", "F002", "F003", "F004"]
- `Textures/fauteuil/Pied/` → codes: ["M001", "W001", "W002"]

### Comment ajouter un nouveau matériau
1. Créer les fichiers de textures avec le bon pattern :
   - `Color_F005_Albedo.jpg`
   - `Color_F005_NormalGL.png`
   - `Color_F005_Roughness.jpg`
   - etc.
2. Ajouter le code dans le tableau `codes` : `"F005"`
3. Le nouveau matériau apparaîtra automatiquement dans l'interface

---

## 2. Format PRODUIT (niveau racine produit)

### Quand ce format est utilisé
Pour les dossiers au niveau 1 de profondeur depuis la racine spécifiée (ex: `Textures/fauteuil/`)

### Structure
```json
{
  "_comment": "CONFIGURATEUR 3D - Index niveau PRODUIT",
  "_help": {
    "role": "Liste les dossiers additionnels à charger automatiquement (non inclus dans productParts)",
    "format": "Array d'objets avec: folder (nom dossier), displayName (affichage), defaultCode (code par défaut)",
    "exemple": "Pour ajouter un dossier 'Accessoire': {folder: 'Accessoire', displayName: 'Options Accessoires', defaultCode: 'ACC001'}",
    "contraintes": "Le dossier doit exister et contenir un index.json avec codes",
    "impact": "Les textures seront appliquées aux matériaux GLB portant le même nom que 'folder'"
  },
  "items": [
    {
      "folder": "Autre",
      "displayName": "Options Autre",
      "defaultCode": "X001"
    }
  ]
}
```

### Champs
- **`folder`** : Nom du dossier enfant
- **`displayName`** : Nom d'affichage dans l'UI
- **`defaultCode`** : Code matériau par défaut à charger

---

## 3. Format GÉNÉRIQUE (autres dossiers)

### Quand ce format est utilisé
Pour les dossiers qui ne correspondent pas aux autres catégories (ex: dossiers sans pattern Color_XXX_)

### Structure
```json
{
  "_comment": "CONFIGURATEUR - Index auto-généré",
  "_help": {
    "role": "Index auto-généré - à adapter manuellement si besoin"
  },
  "items": [
    { "code": "bois_blanc" },
    { "code": "bois_Noir" }
  ]
}
```

### Exemples
- Dossiers d'environnement
- Dossiers avec conventions de nommage spécifiques non-standard

---

## Workflow de génération

### Génération automatique
```bash
# Pour un produit spécifique
npm run poc -- --root Textures/fauteuil --write

# Pour tous les produits
node scripts/generate-index.js --root Textures --write
```

### Édition manuelle
Après génération automatique, vous pouvez éditer manuellement les fichiers `index.json` :
- Réordonner les codes (l'ordre = ordre d'affichage dans l'UI)
- Modifier les `displayName`
- Ajuster les valeurs par défaut
- La documentation `_help` vous guide

---

## Conventions de nommage

### Codes matériaux
- **Format** : 1 lettre + 3 chiffres
- **Exemples** : F001, W002, M123
- **Préfixes suggérés** :
  - `F` : Fabrics / Tissus
  - `W` : Wood / Bois
  - `M` : Metal / Métal
  - `L` : Leather / Cuir
  - `P` : Plastic / Plastique

### Fichiers de textures
- **Pattern** : `Color_<CODE>_<CANAL>.ext`
- **Exemple** : `Color_F001_Albedo.jpg`
- **Canaux supportés** :
  - `Albedo` : Couleur de base
  - `NormalGL` : Normal map (OpenGL)
  - `Roughness` : Rugosité
  - `Metallic` : Métallique
  - `Occlusion` : Ambient occlusion
  - `Height` : Displacement
  - `Emission` : Émissive
  - `Alpha` : Transparence

### Vignettes (thumbs)
- **Pattern** : `Color_<CODE>_thumb.ext`
- **Exemple** : `Color_F001_thumb.jpg`
- **Formats** : jpg, png, webp
- **Usage** : Affichées dans les boutons de sélection de l'UI

---

## Dépannage

### Le format n'est pas détecté correctement
✅ Vérifiez que vos fichiers suivent le pattern `Color_XXX_YYY.ext`  
✅ Le code doit être EXACTEMENT 1 lettre + 3 chiffres (ex: F001, pas F1 ou F0001)  
✅ Relancez la génération avec `--write`

### Les codes ne s'affichent pas dans l'ordre
✅ Les codes sont automatiquement triés par ordre alphabétique  
✅ Pour un ordre personnalisé, éditez manuellement le fichier `index.json`

### Un dossier n'est pas généré
✅ Vérifiez que le dossier contient bien des fichiers images (.jpg, .png, etc.)  
✅ Vérifiez les permissions du dossier

---

## Référence complète

### Fichier : `BACKOFFICE/scripts/generate-index.js`
Contient toutes les fonctions de génération :
- `texturesTemplate()` : Format textures avec tableau `codes`
- `productTemplate()` : Format niveau produit
- `genericTemplate()` : Format générique
- `generateForDir()` : Logique de détection et sélection du template

### Tests
- `BACKOFFICE/tests/test-texture-format.js` : Test de lecture des formats
- Les tests d'intégration sont disponibles dans `BACKOFFICE/tests/`

---

**Dernière mise à jour** : 19 décembre 2025  
**Auteur** : Tech4Art Conseil
