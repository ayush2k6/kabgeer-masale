import fs from 'fs';
import path from 'path';

const publicDir = 'c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/public/assets/products';
const dirs = fs.readdirSync(publicDir).filter(d => fs.statSync(path.join(publicDir, d)).isDirectory());

let html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; background: #fff; }
        .product { margin-bottom: 50px; border-bottom: 2px solid #ccc; padding-bottom: 20px; }
        .gallery { display: flex; flex-wrap: wrap; gap: 20px; }
        .item { text-align: center; border: 1px solid #eee; padding: 10px; width: 200px; }
        .item img { max-width: 100%; max-height: 150px; }
        .filename { font-weight: bold; margin-top: 10px; font-size: 14px; }
    </style>
</head>
<body>
    <h1>Product Images Gallery</h1>
`;

for (const dir of dirs) {
    if (dir === '1. Mutton Stew') continue; // Already done

    html += `<div class="product">
        <h2>${dir}</h2>
        <div class="gallery">
    `;

    const files = fs.readdirSync(path.join(publicDir, dir)).filter(f => f.match(/\.(png|jpe?g)$/i));
    for (const f of files) {
        const src = `file:///${publicDir}/${dir}/${f}`.replace(/\\/g, '/');
        html += `
            <div class="item">
                <img src="${src}" />
                <div class="filename">${f}</div>
            </div>
        `;
    }

    html += `
        </div>
    </div>`;
}

html += `
</body>
</html>
`;

fs.writeFileSync('c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/gallery.html', html);
console.log('gallery.html generated');
