const fs = require('fs');
let data = fs.readFileSync('src/data/products.js', 'utf8');
data = data.replace(/"\/assets\//g, 'import.meta.env.BASE_URL + "assets/');
fs.writeFileSync('src/data/products.js', data);
