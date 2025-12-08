(function(){
  try {
    if (window.DISABLE_EXTERNAL_APIS === true || window.DISABLE_EXTERNAL_APIS === 'true' || typeof window.google === 'undefined' || !window.google.payments) {
      // render a disabled placeholder button
      const container = document.getElementById('google-pay-button');
      if (container) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-accent';
        btn.innerText = 'Google Pay (disabled)';
        btn.disabled = true;
        container.appendChild(btn);
      }
      return;
    }

    // Google Pay integration removed to comply with repository policy.
    const container = document.getElementById('google-pay-button');
    if (container) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline-accent';
      btn.innerText = 'Google Pay (disabled)';
      btn.disabled = true;
      container.appendChild(btn);
    }
  } catch (e) {
    // noop
  }
})();
