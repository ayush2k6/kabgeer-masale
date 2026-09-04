const fs = require('fs');
const dishesDir = 'public/assets/dishes';
const files = fs.readdirSync(dishesDir);
let code = fs.readFileSync('src/data/products.js', 'utf8');

files.forEach(file => {
    let base = file.replace(/\.[^/.]+$/, ''); 
    let nameRegex = new RegExp("name:\\s*['\"]" + base.replace(/ /g, '.*') + ".*['\"]", 'i');
    let match = code.match(nameRegex);
    if (match) {
        let nameStr = match[0];
        let idx = code.indexOf(nameStr);
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
        
        if (blockStart !== -1 && blockEnd !== -1) {
            let block = code.substring(blockStart, blockEnd);
            if (!block.includes('dishImage:')) {
                let insertPos = block.indexOf('image:');
                if (insertPos !== -1) {
                    block = block.substring(0, insertPos) + `dishImage: '/assets/dishes/${file}',\n    ` + block.substring(insertPos);
                    code = code.substring(0, blockStart) + block + code.substring(blockEnd);
                    console.log(`Matched ${file} to ${nameStr}`);
                }
            }
        }
    } else {
        console.log(`Could not match ${file}`);
    }
});
fs.writeFileSync('src/data/products.js', code);
