# Changelog - Configurateur 3D

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.0] - 2025-11-28

### Ajouté
- **Configurateur 3D interactif** avec moteur Three.js r167
- **Support formats GLB/GLTF** avec compression DRACO automatique
- **Système PBR complet** : Albedo, Normal, Metallic, Roughness, Occlusion, Emission, Height
- **Modes de rendu** : Lit (éclairage dynamique) et Unlit (textures bakées)
- **Environment maps HDR/EXR** pour éclairage réaliste 360°
- **Interface dynamique** : génération automatique des boutons couleur selon `productParts`
- **Labels circulaires SVG** autour des boutons avec compatibilité cross-browser
- **Chargement intelligent** : stratégies DOM/Canvas, fallback automatique, cache mémoire
- **Structure index.json** pour optimisation des requêtes et métadonnées
- **Overlay de chargement** avec barre de progression et messages contextuels
- **Détection navigateur** automatique (Chrome, Firefox, Safari, Edge) pour optimisations
- **Vignettes serveur** : recherche automatique des thumbnails (`*_thumb.*`, `*_Swatch.*`)
- **Configuration avancée** : 30+ variables ajustables (tone mapping, color space, UV, etc.)
- **Panneau preview textures** optionnel pour debug
- **Panneau texte gauche** pour informations/aide (support Markdown)
- **API exposée** : fonctions `window.setTexture*()`, `window.setCircularLabel*()`

### Technique
- **Architecture modulaire** JavaScript ES6+ sans framework
- **Optimisations GPU** : rendu 60fps, calculs parallélisés
- **Gestion couleurs** précise (sRGB/Linear, tone mapping ACES)
- **Robustesse** : fallbacks, validation assets, gestion erreurs réseau
- **Cross-platform** : compatible desktop/mobile, tous navigateurs modernes
- **Zero-dependency** : fonctionnement autonome via CDN

### Documentation
- **README complet** : installation, configuration, API, variables
- **Section aide** : commandes PowerShell, diagnostics, bonnes pratiques
- **Résumé technique** pour présentation client
- **Licence propriétaire** Tech4Art Conseil

---

## Format des versions

- **MAJOR** (X.0.0) : Changements incompatibles de l'API
- **MINOR** (1.X.0) : Nouvelles fonctionnalités rétrocompatibles  
- **PATCH** (1.0.X) : Corrections de bugs rétrocompatibles

## Types de changements

- **Ajouté** : Nouvelles fonctionnalités
- **Modifié** : Changements dans les fonctionnalités existantes
- **Déprécié** : Fonctionnalités bientôt supprimées
- **Supprimé** : Fonctionnalités supprimées
- **Corrigé** : Corrections de bugs
- **Sécurité** : Corrections de vulnérabilités