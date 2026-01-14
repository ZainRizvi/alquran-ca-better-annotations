const sharp = require('sharp');
const path = require('path');

const ICONS_DIR = path.join(__dirname, '..', 'icons');
const SOURCE = path.join(ICONS_DIR, 'logo source.png');
const SIZES = [16, 48, 128];

async function generateIcons() {
  console.log('Processing source image...');

  // Crop out the watermark (bottom-right area)
  const cropped = await sharp(SOURCE)
    .extract({ left: 0, top: 0, width: 950, height: 920 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = cropped;

  // Replace black pixels with transparent
  // Black threshold: R,G,B all < 20
  const threshold = 20;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r < threshold && g < threshold && b < threshold) {
      data[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }

  // Create processed image with transparency and trim
  const trimmed = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .trim()
    .png()
    .toBuffer();

  // Save the full-size transparent version
  const fullPath = path.join(ICONS_DIR, 'icon-full.png');
  await sharp(trimmed).toFile(fullPath);
  console.log(`Saved: ${fullPath}`);

  // Generate each size
  for (const size of SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon${size}.png`);
    await sharp(trimmed)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(outputPath);
    console.log(`Saved: ${outputPath}`);
  }

  console.log('\nDone! Update manifest.json with:');
  console.log(JSON.stringify({
    icons: {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }, null, 2));
}

generateIcons().catch(console.error);
