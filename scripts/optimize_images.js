const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function optimizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const statBefore = fs.statSync(filePath).size;
  
  // Skip small files (< 50KB)
  if (statBefore < 50 * 1024) return 0;
  
  try {
    let buffer;
    if (ext === '.png') {
      // For PNGs, compress with pngquant-like settings at 80% quality
      buffer = await sharp(filePath)
        .png({ quality: 80, compressionLevel: 9, effort: 7 })
        .toBuffer();
    } else if (ext === '.jpg' || ext === '.jpeg') {
      buffer = await sharp(filePath)
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer();
    } else {
      return 0;
    }
    
    if (buffer && buffer.length < statBefore) {
      fs.writeFileSync(filePath, buffer);
      const saved = statBefore - buffer.length;
      console.log(`Optimized: ${filePath} | ${(statBefore / (1024*1024)).toFixed(2)}MB -> ${(buffer.length / (1024*1024)).toFixed(2)}MB (Saved ${Math.round((saved / statBefore) * 100)}%)`);
      return saved;
    }
  } catch (err) {
    console.error(`Error optimizing ${filePath}:`, err.message);
  }
  return 0;
}

async function processDirectory(dirPath) {
  let totalSaved = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      totalSaved += await processDirectory(fullPath);
    } else {
      totalSaved += await optimizeFile(fullPath);
    }
  }
  return totalSaved;
}

async function run() {
  console.log('--- Starting In-Place Image Compression ---');
  let total = 0;
  total += await processDirectory('src/assets');
  total += await processDirectory('public/assets');
  console.log(`\n🎉 Total Space Saved: ${(total / (1024*1024)).toFixed(2)} MB!`);
}

run();
