const fs = require('fs')
const path = require('path')
const reportPath = path.join('build','unused-assets-report.json')
if(!fs.existsSync(reportPath)) { console.error('Report not found:', reportPath); process.exit(1) }
const report = JSON.parse(fs.readFileSync(reportPath,'utf8'))
const unused = report.unused || []
if(!unused.length){ console.log('No unused assets to move'); process.exit(0) }
const ts = new Date().toISOString().replace(/[:.]/g,'-')
const outDir = path.join('backups','unused-'+ts)
fs.mkdirSync(outDir, { recursive: true })
let moved = 0
unused.forEach(rel =>{
  const src = path.join(rel)
  if(fs.existsSync(src)){
    try{
      const dest = path.join(outDir, rel.replace(/^assets[\\/]/,'assets-'))
      const destDir = path.dirname(dest)
      fs.mkdirSync(destDir, { recursive: true })
      fs.renameSync(src, dest)
      moved++
    }catch(e){ console.error('move failed', src, e.message) }
  }
})
console.log('Moved', moved, 'files to', outDir)
