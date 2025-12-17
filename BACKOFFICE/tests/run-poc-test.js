import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { generateIndexes } from '../scripts/generate-index.js';

function parseArgs() {
  // Usage: node run-poc-test.js [rootFolder]
  const args = process.argv.slice(2);
  return { root: args[0] || null };
}

async function setupSample(root) {
  const g = path.join(root, 'GammeA');
  const p = path.join(g, 'ProduitX');
  const c = path.join(p, 'Composante1');
  const s = path.join(c, 'Couleurs');
  await fs.mkdir(s, { recursive: true });
  await fs.writeFile(path.join(s, 'rouge.jpg'), 'data');
  await fs.writeFile(path.join(s, 'bleu.jpg'), 'data');
}

async function run() {
  const { root } = parseArgs();
  let tmp = root;

  if (!root) {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cfg-'));
    console.log('Using tmp dir:', tmp);
    await setupSample(tmp);
  } else {
    tmp = path.resolve(root);
    try {
      const st = await fs.stat(tmp);
      if (!st.isDirectory()) {
        console.error(`Provided root is not a directory: ${tmp}`);
        process.exit(2);
      }
    } catch (err) {
      console.error(`Provided root does not exist: ${tmp}`);
      process.exit(2);
    }
    console.log('Using provided root dir:', tmp);
  }

  // write + return content so we can assert without reading files
  const results = await generateIndexes(tmp, { write: true, returnContent: true });

  const idxG = results.get(path.join(tmp, 'GammeA'));
  const idxP = results.get(path.join(tmp, 'GammeA', 'ProduitX'));
  const idxC = results.get(path.join(tmp, 'GammeA', 'ProduitX', 'Composante1'));
  const idxS = results.get(path.join(tmp, 'GammeA', 'ProduitX', 'Composante1', 'Couleurs'));

  console.assert(Array.isArray(idxG.items), 'Gamme index should have items');
  console.assert(Array.isArray(idxP.items), 'Produit index should have items');
  console.assert(Array.isArray(idxC.items), 'Composante index should have items');
  console.assert(idxS.items.length === 2, 'Couleurs should list 2 codes');

  console.log('POC test passed.');
}

run().catch(err => { console.error(err); process.exit(2); });
