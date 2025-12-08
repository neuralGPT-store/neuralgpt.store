/*
Apply optimized image paths from assets/img/optimized/manifest.json into data/product-catalog.json
- Adds: product.originalImage (keeps previous), product.image -> webp path (if found), product.imageAvif -> avif path
- Usage: node ./scripts/apply-optimized-paths.js
*/
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const manifestPath = path.join(root, 'assets', 'img', 'optimized', 'manifest.json');
const catalogPath = path.join(root, 'data', 'product-catalog.json');

if(!fs.existsSync(manifestPath)){
  console.error('Manifest not found at', manifestPath); process.exit(1)
}
if(!fs.existsSync(catalogPath)){
  console.error('Product catalog not found at', catalogPath); process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'))
const catalogRaw = fs.readFileSync(catalogPath,'utf8')
let catalog = JSON.parse(catalogRaw)

function toRel(p){ return String(p||'').replace(/^\/?assets\/img\//,'') }
let changed = false
catalog = catalog.map(prod => {
  const primary = (Array.isArray(prod.images) && prod.images.length) ? prod.images[0] : prod.image || ''
  const rel = toRel(primary)
  if(manifest[rel]){
    const entry = manifest[rel]
    // keep original
    if(!prod.originalImage) prod.originalImage = primary
    // set optimized
    if(entry.webp){ prod.image = entry.webp }
    if(entry.avif){ prod.imageAvif = entry.avif }
    changed = true
  }
  return prod
})

if(changed){ fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8'); console.log('Updated product-catalog.json with optimized paths') }
else{ console.log('No matching entries found in manifest; no changes made') }
