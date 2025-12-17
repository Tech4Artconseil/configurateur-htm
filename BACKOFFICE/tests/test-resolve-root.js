import { resolveRootPath } from '../scripts/generate-index.js';
import path from 'path';
import fs from 'fs/promises';

(async function run() {
  // This test will attempt to resolve a folder that exists at repo root: Textures/shineo
  const candidate = 'Textures/shineo';
  const resolved = await resolveRootPath(candidate);
  try {
    const s = await fs.stat(resolved);
    if (!s.isDirectory()) {
      console.error('Resolved path is not a directory:', resolved);
      process.exit(2);
    }
  } catch (err) {
    console.error('Could not resolve existing folder for candidate:', candidate, '->', resolved);
    process.exit(2);
  }
  console.log('resolveRootPath test passed:', resolved);
})();
