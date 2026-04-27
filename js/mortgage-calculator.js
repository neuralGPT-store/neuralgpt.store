/**
 * mortgage-calculator.js — Calculadora de hipoteca en JS puro
 * Calcula cuota mensual, total pagado y total intereses
 */

(function() {
  'use strict';

  /**
   * Inicializa la calculadora de hipoteca
   * @param {number} listingPrice - Precio del inmueble (se usa como valor por defecto)
   */
  window.initMortgageCalculator = function(listingPrice) {
    const calculator = document.getElementById('mortgage-calculator');
    if (!calculator) return;

    const toggleBtn = document.getElementById('mortgage-toggle');
    const content = document.getElementById('mortgage-content');
    const priceInput = document.getElementById('mortgage-price');
    const downPaymentInput = document.getElementById('mortgage-down-payment');
    const yearsInput = document.getElementById('mortgage-years');
    const interestInput = document.getElementById('mortgage-interest');
    const calculateBtn = document.getElementById('mortgage-calculate');
    const resultsDiv = document.getElementById('mortgage-results');

    // Pre-rellenar precio del inmueble
    if (listingPrice && priceInput) {
      priceInput.value = listingPrice;
    }

    // Toggle expandir/colapsar
    if (toggleBtn && content) {
      toggleBtn.addEventListener('click', () => {
        const isExpanded = content.style.display === 'block';
        content.style.display = isExpanded ? 'none' : 'block';
        toggleBtn.textContent = isExpanded ? '▼ Calculadora de hipoteca' : '▲ Ocultar calculadora';
        toggleBtn.setAttribute('aria-expanded', !isExpanded);
      });
    }

    // Calcular hipoteca
    if (calculateBtn) {
      calculateBtn.addEventListener('click', calculateMortgage);
    }

    // También calcular al cambiar los inputs
    [priceInput, downPaymentInput, yearsInput, interestInput].forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          if (priceInput.value && downPaymentInput.value && yearsInput.value && interestInput.value) {
            calculateMortgage();
          }
        });
      }
    });

    function calculateMortgage() {
      const price = parseFloat(priceInput.value) || 0;
      const downPaymentPercent = parseFloat(downPaymentInput.value) || 0;
      const years = parseInt(yearsInput.value) || 0;
      const interestRate = parseFloat(interestInput.value) || 0;

      if (price <= 0 || downPaymentPercent < 0 || downPaymentPercent >= 100 || years <= 0 || interestRate < 0) {
        showError('Por favor, introduce valores válidos');
        return;
      }

      // Cálculo de hipoteca
      const downPayment = price * (downPaymentPercent / 100);
      const loanAmount = price - downPayment;
      const monthlyInterestRate = (interestRate / 100) / 12;
      const numberOfPayments = years * 12;

      let monthlyPayment;
      if (interestRate === 0) {
        // Sin intereses
        monthlyPayment = loanAmount / numberOfPayments;
      } else {
        // Fórmula de cuota mensual: M = P * [i(1 + i)^n] / [(1 + i)^n - 1]
        const factor = Math.pow(1 + monthlyInterestRate, numberOfPayments);
        monthlyPayment = loanAmount * (monthlyInterestRate * factor) / (factor - 1);
      }

      const totalPaid = monthlyPayment * numberOfPayments;
      const totalInterest = totalPaid - loanAmount;

      showResults({
        monthlyPayment,
        totalPaid,
        totalInterest,
        loanAmount,
        downPayment
      });
    }

    function showResults(data) {
      if (!resultsDiv) return;

      resultsDiv.style.display = 'block';
      resultsDiv.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div style="background:rgba(0,245,255,0.08);border:1.5px solid rgba(0,245,255,0.3);border-radius:var(--radius);padding:16px;text-align:center">
            <div style="font-size:0.75rem;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Cuota mensual</div>
            <div style="font-size:1.8rem;font-weight:700;color:var(--accent);font-family:var(--font-title)">${formatCurrency(data.monthlyPayment)}</div>
          </div>
          <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius);padding:16px;text-align:center">
            <div style="font-size:0.75rem;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Total a pagar</div>
            <div style="font-size:1.8rem;font-weight:700;color:var(--text);font-family:var(--font-title)">${formatCurrency(data.totalPaid)}</div>
          </div>
        </div>
        <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius);padding:14px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:0.85rem;color:var(--muted)">Importe préstamo:</span>
            <span style="font-size:0.85rem;font-weight:600;color:var(--text)">${formatCurrency(data.loanAmount)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:0.85rem;color:var(--muted)">Entrada (${document.getElementById('mortgage-down-payment').value}%):</span>
            <span style="font-size:0.85rem;font-weight:600;color:var(--text)">${formatCurrency(data.downPayment)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:8px;margin-top:8px">
            <span style="font-size:0.85rem;color:var(--muted)">Total intereses:</span>
            <span style="font-size:0.85rem;font-weight:600;color:#FF6B6B">${formatCurrency(data.totalInterest)}</span>
          </div>
        </div>
        <p style="font-size:0.75rem;color:var(--muted);margin-top:12px;margin-bottom:0;text-align:center">
          * Cálculo estimado. Consulta con tu banco las condiciones reales.
        </p>
      `;
    }

    function showError(message) {
      if (!resultsDiv) return;

      resultsDiv.style.display = 'block';
      resultsDiv.innerHTML = `
        <div style="background:rgba(255,107,107,0.1);border:1.5px solid rgba(255,107,107,0.3);border-radius:var(--radius);padding:16px;text-align:center;color:#FF6B6B">
          ${message}
        </div>
      `;
    }

    function formatCurrency(amount) {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    }
  };

})();
