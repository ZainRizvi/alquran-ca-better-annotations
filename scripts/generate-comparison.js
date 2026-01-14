const sharp = require('sharp');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');
const OUTPUT = path.join(SCREENSHOTS_DIR, 'comparison.png');

// Final dimensions for Chrome Web Store
const FINAL_WIDTH = 1280;
const FINAL_HEIGHT = 800;
const HALF_WIDTH = FINAL_WIDTH / 2;

// Label styling
const LABEL_HEIGHT = 48;
const LABEL_FONT_SIZE = 24;
const LABEL_BG_BEFORE = '#c0392b';  // Bold red
const LABEL_BG_AFTER = '#1a5f2a';   // Green
const LABEL_TEXT_BEFORE = '#ffffff';
const LABEL_TEXT_AFTER = '#ffffff';
const DIVIDER_WIDTH = 4;
const DIVIDER_COLOR = '#333333';

async function generateComparison() {
  console.log('Generating comparison image...');

  const contentHeight = FINAL_HEIGHT - LABEL_HEIGHT;

  // Load and resize both screenshots to half width
  const beforeImg = await sharp(path.join(SCREENSHOTS_DIR, '1-before.png'))
    .resize(HALF_WIDTH, contentHeight, { fit: 'cover', position: 'top' })
    .toBuffer();

  const afterImg = await sharp(path.join(SCREENSHOTS_DIR, '2-after.png'))
    .resize(HALF_WIDTH, contentHeight, { fit: 'cover', position: 'top' })
    .toBuffer();

  // Create SVG labels
  const beforeLabel = Buffer.from(`
    <svg width="${HALF_WIDTH}" height="${LABEL_HEIGHT}">
      <rect width="100%" height="100%" fill="${LABEL_BG_BEFORE}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="system-ui, -apple-system, sans-serif" font-size="${LABEL_FONT_SIZE}"
            font-weight="600" fill="${LABEL_TEXT_BEFORE}">
        BEFORE
      </text>
    </svg>
  `);

  const afterLabel = Buffer.from(`
    <svg width="${HALF_WIDTH}" height="${LABEL_HEIGHT}">
      <rect width="100%" height="100%" fill="${LABEL_BG_AFTER}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="system-ui, -apple-system, sans-serif" font-size="${LABEL_FONT_SIZE}"
            font-weight="600" fill="${LABEL_TEXT_AFTER}">
        AFTER
      </text>
    </svg>
  `);

  // Create the left half (before label + before screenshot)
  const leftHalf = await sharp({
    create: {
      width: HALF_WIDTH,
      height: FINAL_HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      { input: await sharp(beforeLabel).png().toBuffer(), top: 0, left: 0 },
      { input: beforeImg, top: LABEL_HEIGHT, left: 0 }
    ])
    .png()
    .toBuffer();

  // Create the right half (after label + after screenshot)
  const rightHalf = await sharp({
    create: {
      width: HALF_WIDTH,
      height: FINAL_HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      { input: await sharp(afterLabel).png().toBuffer(), top: 0, left: 0 },
      { input: afterImg, top: LABEL_HEIGHT, left: 0 }
    ])
    .png()
    .toBuffer();

  // Create vertical divider
  const divider = Buffer.from(`
    <svg width="${DIVIDER_WIDTH}" height="${FINAL_HEIGHT}">
      <rect width="100%" height="100%" fill="${DIVIDER_COLOR}"/>
    </svg>
  `);
  const dividerPng = await sharp(divider).png().toBuffer();

  // Combine left and right halves with divider
  await sharp({
    create: {
      width: FINAL_WIDTH,
      height: FINAL_HEIGHT,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite([
      { input: leftHalf, top: 0, left: 0 },
      { input: rightHalf, top: 0, left: HALF_WIDTH },
      { input: dividerPng, top: 0, left: HALF_WIDTH - DIVIDER_WIDTH / 2 }
    ])
    .png()
    .toFile(OUTPUT);

  console.log(`Saved: ${OUTPUT}`);
}

generateComparison().catch(console.error);
