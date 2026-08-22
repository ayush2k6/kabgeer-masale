const Jimp = require('jimp');

async function analyze() {
  const image = await Jimp.read('./src/assets/recipe bg.png');
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  
  let minX = width, minY = height, maxX = 0, maxY = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = Jimp.intToRGBA(image.getPixelColor(x, y));
      // check if pixel is "blue" (B > R and B > G roughly, or just check colors)
      // Actually, let's just sample some pixels to see what's in the image.
      if (color.b > color.r + 20 && color.b > color.g + 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  console.log('Image dimensions:', width, 'x', height);
  console.log('Blue bounding box:', { minX, minY, maxX, maxY });
  
  // Also print the top-left, center, and bottom-right colors
  console.log('Top-Left:', Jimp.intToRGBA(image.getPixelColor(0, 0)));
  console.log('Center:', Jimp.intToRGBA(image.getPixelColor(Math.floor(width/2), Math.floor(height/2))));
  console.log('Bottom-Right:', Jimp.intToRGBA(image.getPixelColor(width-1, height-1)));
}

analyze().catch(console.error);
