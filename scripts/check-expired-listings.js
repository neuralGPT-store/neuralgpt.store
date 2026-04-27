#!/usr/bin/env node
'use strict';

/**
 * Script para verificar y marcar anuncios expirados
 * Ejecutar periódicamente vía cron (cada 15 min): 0,15,30,45 * * * * node scripts/check-expired-listings.js
 */

const path = require('path');
const listingsStore = require(path.join(__dirname, '..', 'runtime', 'services', 'listings-store.js'));

const root = process.cwd();
const listingsPath = path.join(root, 'data', 'listings.json');

console.log('[CheckExpiredListings] Iniciando verificación de anuncios expirados...');
console.log('[CheckExpiredListings] Path:', listingsPath);

try {
  const result = listingsStore.checkExpiredListings(listingsPath);

  console.log('[CheckExpiredListings] Resultado:', {
    ok: result.ok,
    checked: result.checked,
    expired: result.expired,
    needs_reconfirmation: result.needs_reconfirmation,
    updated: result.updated
  });

  if (result.expired > 0) {
    console.log(`[CheckExpiredListings] ⚠️  ${result.expired} anuncio(s) marcado(s) como expirado(s)`);
  }

  if (result.needs_reconfirmation > 0) {
    console.log(`[CheckExpiredListings] 📬 ${result.needs_reconfirmation} anuncio(s) requieren reconfirmación (≤7 días)`);
  }

  if (!result.updated) {
    console.log('[CheckExpiredListings] ✓ No hay anuncios que actualizar');
  }

  process.exit(0);
} catch (error) {
  console.error('[CheckExpiredListings] Error:', error);
  process.exit(1);
}
