const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const publicDir = 'c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/public/assets/products';
const dirs = fs.readdirSync(publicDir).filter(d => fs.statSync(path.join(publicDir, d)).isDirectory());

async function createMontages() {
    const batchSize = 6;
    let montageIndex = 1;
    
    for (let i = 0; i < dirs.length; i += batchSize) {
        const batchDirs = dirs.slice(i, i + batchSize);
        
        const canvasW = 10 * 200;
        const canvasH = batchSize * 250; 
        
        const canvas = new Jimp({ width: canvasW, height: canvasH, color: 0xffffffff });
        const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

        for (let row = 0; row < batchDirs.length; row++) {
            const dir = batchDirs[row];
            const y = row * 250;
            
            canvas.print(font, 10, y + 5, dir);
            
            const files = fs.readdirSync(path.join(publicDir, dir)).filter(f => f.match(/\.(png|jpe?g)$/i));
            
            for (let col = 0; col < files.length; col++) {
                const f = files[col];
                const x = col * 200;
                
                try {
                    const img = await Jimp.read(path.join(publicDir, dir, f));
                    img.scaleToFit(180, 180);
                    canvas.composite(img, x + 10, y + 30);
                    canvas.print(font, x + 10, y + 215, f.substring(0, 20));
                } catch (e) {
                    console.error("Error reading", f);
                }
            }
        }
        
        const outPath = `c:/Users/Admin/.gemini/antigravity-ide/scratch/kabgeer-masale/montage_${montageIndex}.jpg`;
        await canvas.writeAsync(outPath);
        console.log(`Saved ${outPath}`);
        montageIndex++;
    }
}

createMontages().catch(console.error);
