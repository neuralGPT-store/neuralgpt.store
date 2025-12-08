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

        try {
            const resp = await fetch('/irene/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            if (!resp.ok) throw new Error('Irene API error');
            const data = await resp.json();
            const botNode = document.createElement('div');
            botNode.innerHTML = `<b>Irene:</b> ${data.reply || data.response || ''}`;
            messages.appendChild(botNode);
            field.value = '';
            messages.scrollTop = messages.scrollHeight;
        } catch (err) {
            console.error('Irene chat error:', err);
            const errNode = document.createElement('div');
            errNode.innerHTML = `<b>Irene:</b> Error fetching reply.`;
            messages.appendChild(errNode);
        }
    });
});
