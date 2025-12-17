import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { generateIndexes } from '../scripts/generate-index.js';

async function setupSample(root) {
  const g = path.join(root, 'GammeA');
  const p = path.join(g, 'ProduitX');
  const c = path.join(p, 'Composante1');
  const s = path.join(c, 'Couleurs');
  await fs.mkdir(s, { recursive: true });
  await fs.writeFile(path.join(s, 'rouge.jpg'), 'data');
  await fs.writeFile(path.join(s, 'bleu.jpg'), 'data');
}

(async function run() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cfg-abs-'));
  console.log('Using absolute tmp dir:', tmp);
  await setupSample(tmp);

  const results = await generateIndexes(tmp, { write: false, returnContent: true });

  const idxG = results.get(path.join(tmp, 'GammeA'));
  const idxP = results.get(path.join(tmp, 'GammeA', 'ProduitX'));
  const idxC = results.get(path.join(tmp, 'GammeA', 'ProduitX', 'Composante1'));
  const idxS = results.get(path.join(tmp, 'GammeA', 'ProduitX', 'Composante1', 'Couleurs'));

  console.assert(idxG && Array.isArray(idxG.items), 'Gamme index should have items');
  console.assert(idxP && Array.isArray(idxP.items), 'Produit index should have items');
  console.assert(idxC && Array.isArray(idxC.items), 'Composante index should have items');
  console.assert(idxS && idxS.items.length === 2, 'Couleurs should list 2 codes');

  console.log('Absolute-root test passed.');
})();