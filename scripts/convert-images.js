/*
 Simple image conversion script using sharp.
 - Converts .png/.jpg/.jpeg to AVIF and WebP into assets/img/optimized
 - Emits a manifest mapping original relative path -> { avif, webp }
*/
const fs = require('fs')
const path = require('path')
const glob = require('glob')
const sharp = require('sharp')

const SRC_DIRS = [ 'assets/img/products', 'assets/img', 'assets/wallpapers' ]
const OUT_DIR = path.join('assets','img','optimized')
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json')

if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

async function processFile(file){
  try{
    const ext = path.extname(file).toLowerCase()
    if(ext === '.svg' || ext === '.gif') return null
    const rel = file.replace(/^\/*/, '')
    const baseName = path.basename(file, ext)
    const safeName = baseName.replace(/[^a-z0-9\-_.]/ig, '_')
    const outAvif = path.join(OUT_DIR, safeName + '.avif')
    const outWebp = path.join(OUT_DIR, safeName + '.webp')

    await sharp(file).avif({ quality: 60 }).toFile(outAvif)
    await sharp(file).webp({ quality: 72 }).toFile(outWebp)

    return { original: rel, avif: '/' + outAvif.replace(/\\/g,'/'), webp: '/' + outWebp.replace(/\\/g,'/') }
  }catch(e){ console.error('convert error', file, e.message); return null }
}

async function main(){
  const manifest = {}
  for(const d of SRC_DIRS){
    const pattern = path.join(d, '**/*.+(png|jpg|jpeg|webp)')
    const files = glob.sync(pattern, { nodir:true })
    for(const f of files){
      const res = await processFile(f)
      if(res) manifest[res.original.replace(/^assets\//,'')] = { avif: res.avif, webp: res.webp }
    }
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  console.log('Wrote manifest:', MANIFEST_PATH)
}

main().catch(e=>{ console.error(e); process.exit(1) })
