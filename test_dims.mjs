import sizeOf from 'image-size';
import fs from 'fs';
import path from 'path';

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
                        ratio: (dimensions.width / dimensions.height).toFixed(2)
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

// 3D boxes are tall. Width / Height should be less than 0.9.
// But some might have white padding? Wait, let's just find the minimum width/height ratio in each folder!
// The 3D box usually has the smallest width/height ratio because it is a tall portrait image.

const mappings = {};
for (const folder in byProduct) {
   const images = byProduct[folder];
   images.sort((a, b) => parseFloat(a.ratio) - parseFloat(b.ratio));
   
   // The image with the smallest ratio is most likely the tall 3D box.
   // But wait, the 3D box for Mutton Nihari Masala was 8.png (ratio: 0.88, width: 2500, height: 2840 roughly)
   // Let's just output the sorted list of ratios to see!
   mappings[folder] = images.map(i => `${i.filename} (${i.ratio})`);
}

fs.writeFileSync('dims.json', JSON.stringify(mappings, null, 2));
console.log("Done");
