import sharp from 'sharp';
import fs from 'fs';

const SRC = 'public/logo-icon.svg';
const BG = { r: 17, g: 17, b: 17, alpha: 1 }; // matches app background #111111

const svg = fs.readFileSync(SRC);

async function generate({ size, name, padRatio = 0, format = 'png' }) {
  const inner = Math.round(size * (1 - padRatio * 2));
  // Render the SVG at the inner size onto a solid background canvas
  const innerBuf = await sharp(svg, { density: 96, limitInputPixels: false })
    .resize({ width: inner, height: inner, fit: 'contain', background: BG })
    .png()
    .toBuffer();

  const canvas = await sharp({
    create: { width: size, height: size, channels: 4, background: BG }
  })
    .composite([{ input: innerBuf, gravity: 'center' }])
    [format]()
    .toFile(`public/${name}`);

  console.log(`✓ public/${name}  (${size}×${size}${padRatio ? `, padding ${Math.round(padRatio * 100)}%` : ''})`);
}

await generate({ size: 192, name: 'icon-192.png',          padRatio: 0.08 });
await generate({ size: 512, name: 'icon-512.png',          padRatio: 0.08 });
// Maskable variants need more padding (Android crops up to ~20%)
await generate({ size: 192, name: 'icon-192-maskable.png', padRatio: 0.18 });
await generate({ size: 512, name: 'icon-512-maskable.png', padRatio: 0.18 });
// iOS Add-to-Home-Screen
await generate({ size: 180, name: 'apple-touch-icon.png',  padRatio: 0.08 });
// Favicon
await generate({ size: 32,  name: 'favicon-32.png',        padRatio: 0.05 });

console.log('\nDone.');
