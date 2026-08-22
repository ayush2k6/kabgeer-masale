import fs from 'fs';
import xlsx from 'xlsx';

const wb = xlsx.readFile('C:/Users/Admin/OneDrive/Desktop/Kabgeer Masale/amazon.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(ws);

const productsFile = 'src/data/products.js';
let content = fs.readFileSync(productsFile, 'utf-8');

data.forEach(row => {
    if (row['Article Name ']) {
        let name = row['Article Name '].trim();
        let matchName = name;
        if (name === 'Chole Masala') matchName = 'Chole Masale';
        
        let ingredients = row['Ingredients / Composition'];
        let howToUse = row['How To Use'];

        if (!ingredients && !howToUse) return;

        ingredients = ingredients ? ingredients.trim().replace(/"/g, '\\"') : '';
        howToUse = howToUse ? howToUse.trim().replace(/"/g, '\\"') : '';

        const nameRegex = matchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Remove existing ingredients and chefsTip if they exist
        const oldIngRegex = new RegExp(`ingredients:\\s*['"].*?['"],?\\s*`, 'gi');
        const oldTipRegex = new RegExp(`chefsTip:\\s*['"].*?['"],?\\s*`, 'gi');
        
        // Wait, removing globally is bad. We only want to remove within the specific product block.
        // It's safer to just find the product block first.
        const blockRegex = new RegExp(`({[^}]*name:\\s*['"](?:Kabgeer\\s+)?${nameRegex}['"][\\s\\S]*?)(category:)`, 'i');
        
        content = content.replace(blockRegex, (match, beforeCategory, categoryLabel) => {
            // Remove any existing ingredients/chefsTip from beforeCategory
            let cleanBefore = beforeCategory
                .replace(/ingredients:\s*['"][^'"]*['"],?\s*/g, '')
                .replace(/chefsTip:\s*['"][^'"]*['"],?\s*/g, '');
            
            let additions = '';
            if (ingredients) {
                additions += `    ingredients: "${ingredients}",\n`;
            }
            if (howToUse) {
                additions += `    chefsTip: "${howToUse}",\n`;
            }
            
            return cleanBefore + additions + '    ' + categoryLabel;
        });
        console.log(`Updated tips for ${name}`);
    }
});

fs.writeFileSync(productsFile, content);
console.log('Finished updating tips and ingredients');
