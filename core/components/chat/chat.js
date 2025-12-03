document.addEventListener('DOMContentLoaded', ()=>{

  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;bottom:20px;right:20px;width:300px;height:400px;background:#000;border:2px solid #d4af37;border-radius:15px;color:#fff;padding:10px;';
  
  box.innerHTML = \
    <h3>Irene AI Agent</h3>
    <textarea id='msg' style='width:100%;height:65%;background:#111;color:#fff;border-radius:10px;'></textarea>
    <button id='sendBtn'>Send</button>
    <div id='res' style='margin-top:10px;'></div>
  \;

  document.body.appendChild(box);

  document.getElementById('sendBtn').onclick = async ()=>{
    const msg = document.getElementById('msg').value;
    const res = await fetch('/irene/agent',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ message: msg })
    });
    const data = await res.json();
    document.getElementById('res').innerHTML = data.response;
  };
});
