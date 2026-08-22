const fs = require('fs');

const productsFile = 'src/data/products.js';
let content = fs.readFileSync(productsFile, 'utf8');

// The regex looks for `image: coverImgX,` followed by `images: [` and then captures the first string
const regex = /image:\s*coverImg\d+,\s*images:\s*\[\s*("[^"]+")/g;
content = content.replace(regex, (match, firstImage) => {
    return `image: ${firstImage},\n    images: [\n      ${firstImage}`;
});

// Remove coverImg imports
content = content.replace(/import coverImg\d+ from '\.\.\/assets\/products\/[^']+';\n/g, '');

fs.writeFileSync(productsFile, content);
console.log('Replaced successfully');
