function createEmailHandlers(env) {
  async function sendEmail({ to, subject, html }) {
    if (!env.RESEND_API_KEY) return { ok: false, reason: 'no_resend_key' };
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.RESEND_API_KEY },
        body: JSON.stringify({ from: 'Loventy <noreply@neuralgpt.store>', to, subject, html })
      });
      return { ok: res.ok, status: res.status };
    } catch { return { ok: false, reason: 'fetch_error' }; }
  }

  function welcomeEmail(name) {
    return '<h2>Bienvenido a neuralgpt.store, ' + name + '</h2><p>Tu cuenta esta activa. Explora el directorio y encuentra el cuidado que tu familiar merece.</p><p>El equipo de neuralgpt.store</p>';
  }

  function providerApprovedEmail(name) {
    return '<h2>Tu ficha ha sido aprobada</h2><p>Hola ' + name + ', tu ficha ya es visible en el directorio de neuralgpt.store. Las familias ya pueden encontrarte.</p>';
  }

  function providerRejectedEmail(name, reason) {
    return '<h2>Tu ficha necesita ajustes</h2><p>Hola ' + name + ', hemos revisado tu ficha y necesita algunos cambios: ' + reason + '</p><p>Puedes editarla y volver a enviarla.</p>';
  }

  return { sendEmail, welcomeEmail, providerApprovedEmail, providerRejectedEmail };
}

export { createEmailHandlers };
