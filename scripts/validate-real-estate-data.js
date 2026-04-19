#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, 'data');

const requiredFiles = {
  listings: path.join(dataDir, 'listings.json'),
  taxonomy: path.join(dataDir, 'taxonomy.json'),
  siteSettings: path.join(dataDir, 'site-settings.json')
};

const requiredListingFields = [
  'id',
  'slug',
  'title',
  'summary',
  'description',
  'operation',
  'asset_type',
  'country',
  'region',
  'city',
  'zone',
  'price',
  'currency',
  'surface_m2',
  'rooms',
  'bathrooms',
  'status',
  'verification_state',
  'featured',
  'published_at',
  'expiration_at',
  'images',
  'coordinates',
  'badges',
  'contact_cta'
];

const MAX_BADGES = 4;
const errors = [];

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`[ERROR] Falta el archivo requerido: ${label} (${filePath})`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`[ERROR] JSON inválido en ${label}: ${error.message}`);
    return null;
  }
}

function ensure(condition, message) {
  if (!condition) {
    errors.push('[ERROR] ' + message);
  }
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isIsoDateString(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function fileExistsFromWebPath(webPath) {
  if (typeof webPath !== 'string' || !webPath.startsWith('/')) {
    return false;
  }

  return fs.existsSync(path.join(root, webPath.replace(/^\//, '')));
}

function validateListings(listings, taxonomy) {
  ensure(Array.isArray(listings), 'data/listings.json debe ser un array');
  if (!Array.isArray(listings)) {
    return;
  }

  const seenIds = new Set();
  const seenSlugs = new Set();

  const validOperations = new Set(Array.isArray(taxonomy.operations) ? taxonomy.operations : []);
  const validAssetTypes = new Set(Array.isArray(taxonomy.asset_types) ? taxonomy.asset_types : []);
  const validCountries = new Set(Array.isArray(taxonomy.countries) ? taxonomy.countries.map((item) => item.code) : []);
  const validStatuses = new Set(Array.isArray(taxonomy.listing_statuses) ? taxonomy.listing_statuses : []);
  const validVerificationStates = new Set(Array.isArray(taxonomy.verification_states) ? taxonomy.verification_states : []);
  const validBadges = new Set(Array.isArray(taxonomy.badges) ? taxonomy.badges : []);

  listings.forEach((listing, index) => {
    const prefix = `listing[${index}]`;
    ensure(listing && typeof listing === 'object' && !Array.isArray(listing), `${prefix} debe ser un objeto`);
    if (!listing || typeof listing !== 'object' || Array.isArray(listing)) {
      return;
    }

    requiredListingFields.forEach((field) => {
      ensure(Object.prototype.hasOwnProperty.call(listing, field), `${prefix} no tiene el campo obligatorio "${field}"`);
    });

    ensure(typeof listing.id === 'string' && listing.id.trim() !== '', `${prefix}.id debe ser string no vacío`);
    ensure(typeof listing.slug === 'string' && listing.slug.trim() !== '', `${prefix}.slug debe ser string no vacío`);

    if (typeof listing.id === 'string') {
      ensure(!seenIds.has(listing.id), `${prefix}.id está duplicado: ${listing.id}`);
      seenIds.add(listing.id);
    }

    if (typeof listing.slug === 'string') {
      ensure(!seenSlugs.has(listing.slug), `${prefix}.slug está duplicado: ${listing.slug}`);
      seenSlugs.add(listing.slug);
    }

    ensure(validOperations.has(listing.operation), `${prefix}.operation no existe en taxonomy.operations: ${listing.operation}`);
    ensure(validAssetTypes.has(listing.asset_type), `${prefix}.asset_type no existe en taxonomy.asset_types: ${listing.asset_type}`);
    ensure(validCountries.has(listing.country), `${prefix}.country no existe en taxonomy.countries: ${listing.country}`);
    ensure(validStatuses.has(listing.status), `${prefix}.status no existe en taxonomy.listing_statuses: ${listing.status}`);
    ensure(validVerificationStates.has(listing.verification_state), `${prefix}.verification_state no existe en taxonomy.verification_states: ${listing.verification_state}`);

    ensure(isFiniteNumber(listing.price) && listing.price >= 0, `${prefix}.price debe ser número >= 0`);
    ensure(typeof listing.currency === 'string' && listing.currency === 'EUR', `${prefix}.currency debe ser "EUR" en la base actual`);
    ensure(isFiniteNumber(listing.surface_m2) && listing.surface_m2 > 0, `${prefix}.surface_m2 debe ser número > 0`);
    ensure(listing.rooms === null || Number.isInteger(listing.rooms), `${prefix}.rooms debe ser entero o null`);
    ensure(listing.bathrooms === null || Number.isInteger(listing.bathrooms), `${prefix}.bathrooms debe ser entero o null`);
    ensure(typeof listing.featured === 'boolean', `${prefix}.featured debe ser boolean`);

    ensure(isIsoDateString(listing.published_at), `${prefix}.published_at debe ser fecha ISO válida`);
    ensure(isIsoDateString(listing.expiration_at), `${prefix}.expiration_at debe ser fecha ISO válida`);
    if (isIsoDateString(listing.published_at) && isIsoDateString(listing.expiration_at)) {
      ensure(
        Date.parse(listing.expiration_at) > Date.parse(listing.published_at),
        `${prefix} tiene expiration_at anterior o igual a published_at`
      );
    }

    ensure(Array.isArray(listing.images) && listing.images.length > 0, `${prefix}.images debe ser un array no vacío`);
    if (Array.isArray(listing.images)) {
      listing.images.forEach((imagePath, imageIndex) => {
        ensure(typeof imagePath === 'string' && imagePath.startsWith('/assets/img/real-estate/placeholders/'), `${prefix}.images[${imageIndex}] debe ser path web de placeholder inmobiliario`);
        ensure(fileExistsFromWebPath(imagePath), `${prefix}.images[${imageIndex}] no existe en disco: ${imagePath}`);
      });
    }

    ensure(Array.isArray(listing.badges), `${prefix}.badges debe ser un array`);
    if (Array.isArray(listing.badges)) {
      ensure(listing.badges.length <= MAX_BADGES, `${prefix}.badges supera el máximo de ${MAX_BADGES}`);
      listing.badges.forEach((badge, badgeIndex) => {
        ensure(validBadges.has(badge), `${prefix}.badges[${badgeIndex}] no existe en taxonomy.badges: ${badge}`);
      });
    }

    ensure(listing.coordinates && typeof listing.coordinates === 'object' && !Array.isArray(listing.coordinates), `${prefix}.coordinates debe ser un objeto`);
    if (listing.coordinates && typeof listing.coordinates === 'object' && !Array.isArray(listing.coordinates)) {
      ensure(isFiniteNumber(listing.coordinates.lat), `${prefix}.coordinates.lat debe ser numérico`);
      ensure(isFiniteNumber(listing.coordinates.lng), `${prefix}.coordinates.lng debe ser numérico`);
      if (isFiniteNumber(listing.coordinates.lat)) {
        ensure(listing.coordinates.lat >= -90 && listing.coordinates.lat <= 90, `${prefix}.coordinates.lat está fuera de rango`);
      }
      if (isFiniteNumber(listing.coordinates.lng)) {
        ensure(listing.coordinates.lng >= -180 && listing.coordinates.lng <= 180, `${prefix}.coordinates.lng está fuera de rango`);
      }
    }
  });
}

function validateTaxonomy(taxonomy) {
  ensure(taxonomy && typeof taxonomy === 'object' && !Array.isArray(taxonomy), 'data/taxonomy.json debe ser un objeto');
  if (!taxonomy || typeof taxonomy !== 'object' || Array.isArray(taxonomy)) {
    return;
  }

  [
    'operations',
    'asset_types',
    'countries',
    'languages',
    'listing_statuses',
    'verification_states',
    'badges',
    'sponsor_categories'
  ].forEach((field) => {
    ensure(Array.isArray(taxonomy[field]), `taxonomy.${field} debe ser un array`);
  });
}

function validateSiteSettings(siteSettings, taxonomy) {
  ensure(siteSettings && typeof siteSettings === 'object' && !Array.isArray(siteSettings), 'data/site-settings.json debe ser un objeto');
  if (!siteSettings || typeof siteSettings !== 'object' || Array.isArray(siteSettings)) {
    return;
  }

  ensure(siteSettings.default_locale === 'es', 'site-settings.default_locale debe ser "es" en la base actual');
  ensure(Array.isArray(siteSettings.supported_locales), 'site-settings.supported_locales debe ser un array');
  ensure(siteSettings.default_currency === 'EUR', 'site-settings.default_currency debe ser "EUR"');

  if (Array.isArray(siteSettings.supported_locales) && taxonomy && Array.isArray(taxonomy.languages)) {
    const validLanguages = new Set(taxonomy.languages);
    siteSettings.supported_locales.forEach((locale) => {
      ensure(validLanguages.has(locale), `site-settings.supported_locales contiene locale fuera de taxonomy.languages: ${locale}`);
    });
  }

  const pricing = siteSettings.featured_pricing || {};
  const visibilidad = pricing.mas_visibilidad || {};
  const sensacional = pricing.sensacional_24h || {};

  ensure(visibilidad.label === 'Más visibilidad', 'featured_pricing.mas_visibilidad.label debe ser "Más visibilidad"');
  ensure(visibilidad.amount === 19.95, 'featured_pricing.mas_visibilidad.amount debe ser 19.95');
  ensure(visibilidad.currency === 'EUR', 'featured_pricing.mas_visibilidad.currency debe ser "EUR"');

  ensure(sensacional.label === 'Sensacional 24h', 'featured_pricing.sensacional_24h.label debe ser "Sensacional 24h"');
  ensure(sensacional.amount === 9.95, 'featured_pricing.sensacional_24h.amount debe ser 9.95');
  ensure(sensacional.currency === 'EUR', 'featured_pricing.sensacional_24h.currency debe ser "EUR"');
}

const listings = readJson(requiredFiles.listings, 'data/listings.json');
const taxonomy = readJson(requiredFiles.taxonomy, 'data/taxonomy.json');
const siteSettings = readJson(requiredFiles.siteSettings, 'data/site-settings.json');

validateTaxonomy(taxonomy);
validateSiteSettings(siteSettings, taxonomy || {});
validateListings(listings, taxonomy || {});

if (errors.length > 0) {
  console.error('VALIDACIÓN INMOBILIARIA: ERROR');
  errors.forEach((error) => console.error(error));
  process.exit(1);
}

console.log('VALIDACIÓN INMOBILIARIA: OK');
console.log('- listings válidos: ' + listings.length);
console.log('- operaciones válidas: ' + taxonomy.operations.length);
console.log('- tipos de activo válidos: ' + taxonomy.asset_types.length);
console.log('- locales soportados: ' + siteSettings.supported_locales.length);
process.exit(0);
