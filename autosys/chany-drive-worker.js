const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname,'..','corp-drive');
const QUEUE = path.join(__dirname,'..','autosys','out');

if(!fs.existsSync(QUEUE)) process.exit(0);

fs.readdirSync(QUEUE).forEach(f=>{
  if(!f.endsWith('.json')) return;
  const src = path.join(QUEUE,f);
  const data = JSON.parse(fs.readFileSync(src,'utf8'));
  data.forEach(item=>{
    const topic = (item.data && item.data.Tema || '').toLowerCase();
    let dest = '04-Contacts';
    if(topic.includes('prove')) dest = '02-Providers';
    if(topic.includes('sponsor')) dest = '03-Sponsors';
    if(topic.includes('producto')) dest = '01-Leads';
    const out = path.join(ROOT,dest, msg-.json);
    fs.writeFileSync(out, JSON.stringify(item,null,2));
  });
  fs.renameSync(src, path.join(ROOT,'99-Archive',f));
});
