#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const publicDataDir = path.join(root, 'public-data')
const redirectsPath = path.join(root, '_redirects')

function read(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch (_) {
    return null
  }
}

const results = { ok: true, messages: [] }

const requiredPublicData = [
  'listings.public.json',
  'taxonomy.public.json',
  'site-settings.public.json'
]

requiredPublicData.forEach((fileName) => {
  const fullPath = path.join(publicDataDir, fileName)
  if (!fs.existsSync(fullPath)) {
    results.ok = false
    results.messages.push(`Missing public dataset: /public-data/${fileName}`)
  } else {
    results.messages.push(`Found /public-data/${fileName}`)
  }
})

const requiredPages = [
  'index.html',
  'real-estate-index.html',
  'venta.html',
  'alquiler.html',
  'listing.html',
  'contact.html',
  'about.html',
  'sponsors.html',
  'privacy.html',
  'legal.html',
  'terms.html',
  '404.html',
  'robots.txt',
  'sitemap.xml',
  'sitemap-real-estate.xml'
]

requiredPages.forEach((fileName) => {
  const fullPath = path.join(root, fileName)
  if (!fs.existsSync(fullPath)) {
    results.ok = false
    results.messages.push(`Missing required public file: /${fileName}`)
  } else {
    results.messages.push(`Found /${fileName}`)
  }
})

const publicSurfaceFiles = requiredPages
  .filter((fileName) => fileName.endsWith('.html'))
  .map((fileName) => path.join(root, fileName))

const legacyRefs = [
  '/marketplace.html',
  '/product.html',
  '/category.html',
  'products-data.js'
]

publicSurfaceFiles.forEach((fullPath) => {
  const txt = read(fullPath) || ''
  legacyRefs.forEach((legacy) => {
    if (txt.includes(legacy)) {
      results.ok = false
      results.messages.push(`Legacy reference found in ${path.basename(fullPath)}: ${legacy}`)
    }
  })
})

const redirects = read(redirectsPath) || ''
const blockedPrefixes = ['/data/*', '/ops/*', '/scripts/*']
blockedPrefixes.forEach((prefix) => {
  if (!redirects.includes(prefix)) {
    results.ok = false
    results.messages.push(`Missing blocked prefix in _redirects: ${prefix}`)
  } else {
    results.messages.push(`Blocked prefix present in _redirects: ${prefix}`)
  }
})

console.log('STATIC CHECK SUMMARY')
console.log('====================')
results.messages.forEach((msg) => console.log('- ' + msg))

if (!results.ok) {
  console.error('\nStatic check FAILED')
  process.exit(2)
}

console.log('\nStatic check PASSED')
process.exit(0)
