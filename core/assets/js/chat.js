document.getElementById('irene-chat-button').onclick = () => {
    const win = document.getElementById('irene-chat-window');
    win.style.display = win.style.display === 'flex' ? 'none' : 'flex';
};

document.getElementById('irene-chat-send').onclick = async () => {
    const field = document.getElementById('irene-chat-field');
    const text = field.value.trim();
    if (!text) return;

    const messages = document.getElementById('irene-chat-messages');
    messages.innerHTML += '<div><b>You:</b> ' + text + '</div>';

    const resp = await fetch('/irene/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({message:text})
    });

    const data = await resp.json();
    messages.innerHTML += '<div><b>Irene:</b> ' + data.reply + '</div>';

    field.value = '';
    messages.scrollTop = messages.scrollHeight;
};
