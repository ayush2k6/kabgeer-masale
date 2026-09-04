const fs = require('fs');
let code = fs.readFileSync('src/data/products.js', 'utf8');

function addDishImage(productName, file) {
    let nameRegex = new RegExp("name:\\s*['\"]" + productName + "['\"]");
    let match = code.match(nameRegex);
    if (match) {
        let idx = match.index;
        let blockStart = code.lastIndexOf('{', idx);
        let blockEnd = -1;
        let braceCount = 0;
        for (let i = blockStart; i < code.length; i++) {
            if (code[i] === '{') braceCount++;
            if (code[i] === '}') braceCount--;
            if (braceCount === 0) {
                blockEnd = i + 1;
                break;
            }
        }
        
        let block = code.substring(blockStart, blockEnd);
        if (!block.includes('dishImage:')) {
            let insertPos = block.indexOf('image:');
            if (insertPos !== -1) {
                block = block.substring(0, insertPos) + `dishImage: '/assets/dishes/${file}',\n    ` + block.substring(insertPos);
                code = code.substring(0, blockStart) + block + code.substring(blockEnd);
                console.log(`Matched ${file} to ${productName}`);
            }
        }
    }
}

addDishImage('Chole Masale', 'chole bhature.webp');
addDishImage('Sambar Masala', 'sambhar.webp');
addDishImage('Veg Tandoori Masala', 'veg tandoori tikka.jpg');

fs.writeFileSync('src/data/products.js', code);
