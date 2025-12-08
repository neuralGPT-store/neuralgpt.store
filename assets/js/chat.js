document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('irene-chat-button');
    const win = document.getElementById('irene-chat-window');
    const send = document.getElementById('irene-chat-send');
    const field = document.getElementById('irene-chat-field');
    const messages = document.getElementById('irene-chat-messages');

    if (button && win) {
        button.addEventListener('click', () => {
            win.style.display = win.style.display === 'flex' ? 'none' : 'flex';
        });
    }

    if (!send || !field || !messages) return;

    send.addEventListener('click', async () => {
        const text = field.value.trim();
        if (!text) return;
        const userNode = document.createElement('div');
        userNode.innerHTML = `<b>You:</b> ${text}`;
        messages.appendChild(userNode);

        // Network calls removed for static build. Provide a local offline demo response.
        const botNode = document.createElement('div');
        botNode.innerHTML = `<b>Irene:</b> Este chat está en modo demostración (offline). Respuesta simulada: "Recibido: ${text.replace(/</g,'&lt;')}"`;
        messages.appendChild(botNode);
        field.value = '';
        messages.scrollTop = messages.scrollHeight;
    });
});
