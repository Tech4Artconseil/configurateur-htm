import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { root: 'Textures', write: false, force: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--root' && args[i + 1]) { out.root = args[++i]; }
    else if (a === '--write') { out.write = true; }
    else if (a === '--force') { out.force = true; }
  }
  return out;
}

// Resolve a provided root path by trying multiple candidates:
// 1) if absolute -> use as-is
// 2) resolved relative to current working dir
// 3) walk up parent directories and try joining the provided root
// Returns the first existing path found, or the initial resolution (may not exist)
export async function resolveRootPath(root) {
  if (!root) return path.resolve('Textures');
  if (path.isAbsolute(root)) return root;

  // candidate relative to current working directory
  const first = path.resolve(root);
  try { await fs.stat(first); return first; } catch (err) { /* not found */ }

  // walk up parent directories to find the folder
  let dir = process.cwd();
  const rootParse = path.parse(dir);
  while (true) {
    const cand = path.join(dir, root);
    try { await fs.stat(cand);
      console.log(`Resolved root '${root}' to '${cand}' by searching parents.`);
      return cand;
    } catch (err) { /* continue */ }
    if (dir === rootParse.root) break;
    dir = path.dirname(dir);
  }

  // fallback to first attempt (may not exist)
  return first;
}

async function listDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).map(d => d.name);
  const files = entries.filter(e => e.isFile()).map(f => f.name);
  return { dirs, files };
}

function productTemplate(childDirs) {
  return {
    "_comment": "CONFIGURATEUR 3D - Index niveau PRODUIT",
    "_help": {
      "role": "Liste les dossiers additionnels à charger automatiquement (non inclus dans productParts)",
      "format": "Array d'objets avec: folder (nom dossier), displayName (affichage), defaultCode (code par défaut)",
      "exemple": "Pour ajouter un dossier 'Accessoire': {folder: 'Accessoire', displayName: 'Options Accessoires', defaultCode: 'ACC001'}",
      "contraintes": "Le dossier doit exister et contenir un index.json avec codes",
      "impact": "Les textures seront appliquées aux matériaux GLB portant le même nom que 'folder'"
    },
    "items": childDirs.map(d => ({ folder: d, displayName: `Options ${d}`, defaultCode: 'X001' }))
  };
}

function genericTemplate(items) {
  return {
    "_comment": "CONFIGURATEUR - Index auto-généré",
    "_help": { "role": "Index auto-généré - à adapter manuellement si besoin" },
    "items": items
  };
}

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

async function generateForDir(dirPath, depthFromRoot, options) {
  const { dirs, files } = await listDir(dirPath);
  let content = null;

  // Détecter si c'est un dossier de texture sets (pattern Color_XXX_Channel)
  const textureFiles = files.filter(f => /\.(png|jpg|jpeg|exr|hdr)$/i.test(f));
  const baseNames = textureFiles.map(f => path.parse(f).name);
  const hasImages = textureFiles.length > 0;
  //const colorPattern = /^Color_([A-Z]\d{3})_/i;
  const colorCodes = new Set();
  const isLeafTextureFolder = hasImages
  let isTextureSetFolder = false;
  if (isLeafTextureFolder) {isTextureSetFolder = true;}
  
  

  if (isTextureSetFolder) {
    const partName = path.basename(dirPath);
    const colorCodes = new Set();
    
    // Extraire les codes depuis les noms d'images (préfixe avant dernier underscore)
    for (const name of baseNames) {
      const idx = name.lastIndexOf('_');
      if (idx > 0) {
        // Prendre tout ce qui est avant le dernier underscore
        // Ex: "bois_blanc_Albedo" → "bois_blanc"
        const prefix = name.slice(0, idx);
        colorCodes.add(prefix);
      } else {
        // Pas d'underscore, prendre le nom complet
        colorCodes.add(name);
      }
    }
    // Convertir le Set en Array et trier
    const codes = Array.from(colorCodes).sort();
    content = texturesTemplate(codes, partName);

  } else if (depthFromRoot === 1) {
    // Produits niveau → use product template
    content = productTemplate(dirs);
  } else if (dirs.length > 0) {
    // Folder with children → list child folders
    content = genericTemplate(dirs.map(d => ({ folder: d, displayName: d })));
  } else {
    // Autre type de dossier → garder le comportement générique
    const prefixes = baseNames.map(n => {
      const idx = n.lastIndexOf('_');
      return idx > 0 ? n.slice(0, idx) : n;
    });
    const codes = [...new Set(prefixes)];
    content = genericTemplate(codes.map(c => ({ code: c })));
  }

  const outPath = path.join(dirPath, 'index.json');
  if (options.write) {
    const pretty = JSON.stringify(content, null, 2) + os.EOL;
    await fs.writeFile(outPath, pretty, { encoding: 'utf8' });
    console.log(`WROTE: ${outPath}`);
  } else {
    console.log(`DRY: ${outPath}`);
    console.log(JSON.stringify(content, null, 2));
  }

  // return generated content for tests / callers
  return content;
}

export async function generateIndexes(rootDir, options = { write: false, force: false, returnContent: false }) {
  const absRoot = path.resolve(rootDir);
  const results = new Map();

  async function walk(dir, depth) {
    const content = await generateForDir(dir, depth, options);
    if (options.returnContent) results.set(dir, content);

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) await walk(path.join(dir, e.name), depth + 1);
    }
  }

  await walk(absRoot, 0);

  if (options.returnContent) return results;
  return undefined;
}

const scriptPath = fileURLToPath(import.meta.url);
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(scriptPath);
const isNpmRun = Boolean(process.env.npm_lifecycle_event);

if (isDirectRun || isNpmRun) {
  const argv = parseArgs();
  (async () => {
    try {
      const resolvedRoot = await resolveRootPath(argv.root);
      if (!resolvedRoot) throw new Error(`Could not resolve root path: ${argv.root}`);
      await generateIndexes(resolvedRoot, { write: argv.write, force: argv.force });
      console.log('Done.');
    } catch (err) {
      console.error('Error:', err);
      process.exit(1);
    }
  })();
} else {
  // Module importé : rien à exécuter automatiquement
}
