(async ()=>{
  const fs = require('fs');
  const path = require('path');
  const puppeteer = require('puppeteer');
  const outDir = path.join(process.cwd(),'build','screenshots');
  if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{ recursive:true });
  const url = process.env.NGS_URL || 'http://localhost:8080/';
  const sizes = [ {w:1440,h:900, file:'desktop-1440x900.png'}, {w:1920,h:1080, file:'desktop-1920x1080.png'} ];
  const browser = await puppeteer.launch({ args:['--no-sandbox','--disable-setuid-sandbox'] });
  try{
    const page = await browser.newPage();
    for(const s of sizes){
      await page.setViewport({ width: s.w, height: s.h });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      // wait a bit for animations and rotator
      await page.waitForTimeout(1200);
      const filePath = path.join(outDir, s.file);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log('Saved', filePath);
    }
  }catch(err){ console.error('Screenshot failed', err); process.exitCode=2 }
  finally{ await browser.close(); }
})();
