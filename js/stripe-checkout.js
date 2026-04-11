/**
 * neuralgpt.store — Stripe Checkout Integration
 * Modelo: vendedor aloja su propio software (URL externa verificada).
 * neuralgpt.store gestiona el pago, descuenta 15% de comisión (20% desde 01/09/2025),
 * y redirige al comprador a la URL de descarga del vendedor tras pago confirmado.
 *
 * Publishable key: pk_live_51TKPzPFVnpodYhTUtPyC5tj6Z1G4KGxSUJAeUDnRboLrXC8esbM4dWw9KAlmiuGMZ7muaCTXSp9rVKrlfBK5fnUu00S71dcQCV
 */

(function () {
  'use strict';

  const STRIPE_PK = 'pk_live_51TKPzPFVnpodYhTUtPyC5tj6Z1G4KGxSUJAeUDnRboLrXC8esbM4dWw9KAlmiuGMZ7muaCTXSp9rVKrlfBK5fnUu00S71dcQCV';
  const COMMISSION_LAUNCH = 0.15;   // hasta 2025-09-01
  const COMMISSION_STANDARD = 0.20; // desde 2025-09-01
  const COMMISSION_CUTOFF = new Date('2025-09-01T00:00:00Z');

  let stripeInstance = null;

  /** Devuelve la comisión vigente según la fecha actual */
  function currentCommission() {
    return new Date() < COMMISSION_CUTOFF ? COMMISSION_LAUNCH : COMMISSION_STANDARD;
  }

  /** Inicializa Stripe de forma lazy */
  function getStripe() {
    if (!stripeInstance) {
      if (typeof Stripe === 'undefined') {
        console.error('[Stripe] Librería Stripe.js no cargada. Asegúrate de incluir https://js.stripe.com/v3/ antes de este script.');
        return null;
      }
      stripeInstance = Stripe(STRIPE_PK);
    }
    return stripeInstance;
  }

  /**
   * Lanza el flujo de compra para un producto.
   * @param {Object} product - Producto de products-stripe.json
   * @param {HTMLElement} [btn] - Botón que lanzó la compra (para feedback visual)
   */
  async function checkout(product, btn) {
    const stripe = getStripe();
    if (!stripe) {
      showError('Error al inicializar el sistema de pago. Recarga la página e inténtalo de nuevo.');
      return;
    }

    if (!product || !product.price_id) {
      showError('Producto no encontrado o configuración de precio incorrecta.');
      return;
    }

    // Feedback visual en el botón
    const originalText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Procesando…';
    }

    try {
      // En producción, la sesión de checkout la crea tu backend (Cloud Function, API route, etc.)
      // para no exponer la secret key. Aquí llamamos a tu endpoint serverless.
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          price_id: product.price_id,
          price_eur: product.price_eur,
          product_name: product.name,
          download_url: product.download_url,
          commission_rate: currentCommission()
        })
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();

      if (!data.session_id) {
        throw new Error('No se recibió session_id del servidor.');
      }

      // Redirigir a Stripe Checkout
      const { error } = await stripe.redirectToCheckout({ sessionId: data.session_id });

      if (error) {
        throw new Error(error.message);
      }

    } catch (err) {
      console.error('[Stripe Checkout]', err);
      showError('No se pudo procesar el pago: ' + (err.message || 'Error desconocido. Inténtalo de nuevo.'));
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
  }

  /**
   * Carga products-stripe.json y devuelve el array de productos.
   * @returns {Promise<Array>}
   */
  async function loadProducts() {
    try {
      const res = await fetch('/data/products-stripe.json');
      if (!res.ok) throw new Error('No se pudo cargar products-stripe.json');
      return await res.json();
    } catch (err) {
      console.error('[Stripe] Error cargando productos:', err);
      return [];
    }
  }

  /**
   * Inicializa los botones de compra en la página actual.
   * Busca todos los elementos con [data-stripe-buy] y les asigna el handler de checkout.
   * Uso en HTML: <button data-stripe-buy="ghostwriter" class="btn btn-primary">Comprar ahora</button>
   */
  async function initBuyButtons() {
    const buttons = document.querySelectorAll('[data-stripe-buy]');
    if (!buttons.length) return;

    const products = await loadProducts();

    buttons.forEach(btn => {
      const productId = btn.dataset.stripeBuy;
      const product = products.find(p => p.id === productId);

      if (!product) {
        console.warn('[Stripe] Producto no encontrado en products-stripe.json:', productId);
        return;
      }

      // Inyectar precio si el botón tiene [data-show-price]
      if (btn.dataset.showPrice !== undefined) {
        btn.textContent = `Comprar ahora — ${product.price_eur}€`;
      }

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        checkout(product, btn);
      });
    });
  }

  /**
   * Muestra un mensaje de error al usuario de forma no intrusiva.
   * @param {string} msg
   */
  function showError(msg) {
    // Buscar contenedor de error en la página
    const container = document.getElementById('stripe-error') || document.querySelector('.stripe-error');
    if (container) {
      container.textContent = msg;
      container.style.display = 'block';
      setTimeout(() => { container.style.display = 'none'; }, 8000);
      return;
    }
    // Fallback: alerta nativa
    alert('Error en el pago: ' + msg);
  }

  /**
   * Maneja el retorno desde Stripe (success/cancel).
   * Llama a esta función en la página de confirmación de compra.
   */
  function handleReturn() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment');
    const sessionId = params.get('session_id');

    if (status === 'success' && sessionId) {
      // Verificar el pago y obtener la URL de descarga desde el servidor
      fetch(`/api/verify-payment?session_id=${encodeURIComponent(sessionId)}`)
        .then(r => r.json())
        .then(data => {
          if (data.download_url) {
            // Redirigir a la URL de descarga del vendedor
            window.location.href = data.download_url;
          } else {
            console.warn('[Stripe] Pago verificado pero sin download_url.');
          }
        })
        .catch(err => console.error('[Stripe] Error verificando pago:', err));
    }

    if (status === 'cancel') {
      // Pago cancelado: mostrar mensaje y redirigir al marketplace
      console.log('[Stripe] Pago cancelado por el usuario.');
    }
  }

  // API pública
  window.NeuralStripe = {
    checkout,
    initBuyButtons,
    handleReturn,
    loadProducts,
    currentCommission,
    COMMISSION_LAUNCH,
    COMMISSION_STANDARD
  };

  // Auto-inicializar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBuyButtons);
  } else {
    initBuyButtons();
  }

})();
