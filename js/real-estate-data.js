(function (global) {
  'use strict';

  var DATA_PATHS = {
    listings: '/public-data/listings.public.json',
    taxonomy: '/public-data/taxonomy.public.json',
    siteSettings: '/public-data/site-settings.public.json'
  };

  var cache = {
    listings: null,
    taxonomy: null,
    siteSettings: null
  };

  async function fetchJson(path) {
    var response;

    try {
      response = await fetch(path, { cache: 'no-cache' });
    } catch (error) {
      throw new Error('No se pudo cargar ' + path + ': error de red o acceso');
    }

    if (!response.ok) {
      throw new Error('No se pudo cargar ' + path + ': HTTP ' + response.status);
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error('No se pudo parsear JSON en ' + path);
    }
  }

  async function loadListings(forceReload) {
    if (!forceReload && Array.isArray(cache.listings)) {
      return cache.listings.slice();
    }

    var data = await fetchJson(DATA_PATHS.listings);

    if (!Array.isArray(data)) {
      throw new Error('El dataset de listings no es un array válido');
    }

    cache.listings = data;
    return data.slice();
  }

  async function loadTaxonomy(forceReload) {
    if (!forceReload && cache.taxonomy && typeof cache.taxonomy === 'object') {
      return Object.assign({}, cache.taxonomy);
    }

    var data = await fetchJson(DATA_PATHS.taxonomy);

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('El dataset de taxonomy no es un objeto válido');
    }

    cache.taxonomy = data;
    return Object.assign({}, data);
  }

  async function loadSiteSettings(forceReload) {
    if (!forceReload && cache.siteSettings && typeof cache.siteSettings === 'object') {
      return Object.assign({}, cache.siteSettings);
    }

    var data = await fetchJson(DATA_PATHS.siteSettings);

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('El dataset de site settings no es un objeto válido');
    }

    cache.siteSettings = data;
    return Object.assign({}, data);
  }

  async function getFeaturedListings() {
    var listings = await loadListings();
    return listings.filter(function (listing) {
      return listing && listing.featured === true;
    });
  }

  async function getListingsByOperation(operation) {
    if (!operation) {
      return [];
    }

    var normalized = String(operation).trim().toLowerCase();
    var listings = await loadListings();

    return listings.filter(function (listing) {
      return listing && String(listing.operation || '').toLowerCase() === normalized;
    });
  }

  async function getListingsByAssetType(assetType) {
    if (!assetType) {
      return [];
    }

    var normalized = String(assetType).trim().toLowerCase();
    var listings = await loadListings();

    return listings.filter(function (listing) {
      return listing && String(listing.asset_type || '').toLowerCase() === normalized;
    });
  }

  async function findListingBySlug(slug) {
    if (!slug) {
      return null;
    }

    var normalized = String(slug).trim().toLowerCase();
    var listings = await loadListings();

    for (var i = 0; i < listings.length; i += 1) {
      if (String(listings[i].slug || '').toLowerCase() === normalized) {
        return listings[i];
      }
    }

    return null;
  }

  global.RealEstateData = {
    loadListings: loadListings,
    loadTaxonomy: loadTaxonomy,
    loadSiteSettings: loadSiteSettings,
    getFeaturedListings: getFeaturedListings,
    getListingsByOperation: getListingsByOperation,
    getListingsByAssetType: getListingsByAssetType,
    findListingBySlug: findListingBySlug
  };
})(window);
