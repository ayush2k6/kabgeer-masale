import fs from 'fs';
import path from 'path';

const productsFile = 'src/data/products.js';
let content = fs.readFileSync(productsFile, 'utf8');

// 1. Remove all old coverImg imports
content = content.replace(/import coverImg\d+ from '\.\.\/assets\/products\/[^']+';\n/g, '');
content = content.replace(/import selectedCover\d+ from '\.\.\/assets\/[^']+';\n/g, ''); // just in case

// 2. Read public/assets/products to revert `image` field to original string
const regex = /image:\s*(?:"[^"]+"|[\w]+),\s*images:\s*\[\s*["'](\/assets\/products\/([^/]+)\/[^"']+)["']/g;
content = content.replace(regex, (match, firstImagePath, dirName) => {
    return `image: "${firstImagePath}",\n    images: [\n      "${firstImagePath}"`;
});

// 3. Find the new cover images in src/assets
const assetsDir = 'src/assets';
const files = fs.readdirSync(assetsDir);
const coverFiles = files.filter(f => f.toLowerCase().includes('cover') && fs.statSync(path.join(assetsDir, f)).isFile());

let imports = '';
coverFiles.forEach((cf, index) => {
  const varName = `selectedCover${index}`;
  imports += `import ${varName} from '../assets/${cf}';\n`;
});

// 4. Apply the new covers to the specific products
const updateRegex = /name:\s*'([^']+)',[\s\S]*?image:\s*(?:"[^"]+"|[\w]+)/g;

content = content.replace(updateRegex, (match, name) => {
  const nameLower = name.toLowerCase().replace('-', ' ').replace('kebab', '');
  
  let matchedCoverIndex = -1;
  if (name.includes('Awadhi Tikka Boti Kebab Masala')) {
      matchedCoverIndex = coverFiles.findIndex(cf => cf.includes('awadhi tikka boti masala'));
  } else {
      matchedCoverIndex = coverFiles.findIndex(cf => {
          const nameWords = nameLower.replace(/masala|powder/g, '').trim().split(/\s+/);
          return nameWords.every(word => cf.toLowerCase().includes(word));
      });
  }

  if (matchedCoverIndex !== -1) {
    const varName = `selectedCover${matchedCoverIndex}`;
    console.log(`Updating ${name} to use ${coverFiles[matchedCoverIndex]}`);
    return match.replace(/image:\s*(?:"[^"]+"|[\w]+)/, `image: ${varName}`);
  }
  
  return match;
});

const finalContent = imports + '\n' + content;
fs.writeFileSync(productsFile, finalContent);
console.log("Done");
