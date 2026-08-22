import fs from 'fs';
import path from 'path';

const productsFile = 'c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/src/data/products.js';
let content = fs.readFileSync(productsFile, 'utf-8');

const regex = /image:\s*["'](\/assets\/products\/([^/]+)\/[^"']+)["'][^]*?(?=\s*category:)/g;

content = content.replace(regex, (match, firstImagePath, dirName) => {
    const publicDir = path.join('c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/public/assets/products', dirName);
    if (!fs.existsSync(publicDir)) {
        console.warn('Directory not found:', publicDir);
        return match;
    }

    const files = fs.readdirSync(publicDir).filter(f => f.match(/\.(png|jpe?g)$/i));
    
    files.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0);
        return numA - numB;
    });

    if (files.length === 0) {
        return match;
    }

    const imageStr = `image: "/assets/products/${dirName}/${files[0]}",\n`;
    const imagesArrayStr = `    images: [\n` + files.map(f => `      "/assets/products/${dirName}/${f}"`).join(',\n') + `\n    ],\n`;
    const infoImagesArrayStr = `    infoImages: [\n` + files.slice(0, 3).map(f => `      "/assets/products/${dirName}/${f}"`).join(',\n') + `\n    ],\n`;

    return imageStr + imagesArrayStr + infoImagesArrayStr;
});

fs.writeFileSync(productsFile, content);
console.log('Successfully updated products.js');
