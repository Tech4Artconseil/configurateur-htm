/**
 * Test pour vérifier la lecture du nouveau format texturesTemplate
 * Vérifie que le code peut lire à la fois :
 * - Le nouveau format avec tableau "codes": ["F001", "F002"]
 * - L'ancien format avec "items": [{"code": "F001"}]
 */

import fs from 'fs/promises';
import path from 'path';

async function testReadTexturesFormat() {
  console.log('=== Test de lecture du format textures ===\n');
  
  const testCases = [
    {
      name: 'Format nouveau (codes array)',
      path: '../Textures/fauteuil/Assise/index.json',
      expectedFormat: 'codes'
    },
    {
      name: 'Format ancien (items array)',
      path: '../Textures/shineo/SHINEO_bois/Pied_bois/index.json',
      expectedFormat: 'items'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`Fichier: ${testCase.path}`);
    
    try {
      const content = await fs.readFile(path.join(import.meta.dirname, testCase.path), 'utf8');
      const data = JSON.parse(content);
      
      if (testCase.expectedFormat === 'codes') {
        if (Array.isArray(data.codes)) {
          console.log(`✓ Format "codes" détecté: ${data.codes.join(', ')}`);
        } else {
          console.log(`✗ ERREUR: Format "codes" attendu mais non trouvé`);
        }
      } else if (testCase.expectedFormat === 'items') {
        if (Array.isArray(data.items)) {
          const codes = data.items.map(item => item.code || item.folder || item);
          console.log(`✓ Format "items" détecté: ${codes.join(', ')}`);
        } else {
          console.log(`✗ ERREUR: Format "items" attendu mais non trouvé`);
        }
      }
      
    } catch (error) {
      console.log(`✗ ERREUR: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('=== Fin des tests ===');
}

testReadTexturesFormat();
