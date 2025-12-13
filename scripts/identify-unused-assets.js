/*
 Identify unreferenced assets in assets/img and assets/wallpapers.
 Writes report to build/unused-assets-report.json
*/
const fs = require('fs')
const path = require('path')
const glob = require('glob')

const searchRoots = ['*.html', 'js/**/*.js', 'css/**/*.css', 'assets/js/**/*.js']
const assetPatterns = ['assets/img/**/*.*', 'assets/wallpapers/**/*.*']

function readAllFiles(patterns){
  const files = []
  patterns.forEach(p=> files.push(...glob.sync(p, { nodir:true })))
  return files
}

function fileContains(filePath, needle){
  try{ const txt = fs.readFileSync(filePath,'utf8'); return txt.indexOf(needle) !== -1 }catch(e){ return false }
}

function relative(p){ return p.replace(/\\/g,'/').replace(/^\/*/,'') }

function main(){
  const repoFiles = readAllFiles(searchRoots)
  const assets = readAllFiles(assetPatterns)
  const report = { scannedFiles: repoFiles.length, assetsScanned: assets.length, unused: [] }

  assets.forEach(a=>{
    const rel = relative(a)
    // check if any repo file references this path
    const found = repoFiles.some(r => fileContains(r, rel) || fileContains(r, '/' + rel) || fileContains(r, rel.split('/').pop()))
    if(!found) report.unused.push(rel)
  })

  if(!fs.existsSync('build')) fs.mkdirSync('build', { recursive: true })
  fs.writeFileSync('build/unused-assets-report.json', JSON.stringify(report, null, 2))
  console.log('Wrote report: build/unused-assets-report.json (unused count:', report.unused.length,')')
}

main()
