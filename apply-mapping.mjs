import fs from 'fs';

const mappingFile = 'c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/mapping.json';
const productsFile = 'c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/src/data/products.js';

const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf-8'));
let content = fs.readFileSync(productsFile, 'utf-8');

const regex = /image:\s*["'](\/assets\/products\/([^/]+)\/[^"']+)["'][^]*?(?=\s*category:)/g;

content = content.replace(regex, (match, firstImagePath, dirName) => {
    if (dirName === '1. Mutton Stew') return match;

    if (!mapping[dirName]) return match;

    const finalOrder = mapping[dirName];

    const imageStr = `image: "/assets/products/${dirName}/${finalOrder[0]}",\n`;
    const imagesArrayStr = `    images: [\n` + finalOrder.map(f => `      "/assets/products/${dirName}/${f}"`).join(',\n') + `\n    ],\n`;
    
    let infoImages = [];
    // Authentic Blend (Ingredients Banner) => index 5
    // How To Use (Dish) => index 1
    // Features (Checklist) => index 2
    if (finalOrder[5]) infoImages.push(finalOrder[5]);
    if (finalOrder[1]) infoImages.push(finalOrder[1]);
    if (finalOrder[2]) infoImages.push(finalOrder[2]);

    while (infoImages.length < 3 && finalOrder.length > infoImages.length) {
        let f = finalOrder.find(f => !infoImages.includes(f));
        if (f) infoImages.push(f);
    }

    const infoImagesArrayStr = `    infoImages: [\n` + infoImages.map(f => `      "/assets/products/${dirName}/${f}"`).join(',\n') + `\n    ],\n`;

    return imageStr + imagesArrayStr + infoImagesArrayStr;
});

fs.writeFileSync(productsFile, content);
console.log('Successfully applied visual mapping!');
