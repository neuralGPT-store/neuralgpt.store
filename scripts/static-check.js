#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const dataDir = path.join(root, 'data')
const assetsDir = path.join(root, 'assets')

function read(p){ try{ return fs.readFileSync(p,'utf8') }catch(e){ return null } }

const results = { ok:true, messages:[] }

// 1) check data files exist
const expectedData = ['product-data.json','category-data.json','providers-data.json']
expectedData.forEach(f=>{
  const p = path.join(dataDir,f)
  if(!fs.existsSync(p)){
    results.ok = false
    results.messages.push(`Missing data file: /data/${f}`)
  } else {
    results.messages.push(`Found /data/${f}`)
  }
})

// 2) ensure main.js references the data files
const mainjs = read(path.join(assetsDir,'js','main.js')) || ''
expectedData.forEach(f=>{
  if(!mainjs.includes(`/data/${f}`)){
    results.ok = false
    results.messages.push(`Warning: /assets/js/main.js does not reference /data/${f}`)
  } else {
    results.messages.push(`/assets/js/main.js references /data/${f}`)
  }
})

// 3) ensure no references remain to products-data.js
const repoFiles = fs.readdirSync(root).filter(x=> x.endsWith('.html') || fs.lstatSync(path.join(root,x)).isDirectory())
let foundLegacy = false
function searchFiles(dir){
  const files = fs.readdirSync(dir)
  for(const f of files){
    const full = path.join(dir,f)
    const stat = fs.lstatSync(full)
    if(stat.isDirectory()) searchFiles(full)
    else if(/\.html$|\.js$|\.css$/.test(f)){
      const txt = read(full) || ''
      // skip checking this static-check script itself
      if(full === __filename) continue
      if(txt.includes('products-data.js')){ results.ok = false; results.messages.push(`Found legacy reference in ${full}`); foundLegacy = true }
    }
  }
}
searchFiles(root)
if(!foundLegacy) results.messages.push('No references to products-data.js found.')

// 4) check key placeholders in important pages
const pageChecks = [
  {file:'index.html', ids:[['home-categories','cat-ai-components'], ['featured-products','market-grid'], ['trends-preview','trends-home'], ['global-search','mp-search']]},
  {file:'marketplace.html', ids:[['market-grid'], ['featured-products'], ['new-products'], ['mp-search','global-search'], ['filter-list']]},
  {file:'product.html', ids:[['p-title'], ['p-image'], ['p-desc'], ['p-details'], ['recommended-products'], ['global-search','mp-search']]},
  {file:'category.html', ids:[['category-grid','market-grid'], ['global-search','mp-search']]},
]

pageChecks.forEach(pc=>{
  const fpath = path.join(root,pc.file)
  const txt = read(fpath)
  if(!txt){ results.ok = false; results.messages.push(`Missing page: ${pc.file}`); return }
  pc.ids.forEach(choices=>{
    const found = choices.some(id=> txt.includes(`id="${id}"`) || txt.includes(`id='${id}'`))
    if(!found){ results.ok = false; results.messages.push(`Missing one of IDs [${choices.join('|')}] in ${pc.file}`) }
    else { results.messages.push(`Found placeholder for [${choices.join('|')}] in ${pc.file}`) }
  })
})

// 5) quick check for external backends usage
const suspect = []
searchFiles(root)
if(suspect.length) results.messages.push(...suspect)

// print summary
console.log('STATIC CHECK SUMMARY')
console.log('====================')
results.messages.forEach(m=> console.log('- '+m))
if(!results.ok){ console.error('\nStatic check FAILED'); process.exit(2) }
console.log('\nStatic check PASSED')
process.exit(0)
