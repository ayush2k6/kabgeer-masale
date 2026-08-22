import fs from 'fs';
import path from 'path';

const productsFile = 'src/data/products.js';
let content = fs.readFileSync(productsFile, 'utf8');
const assetsDir = 'public/assets/products';

const files = fs.readdirSync(assetsDir);
const coverFiles = files.filter(f => f.toLowerCase().includes('cover'));

const regex = /name:\s*'([^']+)',[\s\S]*?image:\s*"([^"]+)"/g;

content = content.replace(regex, (match, name, image) => {
  // Try to find a cover image that matches the product name
  const nameLower = name.toLowerCase();
  
  // Find a cover file that roughly matches the product name
  const matchedCover = coverFiles.find(cf => {
    // Basic match: if all words in name are in the cover file name (ignoring 'masala' or 'powder' occasionally)
    const nameWords = nameLower.replace(/masala|powder/g, '').trim().split(/\s+/);
    return nameWords.every(word => cf.toLowerCase().includes(word));
  });

  if (matchedCover) {
    const newPath = `/assets/products/${matchedCover}`;
    if (image !== newPath) {
      console.log(`Updating ${name}: ${image} -> ${newPath}`);
      return match.replace(`image: "${image}"`, `image: "${newPath}"`);
    }
  } else {
    // check if image already has 'cover' in it
    if (!image.toLowerCase().includes('cover')) {
      console.log(`No cover found for ${name} (current: ${image})`);
    }
  }
  return match;
});

fs.writeFileSync(productsFile, content);
console.log("Done");
