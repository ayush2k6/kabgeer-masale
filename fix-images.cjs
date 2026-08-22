const fs = require('fs');
const productsFile = 'src/data/products.js';
let content = fs.readFileSync(productsFile, 'utf8');

// Find all products and their image/images arrays
const regex = /image:\s*"[^"]+cover\.png",\s*images:\s*\[\s*"([^"]+)"/g;

content = content.replace(regex, (match, firstImage) => {
  return `image: "${firstImage}",\n    images: [\n      "${firstImage}"`;
});

fs.writeFileSync(productsFile, content);
console.log('Successfully reverted to high-res images in products.js');
