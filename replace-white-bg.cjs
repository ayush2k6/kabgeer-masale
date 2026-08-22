const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.css')) {
      results.push(file);
    }
  });
  return results;
}

const cssFiles = walk('src');
let count = 0;

cssFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace background-color: #fff, #ffffff, white
  let newContent = content.replace(/background(-color)?:\s*(#fff|#ffffff|white)\b/ig, 'background$1: var(--color-bg)');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log('Updated ' + file);
    count++;
  }
});

console.log('Total files updated: ' + count);
