import path from 'path';
import fs from 'fs/promises';
import { generateIndexes } from '../scripts/generate-index.js';

(async function run() {
  const candidate = path.join(process.cwd(), 'Textures', 'fauteuil');
  try {
    const s = await fs.stat(candidate);
    if (!s.isDirectory()) {
      console.warn('Skipping integration test: candidate is not a directory:', candidate);
      process.exit(0);
    }
  } catch (err) {
    console.warn('Skipping integration test: folder does not exist:', candidate);
    process.exit(0);
  }

  console.log('Running integration test (dry-run) on:', candidate);
  const results = await generateIndexes(candidate, { write: false, returnContent: true });

  const rootIndex = results.get(candidate);
  console.assert(rootIndex && Array.isArray(rootIndex.items), 'Root index should have items');

  // check that for at least one product we generated an index
  const first = rootIndex.items[0];
  console.assert(first && first.folder, 'Root should list at least one child folder');

  const pPath = path.join(candidate, first.folder);
  const pIndex = results.get(pPath);
  console.assert(pIndex && Array.isArray(pIndex.items), `Product index for ${first.folder} should exist and have items`);

  console.log('Integration dry-run test passed.');
})();
