import fs from 'fs';

const productsFile = 'src/data/products.js';
let content = fs.readFileSync(productsFile, 'utf8');
const assetsDir = 'src/assets/products';

const files = fs.readdirSync(assetsDir);
const coverFiles = files.filter(f => f.toLowerCase().includes('cover'));

let imports = '';
let modifiedContent = content;

const regex = /name:\s*'([^']+)',[\s\S]*?image:\s*(?:"[^"]+"|[\w]+)/g;

coverFiles.forEach((cf, index) => {
  const varName = `coverImg${index}`;
  imports += `import ${varName} from '../assets/products/${cf}';\n`;
});

modifiedContent = modifiedContent.replace(regex, (match, name) => {
  const nameLower = name.toLowerCase().replace('-', ' ').replace('kebab', '');
  
  // Custom manual mappings for edge cases
  let matchedCoverIndex = -1;
  if (name.includes('Awadhi Tikka Boti Kebab Masala')) {
      matchedCoverIndex = coverFiles.findIndex(cf => cf.includes('awadhi tikka boti masala'));
  } else if (name === 'Veg Tandoori Masala') {
      matchedCoverIndex = coverFiles.findIndex(cf => cf === 'veg tandoori masala cover.png');
  } else if (name === 'Non-Veg Tandoori Masala') {
      matchedCoverIndex = coverFiles.findIndex(cf => cf === 'non veg tandoori masala cover.png');
  } else {
      matchedCoverIndex = coverFiles.findIndex(cf => {
          const nameWords = nameLower.replace(/masala|powder/g, '').trim().split(/\s+/);
          return nameWords.every(word => cf.toLowerCase().includes(word));
      });
  }

  if (matchedCoverIndex !== -1) {
    const varName = `coverImg${matchedCoverIndex}`;
    console.log(`Updating ${name} to use ${coverFiles[matchedCoverIndex]}`);
    return match.replace(/image:\s*(?:"[^"]+"|[\w]+)/, `image: ${varName}`);
  } else {
    console.log(`No cover found for ${name}`);
  }
  return match;
});

modifiedContent = modifiedContent.replace(/import coverImg\d+ from '\.\.\/assets\/products\/[^']+';\n/g, '');

const finalContent = imports + '\n' + modifiedContent;
fs.writeFileSync(productsFile, finalContent);
console.log("Done");
