const http = require('http');
const fs = require('fs');
const path = require('path');
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
    // prevent path traversal
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

server.listen(port, ()=>{
  console.log('Static server running on http://localhost:'+port+' serving', root);
});

// graceful shutdown
process.on('SIGINT', ()=>{ server.close(()=>process.exit(0)) });
