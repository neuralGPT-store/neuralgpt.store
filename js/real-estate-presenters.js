(function (root, factory) {
  'use strict';

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
    return;
  }

  root.RealEstatePresenters = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function toNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  function formatPrice(value, currency) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 'Consultar';
    }

    if (currency !== 'EUR') {
      return String(value) + ' ' + String(currency || '').trim();
    }

    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: value % 1 === 0 ? 0 : 2
    }).format(value);
  }

  function buildLocationLabel(listing) {
    return [listing.zone, listing.city, listing.region, listing.country].filter(Boolean).join(', ');
  }

  function firstImage(listing) {
    if (!listing || !Array.isArray(listing.images) || listing.images.length === 0) {
      return null;
    }

    return listing.images[0];
  }

  function safeArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function toListingCardViewModel(listing) {
    return {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      summary: listing.summary,
      operation: listing.operation,
      assetType: listing.asset_type,
      locationLabel: buildLocationLabel(listing),
      city: listing.city,
      region: listing.region,
      country: listing.country,
      zone: listing.zone,
      priceLabel: formatPrice(listing.price, listing.currency),
      currency: listing.currency,
      surfaceLabel: toNumber(listing.surface_m2) ? String(listing.surface_m2) + ' m2' : null,
      roomsLabel: Number.isInteger(listing.rooms) ? String(listing.rooms) + ' hab.' : null,
      bathroomsLabel: Number.isInteger(listing.bathrooms) ? String(listing.bathrooms) + ' baños' : null,
      image: firstImage(listing),
      badges: safeArray(listing.badges),
      featured: listing.featured === true,
      verificationState: listing.verification_state,
      status: listing.status,
      contactCta: listing.contact_cta,
      canonicalPath: '/listing/' + listing.slug
    };
  }

  function toListingDetailViewModel(listing) {
    return {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      summary: listing.summary,
      description: listing.description,
      operation: listing.operation,
      assetType: listing.asset_type,
      locationLabel: buildLocationLabel(listing),
      city: listing.city,
      region: listing.region,
      country: listing.country,
      zone: listing.zone,
      price: listing.price,
      priceLabel: formatPrice(listing.price, listing.currency),
      currency: listing.currency,
      surfaceM2: listing.surface_m2,
      rooms: listing.rooms,
      bathrooms: listing.bathrooms,
      status: listing.status,
      verificationState: listing.verification_state,
      featured: listing.featured === true,
      publishedAt: listing.published_at,
      expirationAt: listing.expiration_at,
      images: safeArray(listing.images),
      primaryImage: firstImage(listing),
      coordinates: listing.coordinates ? {
        lat: listing.coordinates.lat,
        lng: listing.coordinates.lng
      } : null,
      badges: safeArray(listing.badges),
      contactCta: listing.contact_cta,
      canonicalPath: '/listing/' + listing.slug
    };
  }

  function toFeaturedListingCards(listings) {
    if (!Array.isArray(listings)) {
      return [];
    }

    return listings
      .filter(function (listing) {
        return listing && listing.featured === true;
      })
      .map(toListingCardViewModel);
  }

  function toHomepageMetrics(siteSettings, listings) {
    var placeholder = siteSettings && siteSettings.counters_placeholder ? siteSettings.counters_placeholder : {};
    var safeListings = Array.isArray(listings) ? listings : [];

    var publishedListings = safeListings.filter(function (listing) {
      return listing && listing.status === 'published';
    });

    var verifiedAssets = publishedListings.filter(function (listing) {
      return listing && listing.verification_state === 'verified';
    });

    var citySet = {};
    publishedListings.forEach(function (listing) {
      if (listing && listing.city) {
        citySet[listing.city] = true;
      }
    });

    return {
      featuredListings: typeof placeholder.featured_listings === 'number' ? placeholder.featured_listings : publishedListings.filter(function (listing) { return listing.featured === true; }).length,
      europeanCities: typeof placeholder.european_cities === 'number' ? placeholder.european_cities : Object.keys(citySet).length,
      verifiedAssets: typeof placeholder.verified_assets === 'number' ? placeholder.verified_assets : verifiedAssets.length,
      activeAdvertisers: typeof placeholder.active_advertisers === 'number' ? placeholder.active_advertisers : null
    };
  }

  function toListingSeoModel(listing, siteSettings) {
    var siteName = siteSettings && siteSettings.site_name ? siteSettings.site_name : 'neuralgpt.store';
    var defaultLocale = siteSettings && siteSettings.default_locale ? siteSettings.default_locale : 'es';
    var title = listing.title + ' | ' + siteName;
    var ciudad = String(listing.city || '');
    var precio = typeof listing.price === 'number' ? listing.price.toLocaleString('es-ES') + ' €' : '';
    var description = listing.title
      + (ciudad ? ' en ' + ciudad : '')
      + (precio ? ' — ' + precio : '')
      + ' | ' + siteName;
    var image = firstImage(listing) || (siteSettings && siteSettings.seo_defaults ? siteSettings.seo_defaults.og_image : null);

    return {
      title: title,
      description: description,
      canonicalPath: '/listing/' + listing.slug,
      ogTitle: listing.title,
      ogDescription: description,
      ogImage: image,
      schemaType: 'Offer',
      locale: defaultLocale
    };
  }

  return {
    toListingCardViewModel: toListingCardViewModel,
    toListingDetailViewModel: toListingDetailViewModel,
    toFeaturedListingCards: toFeaturedListingCards,
    toHomepageMetrics: toHomepageMetrics,
    toListingSeoModel: toListingSeoModel
  };
});
