/**
 * Barra de búsqueda inteligente
 * Features: autocompletado, voz, filtros, historial
 */
(function() {
  'use strict';

  const LISTINGS_URL = '/public-data/listings.public.json';
  const HISTORY_KEY = 'neuralgpt_search_history';
  const MAX_HISTORY = 10;
  const MAX_SUGGESTIONS = 8;

  let listings = [];
  let searchHistory = [];
  let currentFilters = {
    operation: 'all', // 'all', 'sale', 'rent'
    maxPrice: '',
    minSurface: '',
    rooms: ''
  };

  // Inicializar
  function init() {
    loadListings();
    loadHistory();
    setupEventListeners();
  }

  // Cargar listings
  async function loadListings() {
    try {
      const response = await fetch(LISTINGS_URL);
      if (response.ok) {
        const data = await response.json();
        listings = Array.isArray(data) ? data.filter(l => l.status === 'published') : [];
      }
    } catch (e) {
      console.warn('[SmartSearch] Error loading listings:', e);
    }
  }

  // Cargar historial
  function loadHistory() {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        searchHistory = JSON.parse(stored);
      }
    } catch (e) {
      searchHistory = [];
    }
  }

  // Guardar en historial
  function saveToHistory(query) {
    if (!query || query.trim().length < 2) return;

    const normalized = query.trim().toLowerCase();

    // Eliminar duplicados
    searchHistory = searchHistory.filter(h => h.toLowerCase() !== normalized);

    // Añadir al inicio
    searchHistory.unshift(query.trim());

    // Limitar tamaño
    if (searchHistory.length > MAX_HISTORY) {
      searchHistory = searchHistory.slice(0, MAX_HISTORY);
    }

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(searchHistory));
    } catch (e) {
      // Silenciar error de localStorage
    }
  }

  // Limpiar historial
  function clearHistory() {
    searchHistory = [];
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {}
    hideSuggestions();
  }

  // Setup event listeners
  function setupEventListeners() {
    const input = document.getElementById('smart-search-input');
    const voiceBtn = document.getElementById('smart-search-voice');
    const clearBtn = document.getElementById('smart-search-clear');
    const submitBtn = document.getElementById('smart-search-submit');
    const form = document.getElementById('smart-search-form');

    if (input) {
      input.addEventListener('input', handleInput);
      input.addEventListener('focus', handleFocus);
      input.addEventListener('keydown', handleKeydown);
    }

    if (voiceBtn && 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      voiceBtn.addEventListener('click', startVoiceSearch);
      voiceBtn.style.display = 'block';
    } else if (voiceBtn) {
      voiceBtn.style.display = 'none';
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', clearInput);
    }

    if (form) {
      form.addEventListener('submit', handleSubmit);
    }

    // Filters
    document.querySelectorAll('.smart-search-filter-btn[data-operation]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentFilters.operation = btn.dataset.operation;
        updateFilterButtons();
      });
    });

    ['maxPrice', 'minSurface', 'rooms'].forEach(key => {
      const input = document.getElementById(`filter-${key}`);
      if (input) {
        input.addEventListener('input', (e) => {
          currentFilters[key] = e.target.value;
        });
      }
    });

    // Click fuera cierra sugerencias
    document.addEventListener('click', (e) => {
      const container = document.querySelector('.smart-search-container');
      if (container && !container.contains(e.target)) {
        hideSuggestions();
      }
    });
  }

  // Handle input
  function handleInput(e) {
    const query = e.target.value;

    if (query.trim().length === 0) {
      hideSuggestions();
      return;
    }

    if (query.trim().length < 2) {
      return; // Esperar al menos 2 caracteres
    }

    showSuggestions(query);
  }

  // Handle focus
  function handleFocus(e) {
    const query = e.target.value;
    if (query.trim().length >= 2) {
      showSuggestions(query);
    } else if (searchHistory.length > 0) {
      showHistorySuggestions();
    }
  }

  // Handle keydown
  function handleKeydown(e) {
    const suggestions = document.querySelector('.smart-search-suggestions');
    if (!suggestions || !suggestions.classList.contains('show')) return;

    const items = suggestions.querySelectorAll('.smart-search-suggestion-item');
    const active = suggestions.querySelector('.smart-search-suggestion-item.active');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!active) {
        items[0]?.classList.add('active');
      } else {
        const index = Array.from(items).indexOf(active);
        active.classList.remove('active');
        items[index + 1]?.classList.add('active') || items[0]?.classList.add('active');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (active) {
        const index = Array.from(items).indexOf(active);
        active.classList.remove('active');
        if (index > 0) {
          items[index - 1]?.classList.add('active');
        } else {
          items[items.length - 1]?.classList.add('active');
        }
      }
    } else if (e.key === 'Enter') {
      if (active) {
        e.preventDefault();
        active.click();
      }
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  }

  // Show suggestions
  function showSuggestions(query) {
    const normalized = query.toLowerCase().trim();
    const suggestions = [];

    // Buscar en listings
    listings.forEach(listing => {
      const score = calculateRelevance(listing, normalized);
      if (score > 0) {
        suggestions.push({ type: 'listing', data: listing, score });
      }
    });

    // Ordenar por relevancia
    suggestions.sort((a, b) => b.score - a.score);

    // Sugerencias inteligentes
    const smart = generateSmartSuggestions(normalized);

    renderSuggestions(suggestions.slice(0, MAX_SUGGESTIONS), smart);
  }

  // Calculate relevance
  function calculateRelevance(listing, query) {
    let score = 0;
    const terms = query.split(/\s+/);

    terms.forEach(term => {
      if (!term) return;

      // Ciudad (peso alto)
      if (listing.city && listing.city.toLowerCase().includes(term)) score += 10;

      // Título (peso medio)
      if (listing.title && listing.title.toLowerCase().includes(term)) score += 5;

      // Tipo de activo
      if (listing.asset_type && listing.asset_type.toLowerCase().includes(term)) score += 4;

      // Operación
      if (listing.operation && listing.operation.toLowerCase().includes(term)) score += 3;

      // País/región
      if (listing.country && listing.country.toLowerCase().includes(term)) score += 2;
      if (listing.region && listing.region.toLowerCase().includes(term)) score += 2;
    });

    return score;
  }

  // Generate smart suggestions
  function generateSmartSuggestions(query) {
    const suggestions = [];
    const cities = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Málaga', 'Bilbao'];
    const types = [
      { label: 'Pisos', value: 'apartment' },
      { label: 'Chalets', value: 'house' },
      { label: 'Áticos', value: 'penthouse' },
      { label: 'Locales', value: 'commercial_unit' }
    ];

    // Sugerencias de ciudad + tipo
    cities.forEach(city => {
      if (city.toLowerCase().includes(query)) {
        suggestions.push({
          icon: '🏙️',
          text: `Todos los inmuebles en ${city}`,
          action: () => navigateToSearch({ city })
        });

        types.forEach(type => {
          suggestions.push({
            icon: '🏠',
            text: `${type.label} en ${city}`,
            action: () => navigateToSearch({ city, asset_type: type.value })
          });
        });
      }
    });

    return suggestions.slice(0, 4);
  }

  // Show history suggestions
  function showHistorySuggestions() {
    if (searchHistory.length === 0) return;

    const container = document.querySelector('.smart-search-suggestions');
    if (!container) return;

    container.innerHTML = `
      <div class="smart-search-suggestion-group">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0 16px 8px">
          <div class="smart-search-suggestion-header">Búsquedas recientes</div>
          <button class="smart-search-history-clear" onclick="window.SmartSearch.clearHistory()">Borrar</button>
        </div>
        ${searchHistory.map(query => `
          <div class="smart-search-suggestion-item" onclick="window.SmartSearch.selectQuery('${escapeHtml(query)}')">
            <span class="smart-search-suggestion-icon">🕒</span>
            <span class="smart-search-suggestion-text">${escapeHtml(query)}</span>
          </div>
        `).join('')}
      </div>
    `;

    container.classList.add('show');
  }

  // Render suggestions
  function renderSuggestions(listingSuggestions, smartSuggestions) {
    const container = document.querySelector('.smart-search-suggestions');
    if (!container) return;

    let html = '';

    // Smart suggestions
    if (smartSuggestions.length > 0) {
      html += `
        <div class="smart-search-suggestion-group">
          <div class="smart-search-suggestion-header">Sugerencias</div>
          ${smartSuggestions.map((sug, idx) => `
            <div class="smart-search-suggestion-item" data-smart-idx="${idx}">
              <span class="smart-search-suggestion-icon">${sug.icon}</span>
              <span class="smart-search-suggestion-text">${escapeHtml(sug.text)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Listing suggestions
    if (listingSuggestions.length > 0) {
      html += `
        <div class="smart-search-suggestion-group">
          <div class="smart-search-suggestion-header">Inmuebles</div>
          ${listingSuggestions.map(sug => {
            const listing = sug.data;
            const price = formatPrice(listing);
            return `
              <div class="smart-search-suggestion-item" data-slug="${escapeHtml(listing.slug || listing.id)}">
                <span class="smart-search-suggestion-icon">🏠</span>
                <span class="smart-search-suggestion-text">${escapeHtml(listing.title)}</span>
                <span class="smart-search-suggestion-meta">${price} · ${escapeHtml(listing.city || '')}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (html === '') {
      html = '<div class="smart-search-empty">No se encontraron resultados</div>';
    }

    container.innerHTML = html;
    container.classList.add('show');

    // Event listeners para suggestions
    container.querySelectorAll('[data-slug]').forEach(el => {
      el.addEventListener('click', () => {
        const slug = el.dataset.slug;
        window.location.href = `/listing.html?slug=${encodeURIComponent(slug)}`;
      });
    });

    container.querySelectorAll('[data-smart-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.smartIdx);
        if (smartSuggestions[idx] && smartSuggestions[idx].action) {
          smartSuggestions[idx].action();
        }
      });
    });
  }

  // Hide suggestions
  function hideSuggestions() {
    const container = document.querySelector('.smart-search-suggestions');
    if (container) {
      container.classList.remove('show');
    }
  }

  // Clear input
  function clearInput() {
    const input = document.getElementById('smart-search-input');
    if (input) {
      input.value = '';
      input.focus();
      hideSuggestions();
    }
  }

  // Voice search
  function startVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    const voiceBtn = document.getElementById('smart-search-voice');
    const input = document.getElementById('smart-search-input');

    voiceBtn.classList.add('listening');

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (input) {
        input.value = transcript;
        handleInput({ target: input });
      }
      voiceBtn.classList.remove('listening');
    };

    recognition.onerror = () => {
      voiceBtn.classList.remove('listening');
    };

    recognition.onend = () => {
      voiceBtn.classList.remove('listening');
    };

    recognition.start();
  }

  // Handle submit
  function handleSubmit(e) {
    e.preventDefault();

    const input = document.getElementById('smart-search-input');
    const query = input ? input.value.trim() : '';

    if (query) {
      saveToHistory(query);
    }

    navigateToSearch({ query, ...currentFilters });
  }

  // Navigate to search
  function navigateToSearch(params) {
    const { query, operation, city, asset_type, maxPrice, minSurface, rooms } = params;

    // Determinar página destino
    let targetPage = '/real-estate-index.html';

    if (operation === 'sale') {
      targetPage = '/venta.html';
    } else if (operation === 'rent') {
      targetPage = '/alquiler.html';
    } else if (currentFilters.operation === 'sale') {
      targetPage = '/venta.html';
    } else if (currentFilters.operation === 'rent') {
      targetPage = '/alquiler.html';
    }

    // Construir query string
    const urlParams = new URLSearchParams();

    if (query) urlParams.set('q', query);
    if (city) urlParams.set('city', city);
    if (asset_type) urlParams.set('type', asset_type);
    if (maxPrice) urlParams.set('maxPrice', maxPrice);
    if (minSurface) urlParams.set('minSurface', minSurface);
    if (rooms) urlParams.set('rooms', rooms);

    const queryString = urlParams.toString();
    window.location.href = targetPage + (queryString ? '?' + queryString : '');
  }

  // Update filter buttons
  function updateFilterButtons() {
    document.querySelectorAll('.smart-search-filter-btn[data-operation]').forEach(btn => {
      if (btn.dataset.operation === currentFilters.operation) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Format price
  function formatPrice(listing) {
    const price = Number(listing.price) || 0;
    if (price === 0) return 'Precio a consultar';
    return price.toLocaleString('es-ES') + ' €';
  }

  // Escape HTML
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // Select query from history/suggestion
  function selectQuery(query) {
    const input = document.getElementById('smart-search-input');
    if (input) {
      input.value = query;
      input.focus();
      showSuggestions(query);
    }
  }

  // Export public API
  window.SmartSearch = {
    clearHistory,
    selectQuery
  };

  // Initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
