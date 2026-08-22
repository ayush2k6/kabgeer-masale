import fs from 'fs';
import path from 'path';

const productsFile = 'c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/src/data/products.js';
let content = fs.readFileSync(productsFile, 'utf-8');

const publicDir = 'c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/public/assets/products';

const regex = /image:\s*["'](\/assets\/products\/([^/]+)\/[^"']+)["'][^]*?(?=\s*category:)/g;

content = content.replace(regex, (match, firstImagePath, dirName) => {
    if (dirName === '1. Mutton Stew') return match; // Already perfect

    const dirPath = path.join(publicDir, dirName);
    if (!fs.existsSync(dirPath)) return match;

    const files = fs.readdirSync(dirPath).filter(f => f.match(/\.(png|jpe?g)$/i));
    if (files.length === 0) return match;

    const fileStats = files.map(f => {
        return { name: f, size: fs.statSync(path.join(dirPath, f)).size };
    });

    let assigned = new Set();
    const result = new Array(7).fill(null);

    // 1. Box
    let box = fileStats.find(f => f.name.match(/^[2-9]\d\.(png|jpe?g)$/i));
    if (!box) box = fileStats.find(f => f.name.match(/^1\.(png|jpe?g)$/i));
    if (!box) box = [...fileStats].sort((a,b)=>b.size - a.size)[0];
    if (box) { result[0] = box.name; assigned.add(box.name); }

    // 6. Ingredients Banner (~125KB)
    let banner = [...fileStats].filter(f => !assigned.has(f.name)).sort((a,b) => Math.abs(a.size - 125000) - Math.abs(b.size - 125000))[0];
    if (banner && Math.abs(banner.size - 125000) < 50000) { result[5] = banner.name; assigned.add(banner.name); }

    // 4. Icons (~2.5MB PNG)
    let icons = [...fileStats].filter(f => !assigned.has(f.name) && f.name.endsWith('.png')).sort((a,b) => Math.abs(a.size - 2500000) - Math.abs(b.size - 2500000))[0];
    if (icons && icons.size > 1800000) { result[3] = icons.name; assigned.add(icons.name); }

    // 3. Checklist (~1.2MB PNG)
    let checklist = [...fileStats].filter(f => !assigned.has(f.name) && f.name.endsWith('.png')).sort((a,b) => Math.abs(a.size - 1200000) - Math.abs(b.size - 1200000))[0];
    if (checklist && checklist.size > 800000) { result[2] = checklist.name; assigned.add(checklist.name); }

    // 5. Cooking Woman (name 'cooking' or ~800KB JPG)
    let cooking = fileStats.find(f => !assigned.has(f.name) && f.name.toLowerCase().includes('cooking'));
    if (!cooking) cooking = [...fileStats].filter(f => !assigned.has(f.name) && f.name.endsWith('.jpg')).sort((a,b) => Math.abs(a.size - 800000) - Math.abs(b.size - 800000))[0];
    if (cooking) { result[4] = cooking.name; assigned.add(cooking.name); }

    // 2. Dish (~700KB JPG)
    let dish = [...fileStats].filter(f => !assigned.has(f.name)).sort((a,b) => Math.abs(a.size - 700000) - Math.abs(b.size - 700000))[0];
    if (dish) { result[1] = dish.name; assigned.add(dish.name); }

    // 7. Chef's Tip (~600KB JPG)
    let tip = [...fileStats].filter(f => !assigned.has(f.name)).sort((a,b) => Math.abs(a.size - 600000) - Math.abs(b.size - 600000))[0];
    if (tip) { result[6] = tip.name; assigned.add(tip.name); }

    // Fill any nulls with remaining files
    let remaining = fileStats.filter(f => !assigned.has(f.name)).map(f => f.name);
    for (let i = 0; i < result.length; i++) {
        if (!result[i] && remaining.length > 0) {
            result[i] = remaining.shift();
        }
    }

    // Combine with any extra files at the end
    const finalOrder = [...result.filter(Boolean), ...remaining];

    const imageStr = `image: "/assets/products/${dirName}/${finalOrder[0]}",\n`;
    const imagesArrayStr = `    images: [\n` + finalOrder.map(f => `      "/assets/products/${dirName}/${f}"`).join(',\n') + `\n    ],\n`;
    
    // According to ProductPage.jsx infoImages mapping:
    // infoImages[0] -> Authentic Blend (Ingredients Banner) => index 5
    // infoImages[1] -> How To Use (Dish) => index 1
    // infoImages[2] -> Features (Checklist) => index 2
    let infoImages = [];
    if (finalOrder[5]) infoImages.push(finalOrder[5]);
    if (finalOrder[1]) infoImages.push(finalOrder[1]);
    if (finalOrder[2]) infoImages.push(finalOrder[2]);

    // Fallback if missing
    while (infoImages.length < 3 && finalOrder.length > infoImages.length) {
        let f = finalOrder.find(f => !infoImages.includes(f));
        if (f) infoImages.push(f);
    }

    const infoImagesArrayStr = `    infoImages: [\n` + infoImages.map(f => `      "/assets/products/${dirName}/${f}"`).join(',\n') + `\n    ],\n`;

    return imageStr + imagesArrayStr + infoImagesArrayStr;
});

fs.writeFileSync(productsFile, content);
console.log('Successfully reordered images based on templates sizes!');
