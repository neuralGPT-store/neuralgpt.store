document.addEventListener('DOMContentLoaded', () => {
  const box = document.createElement('div');
  box.className = 'irene-floating';

  box.innerHTML = `
    <h3>Irene AI Agent</h3>
    <textarea id="irene-msg"></textarea>
    <div class="controls">
      <button id="irene-send" class="btn-primary" type="button">Send</button>
      <button id="irene-close" class="btn-secondary" type="button">Close</button>
    </div>
    <div id="irene-res"></div>
  `;

  document.body.appendChild(box);

  const sendBtn = box.querySelector('#irene-send');
  const closeBtn = box.querySelector('#irene-close');
  const msgBox = box.querySelector('#irene-msg');
  const resBox = box.querySelector('#irene-res');

  if (closeBtn) closeBtn.addEventListener('click', () => box.remove());

  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const message = (msgBox && msgBox.value) ? msgBox.value.trim() : '';
      if (!message) return;
      const userNode = document.createElement('div');
      userNode.innerHTML = `<b>You:</b> ${message}`;
      resBox.appendChild(userNode);
      try {
        const resp = await fetch('/irene/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
        if (!resp.ok) throw new Error('agent API error');
        const data = await resp.json();
        const botNode = document.createElement('div');
        botNode.innerHTML = `<b>Irene:</b> ${data.response || data.reply || ''}`;
        resBox.appendChild(botNode);
        resBox.scrollTop = resBox.scrollHeight;
      } catch (err) {
        console.error('Irene agent error', err);
        const errNode = document.createElement('div');
        errNode.innerHTML = `<b>Irene:</b> Error getting response`;
        resBox.appendChild(errNode);
      }
      if (msgBox) msgBox.value = '';
    });
  }
});
