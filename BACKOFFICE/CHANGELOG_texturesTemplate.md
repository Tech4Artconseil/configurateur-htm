# Modification texturesTemplate - Décembre 2025

## Objectif
Modifier la fonction `texturesTemplate()` dans `generate-index.js` pour générer un format JSON conforme et fonctionnel pour les dossiers de textures contenant des sets de couleurs.

## Problème initial
L'ancien format générait :
```json
{
  "items": [
    { "code": "F001" },
    { "code": "F002" }
  ]
}
```

Ce format avec tableau d'objets n'était pas fonctionnel pour le code de chargement des textures dans `app.js`.

## Solution implémentée
Création d'une fonction `texturesTemplate()` dédiée qui génère :
```json
{
  "_comment": "CONFIGURATEUR 3D - Index niveau PARTIE (Assise)",
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

## Détails techniques

### 1. Nouvelle fonction `texturesTemplate()`
```javascript
function texturesTemplate(codes, partName = "PARTIE") {
  return {
    "_comment": `CONFIGURATEUR 3D - Index niveau PARTIE (${partName})`,
    "_help": {
      "role": "Liste les codes matériaux disponibles pour cette partie configurable",
      "format": "Array de codes alphanumériques (1 lettre + 3 chiffres). Ordre = ordre d'affichage dans l'UI",
      "exemple": "Ajouter nouveau tissu: 'F005' (nécessite fichiers Color_F005_Albedo.jpg, etc.)",
      "contraintes": "Chaque code doit avoir ses fichiers textures correspondants dans ce dossier",
      "impact": "Premier code = sélection par défaut au démarrage. Génère les boutons couleur dans l'interface",
      "fichiers_requis": "Color_<CODE>_Albedo.jpg, Color_<CODE>_NormalGL.png, etc. selon textureChannels activés"
    },
    "codes": codes
  };
}
```

### 2. Détection intelligente des dossiers de texture sets
La fonction `generateForDir()` détecte automatiquement si un dossier contient des texture sets en cherchant le pattern `Color_XXX_` dans les noms de fichiers.

**Pattern utilisé** : `/^Color_([A-Z]\d{3})_/i`
- Exemple de fichiers détectés : `Color_F001_Albedo.jpg`, `Color_W002_NormalGL.png`, etc.
- Les codes sont extraits, dédupliqués, triés et passés à `texturesTemplate()`

### 3. Logique de sélection du template
L'ordre de priorité dans `generateForDir()` :

1. **Dossier de texture sets (prioritaire)** → `texturesTemplate()` 
   - Si des fichiers suivant le pattern `Color_XXX_` sont détectés
   - Génère un tableau simple `"codes": ["F001", "F002"]`

2. **Niveau produit (depthFromRoot === 1)** → `productTemplate()`
   - Pour les dossiers au premier niveau (ex: `Textures/fauteuil/`)

3. **Dossier avec sous-dossiers** → `genericTemplate()`
   - Pour les dossiers intermédiaires avec enfants

4. **Autre cas** → `genericTemplate()`
   - Pour les autres types de fichiers (environnement, etc.)

## Résultat

### Dossiers de texture sets (Color_XXX_)
**Exemple** : `Textures/fauteuil/Assise/`
```json
{
  "_comment": "CONFIGURATEUR 3D - Index niveau PARTIE (Assise)",
  "_help": { ... },
  "codes": ["F001", "F002", "F003", "F004"]
}
```

### Autres dossiers (sans pattern Color_)
**Exemple** : `Textures/shineo/SHINEO_bois/Pied_bois/`
```json
{
  "_comment": "CONFIGURATEUR - Index auto-généré",
  "_help": { ... },
  "items": [
    { "code": "bois_blanc" },
    { "code": "bois_Noir" }
  ]
}
```

## Tests effectués

✅ `Textures/fauteuil/Assise/` → Format `codes` array
✅ `Textures/fauteuil/Pied/` → Format `codes` array  
✅ `Textures/shineo/SHINEO_bois/Pied_bois/` → Format `items` array (pas de pattern Color_)
✅ Génération complète du dossier `Textures/` → 20 fichiers générés avec succès

## Commandes de génération

```bash
# Générer uniquement pour le produit fauteuil
npm run poc -- --root Textures/fauteuil --write

# Générer pour tout le dossier Textures
node scripts/generate-index.js --root Textures --write

# Mode preview (sans écriture)
node scripts/generate-index.js --root Textures/fauteuil
```

## Compatibilité
- ✅ Compatible avec le code existant dans `app.js`
- ✅ Les dossiers sans pattern Color_XXX conservent leur format d'origine
- ✅ Documentation intégrée via `_help` pour faciliter la maintenance

## Auteur
Tech4Art Conseil - 19 décembre 2025
