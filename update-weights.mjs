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
        let weight = row['Product Weight / Size / Volume '].trim();
        let price = row['MRP '];

        // Ensure weight format is nice, e.g., "33g" instead of "33 grams"
        weight = weight.replace(/grams?/i, 'g').replace(/gram/i, 'g').replace(/ /g, '');

        // Match the product object in products.js based on name
        // Example: name: 'Mutton Stew Masala',
        // weight: '50g',
        // price: 79,
        
        // Escape special regex chars in name
        const nameRegex = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const regex = new RegExp(`(name:\\s*['"](?:Kabgeer\\s+)?${nameRegex}['"]\\s*,[\\s\\S]*?weight:\\s*['"])([^'"]+)(['"])`, 'i');
        
        content = content.replace(regex, (match, prefix, oldWeight, suffix) => {
            console.log(`Updated ${name}: ${oldWeight} -> ${weight}`);
            return prefix + weight + suffix;
        });
        
        // Update price
        const priceRegex = new RegExp(`(name:\\s*['"](?:Kabgeer\\s+)?${nameRegex}['"]\\s*,[\\s\\S]*?price:\\s*)(\\d+)`, 'i');
        content = content.replace(priceRegex, (match, prefix, oldPrice) => {
             if (oldPrice != price) {
                 console.log(`Updated Price ${name}: ${oldPrice} -> ${price}`);
             }
             return prefix + price;
        });
    }
});

// A few custom matching since names might differ slightly:
const customMappings = [
    { searchName: 'Chole Masale', matchName: 'Chole Masala' },
    { searchName: 'Shami Kebab Masala', matchName: 'Shami Kebab Masala' }
];

data.forEach(row => {
    if (row['Article Name ']) {
        let name = row['Article Name '].trim();
        let matchName = name;
        if (name === 'Chole Masala') matchName = 'Chole Masale'; // In products.js it is Chole Masale
        
        let weight = row['Product Weight / Size / Volume '].trim();
        let price = row['MRP '];

        weight = weight.replace(/grams?/i, 'g').replace(/gram/i, 'g').replace(/ /g, '');
        
        const nameRegex = matchName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const regex = new RegExp(`(name:\\s*['"](?:Kabgeer\\s+)?${nameRegex}['"]\\s*,[\\s\\S]*?weight:\\s*['"])([^'"]+)(['"])`, 'i');
        
        content = content.replace(regex, (match, prefix, oldWeight, suffix) => {
            return prefix + weight + suffix;
        });
        
        const priceRegex = new RegExp(`(name:\\s*['"](?:Kabgeer\\s+)?${nameRegex}['"]\\s*,[\\s\\S]*?price:\\s*)(\\d+)`, 'i');
        content = content.replace(priceRegex, (match, prefix, oldPrice) => {
             return prefix + price;
        });
    }
});

fs.writeFileSync(productsFile, content);
console.log('Finished updating products.js from excel');
