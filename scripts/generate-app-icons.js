const fs = require('fs');
const path = require('path');

// Resolve jimp from apps/mobile
const mobileDir = path.resolve(__dirname, '..', 'apps', 'mobile');
let Jimp;
try {
  Jimp = require(path.join(mobileDir, 'node_modules', 'jimp-compact'));
} catch (e) {
  try {
    Jimp = require('jimp-compact');
  } catch (e2) {
    console.error('Failed to load jimp-compact:', e2);
    process.exit(1);
  }
}

const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.join(projectRoot, 'docs', 'assets', 'TripMate Travel Expense Icon.png');

if (!fs.existsSync(sourcePath)) {
  console.error(`ERROR: Source image not found at: ${sourcePath}`);
  process.exit(1);
}

const BG_COLOR_HEX = 0x160B37FF; // #160B37 dark purple/indigo
const BG_COLOR_STR = '#160B37';

async function run() {
  console.log(`[TripMate Icon Generator] Reading source icon: ${sourcePath}`);
  const originalImg = await Jimp.read(sourcePath);
  const origW = originalImg.bitmap.width;
  const origH = originalImg.bitmap.height;
  console.log(`[TripMate Icon Generator] Source dimensions: ${origW} x ${origH}`);

  // Create a transparent-corner version of the squircle
  const transparentIcon = originalImg.clone();
  const visited = new Uint8Array(origW * origH);
  const queue = [
    [0, 0],
    [origW - 1, 0],
    [0, origH - 1],
    [origW - 1, origH - 1],
  ];
  for (const [x, y] of queue) visited[y * origW + x] = 1;

  let head = 0;
  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const color = Jimp.intToRGBA(transparentIcon.getPixelColor(cx, cy));
    // Check if pixel is white/near-white outer canvas
    if (color.r >= 235 && color.g >= 235 && color.b >= 235) {
      transparentIcon.setPixelColor(0x00000000, cx, cy);
      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < origW && ny >= 0 && ny < origH && !visited[ny * origW + nx]) {
          visited[ny * origW + nx] = 1;
          queue.push([nx, ny]);
        }
      }
    }
  }

  // 1. Destination mobile assets
  const mobileAssetsImages = path.join(mobileDir, 'assets', 'images');
  if (!fs.existsSync(mobileAssetsImages)) {
    fs.mkdirSync(mobileAssetsImages, { recursive: true });
  }

  // A. tripmate-app-icon.png (high-res 1024x1024 standard app icon)
  const fullAppIcon = transparentIcon.clone().resize(1024, 1024);
  const iconPath = path.join(mobileAssetsImages, 'tripmate-app-icon.png');
  await fullAppIcon.writeAsync(iconPath);
  console.log(`✓ Generated: ${iconPath}`);

  // Keep legacy icon.png in sync
  const legacyIconPath = path.join(mobileAssetsImages, 'icon.png');
  await fullAppIcon.writeAsync(legacyIconPath);
  console.log(`✓ Updated: ${legacyIconPath}`);

  // B. tripmate-app-icon-foreground.png (1024x1024 canvas with icon centered in 720x720 safe area)
  const fgCanvas = new Jimp(1024, 1024, 0x00000000);
  const fgScaled = transparentIcon.clone().resize(720, 720);
  const offset = Math.round((1024 - 720) / 2); // 152 px padding on all sides
  fgCanvas.composite(fgScaled, offset, offset);
  const fgPath = path.join(mobileAssetsImages, 'tripmate-app-icon-foreground.png');
  await fgCanvas.writeAsync(fgPath);
  console.log(`✓ Generated: ${fgPath}`);

  const legacyFgPath = path.join(mobileAssetsImages, 'android-icon-foreground.png');
  await fgCanvas.writeAsync(legacyFgPath);
  console.log(`✓ Updated: ${legacyFgPath}`);

  // C. tripmate-app-icon-background.png (1024x1024 canvas with background color #160B37)
  const bgCanvas = new Jimp(1024, 1024, BG_COLOR_HEX);
  const bgPath = path.join(mobileAssetsImages, 'tripmate-app-icon-background.png');
  await bgCanvas.writeAsync(bgPath);
  console.log(`✓ Generated: ${bgPath}`);

  const legacyBgPath = path.join(mobileAssetsImages, 'android-icon-background.png');
  await bgCanvas.writeAsync(legacyBgPath);
  console.log(`✓ Updated: ${legacyBgPath}`);

  // 2. Android native mipmap densities
  const densities = [
    { name: 'mipmap-mdpi', launcherSize: 48, fgSize: 108 },
    { name: 'mipmap-hdpi', launcherSize: 72, fgSize: 162 },
    { name: 'mipmap-xhdpi', launcherSize: 96, fgSize: 216 },
    { name: 'mipmap-xxhdpi', launcherSize: 144, fgSize: 324 },
    { name: 'mipmap-xxxhdpi', launcherSize: 192, fgSize: 432 },
  ];

  const resDir = path.join(mobileDir, 'android', 'app', 'src', 'main', 'res');

  for (const d of densities) {
    const targetDir = path.join(resDir, d.name);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Standard launcher icon (WebP)
    const launcherImg = transparentIcon.clone().resize(d.launcherSize, d.launcherSize);
    await launcherImg.writeAsync(path.join(targetDir, 'ic_launcher.webp'));

    // Round launcher icon (WebP) - circular masked
    const roundImg = transparentIcon.clone().resize(d.launcherSize, d.launcherSize);
    roundImg.circle();
    await roundImg.writeAsync(path.join(targetDir, 'ic_launcher_round.webp'));

    // Adaptive foreground (WebP) - centered in safe area
    const dFgCanvas = new Jimp(d.fgSize, d.fgSize, 0x00000000);
    const innerSize = Math.round(d.fgSize * (72 / 108));
    const dFgScaled = transparentIcon.clone().resize(innerSize, innerSize);
    const dOffset = Math.round((d.fgSize - innerSize) / 2);
    dFgCanvas.composite(dFgScaled, dOffset, dOffset);
    await dFgCanvas.writeAsync(path.join(targetDir, 'ic_launcher_foreground.webp'));

    // Adaptive background (WebP)
    const dBgCanvas = new Jimp(d.fgSize, d.fgSize, BG_COLOR_HEX);
    await dBgCanvas.writeAsync(path.join(targetDir, 'ic_launcher_background.webp'));

    console.log(`✓ Updated Android density: ${d.name}`);
  }

  // 3. Update Android res/values/colors.xml iconBackground
  const colorsXmlPath = path.join(resDir, 'values', 'colors.xml');
  if (fs.existsSync(colorsXmlPath)) {
    let colorsContent = fs.readFileSync(colorsXmlPath, 'utf8');
    colorsContent = colorsContent.replace(
      /<color name="iconBackground">.*?<\/color>/,
      `<color name="iconBackground">${BG_COLOR_STR}</color>`
    );
    fs.writeFileSync(colorsXmlPath, colorsContent, 'utf8');
    console.log(`✓ Updated iconBackground in ${colorsXmlPath} to ${BG_COLOR_STR}`);
  }

  console.log(`\n======================================================`);
  console.log(`✅ ALL APP LAUNCHER ICONS SUCCESSFULLY GENERATED!`);
  console.log(`======================================================\n`);
}

run().catch((err) => {
  console.error('Fatal error during icon generation:', err);
  process.exit(1);
});
