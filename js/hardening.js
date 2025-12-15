(() => {
  // Clickjacking
  if (top !== self) top.location = self.location;

  // Bloqueo mixed-content (best-effort)
  document.querySelectorAll('img,script,link').forEach(n=>{
    const u=n.src||n.href; if(u && u.startsWith('http://')) n.remove();
  });

  // CSP soft
  const m=document.createElement('meta');
  m.httpEquiv='Content-Security-Policy';
  m.content="default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'";
  document.head.appendChild(m);
})();
