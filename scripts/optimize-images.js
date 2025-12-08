/*
 Image optimization script
 - Requires: npm install sharp glob fs-extra
 - Usage: node ./scripts/optimize-images.js

 What it does:
 - Scans `assets/img` for .png .jpg .jpeg .svg
 - Writes optimized .webp and .avif into `assets/img/optimized/`
 - Produces `assets/img/optimized/manifest.json` mapping originals to optimized files
 - Idempotent: skips conversion if target exists
*/

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const glob = require('glob');
const mkdirp = require('fs').promises;

async function ensureDir(dir) {
  try { await mkdirp.mkdir(dir, { recursive: true }); } catch (e) { /* ignore */ }
}

async function main() {
  const root = path.join(__dirname, '..');
  const imgDir = path.join(root, 'assets', 'img');
  const outDir = path.join(imgDir, 'optimized');

  const exts = ['png','jpg','jpeg','svg'];
  const pattern = path.join(imgDir, `**/*.+(${exts.join('|')})`);
  const files = glob.sync(pattern, { nodir: true });

  if (files.length === 0) {
    console.log('No images found under', imgDir);
    return;
  }

  await ensureDir(outDir);

  let sharp;
  try {
    sharp = require('sharp');
  } catch (err) {
    console.error('Module "sharp" not found. Install with: npm i sharp');
    process.exit(1);
  }

  const manifest = {};

  for (const f of files) {
    const rel = path.relative(imgDir, f);
    const base = path.basename(f, path.extname(f));
    const outWebp = path.join(outDir, base + '.webp');
    const outAvif = path.join(outDir, base + '.avif');

    // Skip if both exist
    const webpExists = fs.existsSync(outWebp);
    const avifExists = fs.existsSync(outAvif);

    try {
      if (!webpExists) {
        console.log('Generating', outWebp);
        await sharp(f)
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(outWebp);
      }
      if (!avifExists) {
        console.log('Generating', outAvif);
        await sharp(f)
          .resize({ width: 1600, withoutEnlargement: true })
          .avif({ quality: 60 })
          .toFile(outAvif);
      }

      manifest[rel.replace(/\\/g, '/')] = {
        webp: '/assets/img/optimized/' + path.basename(outWebp),
        avif: '/assets/img/optimized/' + path.basename(outAvif)
      };
    } catch (err) {
      console.error('Failed to process', f, err.message);
    }
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Wrote manifest to', manifestPath);
}

main().catch(err => { console.error(err); process.exit(1); });
