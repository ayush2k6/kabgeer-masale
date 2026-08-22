const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Admin\\OneDrive\\Desktop\\Kabgeer Masale\\SKU ARTWORK';
const destDir = 'c:\\Users\\Admin\\.gemini\\antigravity-ide\\scratch\\kabgeer-masale\\public\\assets\\products';

fs.readdirSync(srcDir, { withFileTypes: true }).forEach(dirent => {
    if (dirent.isDirectory()) {
        const productFolder = dirent.name;
        const srcProductDir = path.join(srcDir, productFolder);
        const destProductDir = path.join(destDir, productFolder);

        if (fs.existsSync(destProductDir)) {
            const files = fs.readdirSync(srcProductDir);
            files.forEach(file => {
                if (file.startsWith('1.')) {
                    fs.copyFileSync(path.join(srcProductDir, file), path.join(destProductDir, file));
                    console.log(`Copied ${file} for ${productFolder}`);
                }
            });
        }
    }
});
