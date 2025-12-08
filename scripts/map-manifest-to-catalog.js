#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const manifestPath = path.join(root, 'assets', 'img', 'optimized', 'manifest.json')
const catalogPath = path.join(root, 'data', 'product-catalog.json')

function readJSON(p){ try{ return JSON.parse(fs.readFileSync(p,'utf8')) }catch(e){ return null } }
function writeJSON(p,obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2),'utf8') }

const manifest = readJSON(manifestPath)
if(!manifest){ console.error('No manifest found at', manifestPath); process.exit(2) }
const catalog = readJSON(catalogPath)
if(!catalog){ console.error('No product catalog found at', catalogPath); process.exit(2) }

const keys = Object.keys(manifest)
function findOptimizedFor(src){ if(!src) return null
  const base = path.basename(String(src)).toLowerCase()
  // try exact basename
  let key = keys.find(k=> k.toLowerCase() === base)
  if(!key){ // try removing querystring or size suffixes
    const baseNoQuery = base.split('?')[0]
    key = keys.find(k=> k.toLowerCase() === baseNoQuery)
  }
  if(!key){ // try match contains
    key = keys.find(k=> k.toLowerCase().indexOf(base.replace(/\.[a-z0-9]+$/,'')) !== -1)
  }
  if(!key) return null
  const entry = manifest[key]
  // prefer avif then webp then fallback to original optimized path
  if(entry.avif) return entry.avif
  if(entry.webp) return entry.webp
  return entry.avif || entry.webp || null
}

let changes = 0
catalog.forEach(p=>{
  if(!p) return
  // images array
  if(Array.isArray(p.images)){
    const mapped = p.images.map(img=> findOptimizedFor(img) || img)
    // if any changed, assign
    if(JSON.stringify(mapped) !== JSON.stringify(p.images)){
      p.images = mapped
      changes++
    }
  }
  // single image field
  if(p.image){
    const opt = findOptimizedFor(p.image)
    if(opt && opt !== p.image){ p.image = opt; changes++ }
  } else if(Array.isArray(p.images) && p.images.length){
    const first = p.images[0]
    if(first && first !== p.image){ p.image = first; changes++ }
  }
})

if(changes>0){
  writeJSON(catalogPath, catalog)
  console.log(`Updated ${changes} image references in product-catalog.json`)
} else {
  console.log('No changes necessary; product-catalog.json already references optimized assets where available.')
}

process.exit(0)
