#!/usr/bin/env node
/*
  scripts/run-audits.js
  - Starts a local static server (http-server)
  - Runs Lighthouse and Pa11y against configured pages
  - Writes JSON reports into /audits
  - Exits with non-zero on fatal errors

  Usage: node scripts/run-audits.js
*/
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const HOST = '127.0.0.1'
const PORT = process.env.AUDIT_PORT || 8081
const BASE = `http://${HOST}:${PORT}`
const AUDITS_DIR = path.join(__dirname,'..','audits')

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}) }

function runCmd(cmd, args, opts){
  return new Promise((resolve,reject)=>{
    const p = spawn(cmd, args, Object.assign({stdio:'inherit', shell: true}, opts||{}))
    p.on('error', reject)
    p.on('close', code => code===0 ? resolve() : reject(new Error(cmd+ ' exited '+code)))
  })
}

async function startServer(){
  console.log('Starting http-server on port',PORT)
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const cmdStr = `${npxCmd} http-server . -p ${PORT}`
  const child = spawn(cmdStr, { stdio:['ignore','pipe','pipe'], shell: true })
  let ready = false
  child.stdout.on('data',(d)=>{
    const s = String(d)
    if(/Available on:/.test(s) && !ready){ ready=true; console.log('http-server ready'); }
  })
  child.stderr.on('data',(d)=> process.stderr.write(d))
  // give it a small delay to ensure server is up
  await new Promise(r=>setTimeout(r,1200))
  return child
}

async function runLighthouse(url, outPath){
  console.log('Running Lighthouse for',url)
  // write to JSON
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const cmdStr = `${npxCmd} -y lighthouse ${url} --output=json --output-path=${outPath} --chrome-flags="--no-sandbox --headless"`
  await runCmd(cmdStr, [], {})
}

async function runPa11y(url, outPath){
  console.log('Running pa11y for',url)
  // pa11y prints to stdout; capture to file
  return new Promise((resolve,reject)=>{
    const out = fs.createWriteStream(outPath)
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
    const cmdStr = `${npxCmd} -y pa11y ${url} --reporter json`
    const p = spawn(cmdStr, { shell: true })
    p.stdout.pipe(out)
    p.stderr.pipe(process.stderr)
    p.on('close', code => code===0 ? resolve() : reject(new Error('pa11y exit '+code)))
  })
}

async function main(){
  ensureDir(AUDITS_DIR)
  const server = await startServer()
  try{
    await runLighthouse(`${BASE}/index.html`, path.join(AUDITS_DIR,'lighthouse-index.json'))
  }catch(e){ console.error('Lighthouse failed:',e.message) }
  try{
    await runPa11y(`${BASE}/index.html`, path.join(AUDITS_DIR,'pa11y-index.json'))
  }catch(e){ console.error('pa11y failed:',e.message) }

  // additional pages we can audit without changing project files
  const extra = ['/marketplace.html','/product.html']
  for(const p of extra){
    try{ await runLighthouse(`${BASE}${p}`, path.join(AUDITS_DIR,`lighthouse-${path.basename(p)}.json`)) }catch(e){ console.error('Lighthouse',p,'failed:',e.message) }
    try{ await runPa11y(`${BASE}${p}`, path.join(AUDITS_DIR,`pa11y-${path.basename(p)}.json`)) }catch(e){ console.error('pa11y',p,'failed:',e.message) }
  }

  // stop server
  try{ server.kill() }catch(e){}
  console.log('Audits finished. Reports in',AUDITS_DIR)
}

main().catch(err=>{ console.error(err); process.exit(1) })
