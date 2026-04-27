(function(){
  var toggle=document.getElementById('nav-toggle'),nav=document.getElementById('main-nav');
  if(toggle&&nav) toggle.addEventListener('click',function(){var o=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',o);});

  var accessForm    = document.getElementById('access-form');
  var accessMsg     = document.getElementById('access-msg');
  var accessBtn     = document.getElementById('access-btn');
  var accessPanel   = document.getElementById('access-panel');
  var editPanel     = document.getElementById('edit-panel');
  var editForm      = document.getElementById('edit-form');
  var editMsg       = document.getElementById('edit-msg');
  var editBtn       = document.getElementById('edit-btn');
  var cancelBtn     = document.getElementById('edit-cancel-btn');
  var imagesInput   = document.getElementById('ef-images');
  var imagesHint    = document.getElementById('ef-images-hint');

  var _editKey = '';
  var _listingId = '';

  accessForm.addEventListener('submit', async function(e){
    e.preventDefault();
    var lid = document.getElementById('access-listing-id').value.trim();
    var ek  = document.getElementById('access-edit-key').value.trim();
    if (!lid || !ek) {
      accessMsg.textContent = 'Introduce el ID del anuncio y la clave de edición.';
      accessMsg.style.color = 'var(--accent3)';
      return;
    }
    accessBtn.disabled = true;
    accessMsg.textContent = 'Verificando...';
    accessMsg.style.color = 'var(--muted)';
    if (!window.NeuralRuntime || window.NeuralRuntime.backendReady !== true) {
      accessMsg.textContent = 'La edición no está disponible en este despliegue estático (requiere backend /api/*).';
      accessMsg.style.color = 'var(--accent3)';
      accessBtn.disabled = false;
      return;
    }
    try {
      var res = await fetch(window.NeuralRuntime.api('/listings/status') + '?listing_id=' + encodeURIComponent(lid) + '&edit_key=' + encodeURIComponent(ek));
      var data = await res.json();
      if (res.status === 403) {
        accessMsg.textContent = 'Clave de edición incorrecta.';
        accessMsg.style.color = 'var(--accent3)';
        return;
      }
      if (res.status === 404) {
        accessMsg.textContent = 'Anuncio no encontrado con ese ID.';
        accessMsg.style.color = 'var(--accent3)';
        return;
      }
      if (!res.ok || !data || !data.ok) {
        accessMsg.textContent = 'Error al verificar: ' + (data && data.error ? data.error : 'error desconocido');
        accessMsg.style.color = 'var(--accent3)';
        return;
      }
      _editKey = ek;
      _listingId = lid;
      loadEditForm(data.listing);
    } catch(_) {
      accessMsg.textContent = 'Error de red. Inténtalo de nuevo.';
      accessMsg.style.color = 'var(--accent3)';
    } finally {
      accessBtn.disabled = false;
    }
  });

  function loadEditForm(l){
    document.getElementById('ef-listing-id').value  = l.id || '';
    document.getElementById('ef-target-id').value   = l.id || '';
    document.getElementById('ef-slug').value         = l.slug || '';
    document.getElementById('ef-operation').value    = l.operation || '';
    document.getElementById('ef-asset-type').value   = l.asset_type || '';
    document.getElementById('ef-country').value      = l.country || '';
    document.getElementById('ef-region').value       = l.region || '';
    document.getElementById('ef-edit-key').value     = _editKey;
    document.getElementById('ef-title').value        = l.title || '';
    document.getElementById('ef-price').value        = l.price != null ? l.price : '';
    document.getElementById('ef-summary').value      = l.summary || '';
    document.getElementById('ef-description').value  = l.description || '';
    document.getElementById('ef-surface').value      = l.surface_m2 != null ? l.surface_m2 : '';
    document.getElementById('ef-rooms').value        = l.rooms != null ? l.rooms : '';
    document.getElementById('ef-contact-name').value = l.contact_name || '';
    document.getElementById('ef-contact-phone').value= l.contact_phone || '';
    document.getElementById('ef-contact-email').value= l.contact_email || '';
    document.getElementById('ef-city').value         = l.city || '';
    document.getElementById('ef-zone').value         = l.zone || '';
    if (imagesHint) {
      var currentCount = Array.isArray(l.images) ? l.images.length : 0;
      imagesHint.textContent = currentCount > 0
        ? 'Actualmente hay ' + currentCount + ' foto(s). Si subes nuevas, reemplazarán las actuales.'
        : 'Actualmente no hay fotos. Puedes subir hasta 6.';
    }
    document.getElementById('edit-listing-title').textContent = l.title || '';
    accessPanel.style.display = 'none';
    editPanel.style.display   = 'block';
  }

  cancelBtn.addEventListener('click', function(){
    editPanel.style.display   = 'none';
    accessPanel.style.display = 'block';
    editMsg.textContent = '';
  });

  editForm.addEventListener('submit', async function(e){
    e.preventDefault();
    editBtn.disabled = true;
    editMsg.textContent = 'Guardando cambios...';
    editMsg.style.color = 'var(--muted)';
    var cName = (document.getElementById('ef-contact-name').value || '').trim();
    var cPhone = (document.getElementById('ef-contact-phone').value || '').trim();
    var cEmail = (document.getElementById('ef-contact-email').value || '').trim();
    if (!cName || !cPhone || cPhone.length < 7 || !cEmail) {
      editMsg.textContent = 'Debes informar nombre, teléfono y correo de contacto.';
      editMsg.style.color = 'var(--accent3)';
      editBtn.disabled = false;
      return;
    }
    if (imagesInput && imagesInput.files && imagesInput.files.length > 6) {
      editMsg.textContent = 'Máximo 6 fotos por anuncio.';
      editMsg.style.color = 'var(--accent3)';
      editBtn.disabled = false;
      return;
    }
    try {
      if (!window.NeuralRuntime || window.NeuralRuntime.backendReady !== true) {
        editMsg.textContent = 'La actualización no está disponible en este despliegue estático (requiere backend /api/*).';
        editMsg.style.color = 'var(--accent3)';
        return;
      }
      var fd = new FormData(editForm);
      fd.set('hp_check', '');
      var res = await fetch(window.NeuralRuntime.api('/listings/upsert'), { method: 'POST', body: fd });
      var data = await res.json();
      if (!res.ok || !data || data.ok !== true) {
        var code = data && data.error ? String(data.error) : 'actualizacion_fallida';
        if (code === 'content_policy_blocked') {
          editMsg.textContent = 'El anuncio no supera la política de contenido inmobiliario.';
        } else if (code.indexOf('advertiser_contact_required_fields_missing') === 0) {
          editMsg.textContent = 'Debes informar nombre, teléfono y correo del anunciante.';
        } else {
          editMsg.textContent = 'Error: ' + code;
        }
        editMsg.style.color = 'var(--accent3)';
        return;
      }
      try {
        sessionStorage.setItem('neuralgpt_confirm', JSON.stringify({
          listing_id:    data.listing_id   || _listingId,
          listing_slug:  data.listing_slug || '',
          mode:          data.mode         || 'updated',
          edit_key:      null,
          review_required: !!(
            (data.duplicate_review && data.duplicate_review.review_required) ||
            (data.content_policy && data.content_policy.review_required)
          ),
          abuse_blocked:   !!(data.duplicate_review && data.duplicate_review.duplicate_abuse_blocked)
        }));
        window.location.href = '/confirm.html';
      } catch(_) {
        editMsg.textContent = 'Actualización guardada correctamente.';
        editMsg.style.color = 'var(--accent4)';
      }
    } catch(_) {
      editMsg.textContent = 'Error de red. Inténtalo de nuevo.';
      editMsg.style.color = 'var(--accent3)';
    } finally {
      editBtn.disabled = false;
    }
  });
})();
