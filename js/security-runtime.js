(() => {
  // Anti-clickjacking
  if (window.top !== window.self) window.top.location = window.self.location;

  // CSP soft-check (runtime hints)
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'";
  document.head.appendChild(meta);
})();
