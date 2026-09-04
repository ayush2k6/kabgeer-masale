import fs from 'fs';

let content = fs.readFileSync('src/data/products.js', 'utf-8');

const mapping = {
  'mutton-stew': 'mutton stew masala cover.jpg',
  'chicken-korma': 'chicken korma masala cover.jpg',
  'mutton-nihari': 'mutton nihari masala cover.jpg',
  'galauti-kebab': 'galauti kebab masala cover.jpg',
  'shami-kebab': 'shami kebab masala cover.jpg',
  'veg-tandoori': 'veg tandoori masala cover.jpg',
  'non-veg-tandoori': 'non veg tandoori masala cover.jpg',
  'garlic-powder': 'garlic powder cover.jpg',
  'kadhai-paneer': 'kadhai paneer masala cover.jpg',
  'kitchen-king': 'kitchen king masala cover.jpg',
  'pav-bhaji': 'pav bhaji masala cover.jpg',
  'red-chilli': 'red chilli powder cover.jpg',
  'kashmiri-lal-mirch': 'kashmiri lal mirch cover.jpg',
  'sambhar': 'sambhar masala cover.jpg'
};

for (const [id, filename] of Object.entries(mapping)) {
  const newPath = `/assets/mockups/${filename}`;
  // Regex matches: id: 'mutton-stew' ... image: ...
  const regex = new RegExp(`(id:\\s*['"]${id}['"][\\s\\S]*?image:\\s*)(?:['"][^'"]*['"]|selectedCover\\d+)`, 'g');
  if (content.match(regex)) {
      content = content.replace(regex, `$1"${newPath}"`);
      console.log(`Updated ${id}`);
  } else {
      console.log(`Could not find image field for ${id}`);
  }
}

fs.writeFileSync('src/data/products.js', content);
console.log('Update complete.');
