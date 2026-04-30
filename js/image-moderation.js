/**
 * NSFWJS Image Moderation
 * Client-side image content moderation for neuralgpt.store
 */

(function() {
  'use strict';

  const MODERATION_THRESHOLDS = {
    porn: 0.6,
    hentai: 0.6,
    sexy: 0.7
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MIN_WIDTH = 400;
  const MIN_HEIGHT = 300;
  const MAX_IMAGES = 6;
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  let nsfwModel = null;
  let moderationResults = new Map();

  // Load TensorFlow.js and NSFWJS
  async function loadModels() {
    if (nsfwModel) return nsfwModel;

    try {
      // Load TensorFlow.js
      if (!window.tf) {
        const tfScript = document.createElement('script');
        tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0/dist/tf.min.js';
        document.head.appendChild(tfScript);
        await new Promise((resolve, reject) => {
          tfScript.onload = resolve;
          tfScript.onerror = reject;
        });
      }

      // Load NSFWJS
      if (!window.nsfwjs) {
        const nsfwScript = document.createElement('script');
        nsfwScript.src = 'https://unpkg.com/nsfwjs@2.4.2/dist/nsfwjs.min.js';
        document.head.appendChild(nsfwScript);
        await new Promise((resolve, reject) => {
          nsfwScript.onload = resolve;
          nsfwScript.onerror = reject;
        });
      }

      // Load NSFWJS model
      nsfwModel = await nsfwjs.load();
      return nsfwModel;
    } catch (error) {
      console.error('[Moderation] Error loading models:', error);
      throw new Error('No se pudo cargar el sistema de moderación');
    }
  }

  // Validate file basic constraints
  function validateFileBasics(file) {
    const errors = [];

    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push('Formato no permitido. Solo JPEG, PNG y WEBP.');
    }

    if (file.size > MAX_FILE_SIZE) {
      errors.push(`Tamaño máximo: 5MB (actual: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    }

    return errors;
  }

  // Validate image dimensions
  async function validateImageDimensions(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = function() {
        URL.revokeObjectURL(objectUrl);
        if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
          resolve([`Dimensiones mínimas: ${MIN_WIDTH}x${MIN_HEIGHT}px (actual: ${img.width}x${img.height}px)`]);
        } else {
          resolve([]);
        }
      };

      img.onerror = function() {
        URL.revokeObjectURL(objectUrl);
        resolve(['No se pudo leer la imagen']);
      };

      img.src = objectUrl;
    });
  }

  // Classify image with NSFWJS
  async function classifyImage(file) {
    const model = await loadModels();
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    return new Promise((resolve, reject) => {
      img.onload = async function() {
        try {
          const predictions = await model.classify(img);
          URL.revokeObjectURL(objectUrl);

          const results = {};
          predictions.forEach(pred => {
            results[pred.className.toLowerCase()] = pred.probability;
          });

          resolve(results);
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };

      img.onerror = function() {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Error al cargar la imagen'));
      };

      img.src = objectUrl;
    });
  }

  // Check if classification passes moderation
  function passesModeration(classification) {
    const porn = classification.porn || 0;
    const hentai = classification.hentai || 0;
    const sexy = classification.sexy || 0;

    if (porn > MODERATION_THRESHOLDS.porn) return { passed: false, reason: 'Contenido explícito detectado' };
    if (hentai > MODERATION_THRESHOLDS.hentai) return { passed: false, reason: 'Contenido explícito detectado' };
    if (sexy > MODERATION_THRESHOLDS.sexy) return { passed: false, reason: 'Contenido inapropiado detectado' };

    return { passed: true, reason: null };
  }

  // Moderate a single image
  async function moderateImage(file) {
    const result = {
      file: file,
      valid: false,
      errors: [],
      classification: null,
      moderationPassed: false
    };

    // Basic validation
    const basicErrors = validateFileBasics(file);
    if (basicErrors.length > 0) {
      result.errors = basicErrors;
      return result;
    }

    // Dimension validation
    const dimErrors = await validateImageDimensions(file);
    if (dimErrors.length > 0) {
      result.errors = dimErrors;
      return result;
    }

    // Content moderation
    try {
      result.classification = await classifyImage(file);
      const moderationCheck = passesModeration(result.classification);
      result.moderationPassed = moderationCheck.passed;

      if (!moderationCheck.passed) {
        result.errors.push('Esta imagen no cumple las normas del portal. Por favor sube una foto del inmueble.');
      } else {
        result.valid = true;
      }
    } catch (error) {
      console.error('[Moderation] Classification error:', error);
      result.errors.push('Error al analizar la imagen');
    }

    return result;
  }

  // Create preview card for an image
  function createPreviewCard(file, result) {
    const card = document.createElement('div');
    card.style.cssText = 'display:flex;gap:12px;padding:12px;border:1.5px solid;border-radius:8px;align-items:center;margin-bottom:8px';

    if (result.valid) {
      card.style.borderColor = 'rgba(0,255,153,0.3)';
      card.style.background = 'rgba(0,255,153,0.05)';
    } else {
      card.style.borderColor = 'rgba(255,70,85,0.3)';
      card.style.background = 'rgba(255,70,85,0.05)';
    }

    // Thumbnail
    const thumb = document.createElement('img');
    thumb.style.cssText = 'width:60px;height:60px;object-fit:cover;border-radius:4px;flex-shrink:0';
    const objectUrl = URL.createObjectURL(file);
    thumb.src = objectUrl;
    thumb.onload = () => URL.revokeObjectURL(objectUrl);

    // Info
    const info = document.createElement('div');
    info.style.cssText = 'flex:1;font-size:0.82rem';

    const fileName = document.createElement('div');
    fileName.style.cssText = 'font-weight:600;margin-bottom:4px;color:var(--text)';
    fileName.textContent = file.name;

    const fileSize = document.createElement('div');
    fileSize.style.cssText = 'color:var(--muted);font-size:0.75rem;margin-bottom:4px';
    fileSize.textContent = `${(file.size / 1024).toFixed(0)} KB`;

    info.appendChild(fileName);
    info.appendChild(fileSize);

    if (result.errors && result.errors.length > 0) {
      result.errors.forEach(error => {
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = 'color:var(--accent3);font-size:0.75rem;margin-top:4px';
        errorMsg.textContent = '⚠ ' + error;
        info.appendChild(errorMsg);
      });
    }

    // Status badge
    const badge = document.createElement('div');
    badge.style.cssText = 'font-size:1.5rem;flex-shrink:0';
    badge.textContent = result.valid ? '✅' : '❌';

    card.appendChild(thumb);
    card.appendChild(info);
    card.appendChild(badge);

    return card;
  }

  // Update preview display
  function updatePreviewDisplay(previewContainer, results) {
    previewContainer.innerHTML = '';

    if (results.size === 0) {
      previewContainer.style.display = 'none';
      return;
    }

    previewContainer.style.display = 'block';

    const title = document.createElement('div');
    title.style.cssText = 'font-family:var(--font-title);font-size:0.75rem;letter-spacing:1px;color:var(--accent);margin-bottom:12px';
    title.textContent = 'VISTA PREVIA DE IMÁGENES';
    previewContainer.appendChild(title);

    results.forEach((result, file) => {
      previewContainer.appendChild(createPreviewCard(file, result));
    });
  }

  // Update moderation status message
  function updateStatusMessage(statusContainer, results, isProcessing) {
    if (isProcessing) {
      statusContainer.innerHTML = '<span style="color:var(--accent2)">⏳ Verificando imágenes...</span>';
      return;
    }

    if (results.size === 0) {
      statusContainer.innerHTML = '';
      return;
    }

    const allValid = Array.from(results.values()).every(r => r.valid);
    const validCount = Array.from(results.values()).filter(r => r.valid).length;

    if (allValid) {
      statusContainer.innerHTML = `<span style="color:var(--accent4)">✅ Todas las imágenes son válidas (${validCount}/${results.size})</span>`;
    } else {
      statusContainer.innerHTML = `<span style="color:var(--accent3)">❌ ${validCount}/${results.size} imágenes válidas. Corrige los errores antes de publicar.</span>`;
    }
  }

  // Main moderation handler
  async function handleImageSelection(inputElement, previewContainer, statusContainer, submitButton) {
    const files = Array.from(inputElement.files || []);

    if (files.length === 0) {
      moderationResults.clear();
      updatePreviewDisplay(previewContainer, moderationResults);
      updateStatusMessage(statusContainer, moderationResults, false);
      submitButton.disabled = false;
      return;
    }

    if (files.length > MAX_IMAGES) {
      statusContainer.innerHTML = `<span style="color:var(--accent3)">❌ Máximo ${MAX_IMAGES} imágenes permitidas</span>`;
      submitButton.disabled = true;
      return;
    }

    // Disable submit while processing
    submitButton.disabled = true;
    moderationResults.clear();
    updateStatusMessage(statusContainer, moderationResults, true);

    // Process all images
    for (const file of files) {
      const result = await moderateImage(file);
      moderationResults.set(file, result);
      updatePreviewDisplay(previewContainer, moderationResults);
    }

    // Update final status
    updateStatusMessage(statusContainer, moderationResults, false);

    // Enable submit only if all images are valid
    const allValid = Array.from(moderationResults.values()).every(r => r.valid);
    submitButton.disabled = !allValid;
  }

  // Check if all images passed moderation
  function allImagesPassed() {
    if (moderationResults.size === 0) return true; // No images = OK
    return Array.from(moderationResults.values()).every(r => r.valid);
  }

  // Initialize moderation for a form
  function init(config) {
    const {
      imageInputId,
      previewContainerId,
      statusContainerId,
      submitButtonId,
      formId
    } = config;

    const imageInput = document.getElementById(imageInputId);
    const previewContainer = document.getElementById(previewContainerId);
    const statusContainer = document.getElementById(statusContainerId);
    const submitButton = document.getElementById(submitButtonId);
    const form = document.getElementById(formId);

    if (!imageInput || !previewContainer || !statusContainer || !submitButton || !form) {
      console.warn('[Moderation] Missing required elements for initialization');
      return;
    }

    // Handle file selection
    imageInput.addEventListener('change', () => {
      handleImageSelection(imageInput, previewContainer, statusContainer, submitButton);
    });

    // Intercept form submission to add moderation flag
    const originalFormHandler = form.onsubmit;
    form.addEventListener('submit', (e) => {
      if (!allImagesPassed()) {
        e.preventDefault();
        statusContainer.innerHTML = '<span style="color:var(--accent3)">❌ Todas las imágenes deben pasar la validación antes de publicar</span>';
        return false;
      }
    }, true);
  }

  // Export to global scope
  window.ImageModeration = {
    init,
    allImagesPassed,
    getModerationResults: () => moderationResults
  };
})();
