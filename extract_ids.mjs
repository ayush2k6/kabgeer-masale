import fs from 'fs';

const content = fs.readFileSync('src/data/products.js', 'utf-8');
const regex = /id:\s*['"]([^'"]+)['"]/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(match[1]);
}
