const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');

const baseDir = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\scratch\\kabgeer-masale\\public\\assets\\products';

console.log(sizeOf(path.join(baseDir, '1. Mutton Stew', 'front.png')));
console.log(sizeOf(path.join(baseDir, '2. Chicken Korma', '5.jpg')));
console.log(sizeOf(path.join(baseDir, '3. Mutton Nihari Masala', '8.png')));
