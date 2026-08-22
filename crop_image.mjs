import { Jimp } from 'jimp';

async function crop() {
  const image = await Jimp.read('./src/assets/recipe bg.png');
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  console.log(`Original Size: ${width}x${height}`);

  // We want to remove the top bowls and bottom bowls.
  // Looking at the image, top bowls take about 20% of the height, and bottom bowls take about 40%.
  // So we'll keep from Y = height * 0.18 to Y = height * 0.60
  
  const startY = Math.floor(height * 0.18);
  const cropHeight = Math.floor(height * 0.40);
  
  image.crop({ x: 0, y: startY, w: width, h: cropHeight });
  
  await image.write('./src/assets/recipe bg cropped.png');
  console.log('Cropped image saved successfully.');
}

crop().catch(console.error);
