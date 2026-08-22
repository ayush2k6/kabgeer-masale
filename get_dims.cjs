const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');

const baseDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\scratch\\kabgeer-masale\\public\\assets\\products';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else {
            if (file.match(/\.(jpg|jpeg|png)$/i)) {
                try {
                    const dimensions = sizeOf(file);
                    results.push({
                        folder: path.basename(path.dirname(file)),
                        filename: path.basename(file),
                        width: dimensions.width,
                        height: dimensions.height,
                        ratio: (dimensions.width / dimensions.height).toFixed(2),
                        size: stat.size
                    });
                } catch (e) {}
            }
        }
    });
    return results;
}

const allImages = walkDir(baseDir);
const byProduct = {};

for (const img of allImages) {
   if (!byProduct[img.folder]) byProduct[img.folder] = [];
   byProduct[img.folder].push(img);
}

// Find common dimensions for Mutton Stew front.png and Mutton Nihari 8.png
let boxWidth, boxHeight;
const stew = byProduct['1. Mutton Stew'].find(i => i.filename === 'front.png');
const nihari = byProduct['3. Mutton Nihari Masala'].find(i => i.filename === '8.png');

console.log('Mutton Stew front.png: ', stew.width, 'x', stew.height, 'ratio:', stew.ratio);
console.log('Mutton Nihari 8.png: ', nihari.width, 'x', nihari.height, 'ratio:', nihari.ratio);

const mappings = {};
for (const folder in byProduct) {
   // find image that has same ratio as stew/nihari
   let candidates = byProduct[folder].filter(i => Math.abs(i.ratio - stew.ratio) < 0.1);
   if (candidates.length === 0) candidates = byProduct[folder]; // fallback
   
   // Sort by closeness to stew width
   candidates.sort((a, b) => Math.abs(a.width - stew.width) - Math.abs(b.width - stew.width));
   
   mappings[folder] = candidates[0].filename;
}

fs.writeFileSync('dims.json', JSON.stringify(mappings, null, 2));
console.log('Done!');
