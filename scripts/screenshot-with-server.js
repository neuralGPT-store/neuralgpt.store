(async ()=>{
  const http = require('http');
  const fs = require('fs');
  const path = require('path');
  const puppeteer = require('puppeteer');
  const root = process.cwd();
  const port = process.env.PORT || 8080;
  const mime = {
    '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.json':'application/json',
    '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.avif':'image/avif',
    '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf', '.ico':'image/x-icon'
  };
  function send404(res){ res.statusCode=404; res.end('Not found') }

  const server = http.createServer((req,res)=>{
    try{
      let urlPath = decodeURIComponent(req.url.split('?')[0]);
      if(urlPath === '/' || urlPath === '') urlPath = '/index.html';
      const filePath = path.join(root, urlPath.replace(/^\//,''));
      if(!filePath.startsWith(root)) return send404(res);
      fs.stat(filePath, (err, stats)=>{
        if(err || !stats.isFile()) return send404(res);
        const ext = path.extname(filePath).toLowerCase();
        const type = mime[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', type + (type.startsWith('text/')? '; charset=utf-8':''));
        const rs = fs.createReadStream(filePath);
        res.statusCode = 200;
        rs.pipe(res);
      })
    }catch(e){ send404(res) }
  });

  await new Promise((resolve,reject)=>{
    server.listen(port, ()=>{ console.log('server listening on', port); resolve(); });
    server.on('error', reject);
  });

  try{
    const outDir = path.join(process.cwd(),'build','screenshots');
    if(!fs.existsSync(outDir)) fs.mkdirSync(outDir,{ recursive:true });
    const url = 'http://localhost:'+port+'/'
    const sizes = [ {w:1440,h:900, file:'desktop-1440x900.png'}, {w:1920,h:1080, file:'desktop-1920x1080.png'} ];
    const browser = await puppeteer.launch({ args:['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    for(const s of sizes){
      await page.setViewport({ width: s.w, height: s.h });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r=>setTimeout(r,1200));
      const filePath = path.join(outDir, s.file);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log('Saved', filePath);
    }
    await browser.close();
  }catch(err){ console.error('Screenshot failed', err); process.exitCode=2 }
  finally{ server.close(()=>{ process.exit(process.exitCode||0) }) }
})();
