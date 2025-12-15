(()=>{
  const enc = s => btoa(unescape(encodeURIComponent(s)));
  const dec = s => decodeURIComponent(escape(atob(s)));

  const MAIL = enc('contact@neuralgpt.store'); // oculto en base64

  const form = document.getElementById('contact-form');
  if(!form) return;

  const ok = m => alert(m);
  const err = m => alert(m);

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(form);
    const name = fd.get('name')?.trim();
    const email = fd.get('email')?.trim();
    const msg = fd.get('message')?.trim();

    if(!name || !email || !msg){ err('Completa todos los campos'); return; }
    if(!/^[^@]+@[^@]+\.[^@]+$/.test(email)){ err('Email no válido'); return; }

    // mailto seguro (sin mostrar email en DOM)
    const to = dec(MAIL);
    const subj = encodeURIComponent('Contacto web');
    const body = encodeURIComponent(Nombre: \nEmail: \n\n);
    window.location.href = mailto:?subject=&body=;
    ok('Mensaje preparado. Tu cliente de correo se abrirá.');
    form.reset();
  });
})();
