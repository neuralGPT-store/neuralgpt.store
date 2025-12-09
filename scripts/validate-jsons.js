#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function walk(dir, list=[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, list)
    else if (e.isFile() && e.name.endsWith('.json')) list.push(full)
  }
  return list
}

const root = path.join(__dirname, '..')
const targets = []
// include data and build, and key manifests
const dirs = [path.join(root,'data'), path.join(root,'build'), path.join(root,'assets','img','optimized')]
for (const d of dirs) {
  if (fs.existsSync(d)) targets.push(...walk(d))
}
// dedupe
const files = Array.from(new Set(targets)).sort()

const report = { checked: files.length, parsed: 0, errors: [], missingAssets: [], summary: {} }

for (const f of files) {
  try {
    const raw = fs.readFileSync(f,'utf8')
    JSON.parse(raw)
    report.parsed += 1
  } catch (err) {
    report.errors.push({ file: f, message: err.message })
  }
}

// Validate images referenced in data/product-catalog.json if present
const catalogPath = path.join(root,'data','product-catalog.json')
if (fs.existsSync(catalogPath)) {
  try {
    const catalog = JSON.parse(fs.readFileSync(catalogPath,'utf8'))
    report.summary.products = catalog.length
    for (const p of catalog) {
      const imgs = []
      if (Array.isArray(p.images)) imgs.push(...p.images)
      if (p.image) imgs.push(p.image)
      for (const img of imgs) {
        // normalize local path
        let local = img
        if (/^https?:\/\//.test(img)) {
          try { local = new URL(img).pathname } catch(e) { local = img }
        }
        // strip leading slash
        local = local.replace(/^\//,'')
        const filePath = path.join(root, local)
        if (!fs.existsSync(filePath)) {
          report.missingAssets.push({ productId: p.id, image: img, resolved: filePath })
        }
      }
    }
  } catch(e){ report.errors.push({ file: catalogPath, message: e.message }) }
} else {
  report.errors.push({ file: catalogPath, message: 'catalog missing' })
}

// Write report
const outDir = path.join(root,'build')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir,'validation-summary.json')
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8')
console.log('Wrote', outPath)
if (report.errors.length || report.missingAssets.length) process.exitCode = 2
else process.exitCode = 0
