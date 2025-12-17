import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { generateIndexes } from '../scripts/generate-index.js';

async function setupSample(root) {
  const d = path.join(root, 'Set');
  await fs.mkdir(d, { recursive: true });
  const files = [
    'Shadow_ground_Albedo.jpg',
    'Shadow_ground_Alpha.png',
    'Shadow_ground_Emission.jpg',
    'Shadow_ground_Metallic.jpg',
    'Shadow_ground_NormalGL.jpg',
    'Shadow_ground_Occlusion.jpg',
    'Shadow_ground_Roughness.jpg'
  ];
  for (const f of files) await fs.writeFile(path.join(d, f), 'x');
}

(async function run() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'cfg-tp-'));
  await setupSample(tmp);
  const results = await generateIndexes(tmp, { write: false, returnContent: true });
  const idx = results.get(path.join(tmp, 'Set'));
  if (!idx || !Array.isArray(idx.items)) {
    console.error('No index generated for texture set');
    process.exit(2);
  }
  const codes = idx.items.map(i => i.code).sort();
  console.log('Codes:', codes);
  console.assert(codes.length === 1 && codes[0] === 'Shadow', 'Expected single prefix "Shadow"');
  console.log('test-texture-prefix passed.');
})();