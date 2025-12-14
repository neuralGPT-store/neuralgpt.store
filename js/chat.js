(function(){
  const w=document.createElement('div');
  w.id='ngpt-chat';
  w.innerHTML=\
    <div class='chat-head'>IA neuralGPT</div>
    <div class='chat-body'></div>
    <div class='chat-foot'>
      <input placeholder='Pregunta aquí…'/>
      <button>Enviar</button>
    </div>\;
  document.body.appendChild(w);
  const body=w.querySelector('.chat-body');
  w.querySelector('button').onclick=()=>{
    const i=w.querySelector('input'); if(!i.value) return;
    const p=document.createElement('div'); p.className='msg user'; p.textContent=i.value; body.appendChild(p);
    const a=document.createElement('div'); a.className='msg ai'; a.textContent='IA conectada. Respuesta simulada.'; body.appendChild(a);
    i.value=''; body.scrollTop=body.scrollHeight;
  };
})();
