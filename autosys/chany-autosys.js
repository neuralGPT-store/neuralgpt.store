const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname,'..','autosys');
const OUT  = path.join(BASE,'out');
if(!fs.existsSync(OUT)) fs.mkdirSync(OUT,{recursive:true});

function flush(){
  const q = JSON.parse(require('node:fs').readFileSync(path.join(process.cwd(),'public','localStorage.json'),'utf8')||'[]');
  const file = path.join(OUT, 'forms-'+Date.now()+'.json');
  fs.writeFileSync(file, JSON.stringify(q,null,2));
}

setInterval(flush, 10*60*1000);
