/*
 Robust image optimizer
 - Uses fs.readdir recursive walk to find images in assets/img
 - Converts png/jpg/jpeg/svg to webp and avif into assets/img/optimized
 - Requires: sharp
 - Usage: node ./scripts/optimize-images-fixed.js
*/
const fs = require('fs').promises;
const path = require('path');
let sharp;
try{ sharp = require('sharp') }catch(e){ console.error('Please install sharp: npm i sharp'); process.exit(1) }

const ROOT = path.join(__dirname, '..');
const IMG_DIR = path.join(ROOT, 'assets', 'img');
const OUT_DIR = path.join(IMG_DIR, 'optimized');
const exts = ['.png','.jpg','.jpeg','.svg']

async function walk(dir){
  const res = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for(const e of entries){
    const full = path.join(dir, e.name);
    if(e.isDirectory()){
      if(e.name === 'optimized') continue;
      res.push(...await walk(full))
    } else {
      if(exts.includes(path.extname(e.name).toLowerCase())) res.push(full)
    }
  }
  return res
}

async function ensureDir(d){ try{ await fs.mkdir(d, { recursive:true }) }catch(e){} }

(async ()=>{
  try{
    const files = await walk(IMG_DIR)
    if(files.length === 0){ console.log('No images under', IMG_DIR); return }
    await ensureDir(OUT_DIR)
    const manifest = {}
    for(const f of files){
      const rel = path.relative(IMG_DIR, f).replace(/\\/g,'/')
      const base = path.basename(f, path.extname(f))
      const outWebp = path.join(OUT_DIR, base + '.webp')
      const outAvif = path.join(OUT_DIR, base + '.avif')
      const webpExists = await exists(outWebp)
      const avifExists = await exists(outAvif)
      try{
        if(!webpExists){
          console.log('->', 'webp', rel)
          await sharp(f).resize({ width:1600, withoutEnlargement:true }).webp({ quality:82 }).toFile(outWebp)
        }
        if(!avifExists){
          console.log('->', 'avif', rel)
          await sharp(f).resize({ width:1600, withoutEnlargement:true }).avif({ quality:60 }).toFile(outAvif)
        }
        manifest[rel] = { webp: '/assets/img/optimized/' + path.basename(outWebp), avif: '/assets/img/optimized/' + path.basename(outAvif) }
      }catch(err){ console.error('Failed:', f, err.message) }
    }
    await fs.writeFile(path.join(OUT_DIR,'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
    console.log('Wrote manifest:', path.join(OUT_DIR,'manifest.json'))
  }catch(err){ console.error(err); process.exit(1) }
})()

async function exists(p){ try{ await fs.access(p); return true }catch(e){ return false } }
