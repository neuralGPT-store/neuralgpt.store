(function (root, factory) {
  'use strict';

  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  root.RealEstateRiskEngine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEFAULT_FRAUD_RULES = {
    duplicate_detection: {
      title_similarity: { strong_threshold: 0.86, medium_threshold: 0.72, weight_strong: 24, weight_medium: 12 },
      description_similarity: { strong_threshold: 0.82, medium_threshold: 0.66, weight_strong: 22, weight_medium: 10 },
      location_equivalence: { same_country_city_zone_weight: 14, same_country_city_weight: 7, coordinates_close_meters: 250, coordinates_close_weight: 8 },
      price_similarity: { exact_price_weight: 10, near_price_percent: 1.75, near_price_weight: 5 },
      structural_fingerprint: { exact_match_weight: 16, near_surface_percent: 3.5, near_surface_weight: 6 },
      images: { shared_image_ratio_strong: 0.8, shared_image_ratio_medium: 0.5, shared_image_count_strong: 2, weight_strong: 14, weight_medium: 7 },
      contact_advertiser: { same_advertiser_weight: 18, same_contact_weight: 14, missing_contact_penalty: 2 },
      relist_abuse: { window_days: 45, weight_relist_after_expired: 10, weight_relist_after_off_market: 14 }
    },
    fraud_signals: {
      free_tier_abuse: { max_active_free_listings: 2, max_new_free_listings_30d: 5, weight_active_limit: 16, weight_velocity_limit: 12 },
      publication_churn: { max_publish_actions_7d: 4, max_status_changes_14d: 8, weight_publish_churn: 8, weight_status_churn: 10 },
      automation_abuse: { max_creations_per_hour_per_ip: 4, max_accounts_per_device_24h: 3, weight_ip_velocity: 12, weight_device_fanout: 14 },
      identity_and_contact: { unverified_contact_weight: 6, high_risk_domain_weight: 8, phone_reuse_weight: 9 },
      value_anomaly: { price_per_m2_deviation_percent: 60, weight_value_outlier: 7 }
    }
  };

  var DEFAULT_MODERATION_RULES = {
    outcomes: {
      allow: { max_score: 19 },
      allow_with_monitoring: { min_score: 20, max_score: 34 },
      pending_review: { min_score: 35, max_score: 54 },
      quarantine: { min_score: 55, max_score: 74 },
      suspend_candidate: { min_score: 75 }
    },
    hard_blocks: { duplicate_strong_count: 2, critical_signal_count: 2, force_outcome: 'quarantine' },
    suspension_triggers: { repeated_quarantine_events_30d: 3, confirmed_fraud_events_90d: 2, force_outcome: 'suspend_candidate' }
  };

  function mergeShallow(base, override) {
    var out = {};
    var key;

    for (key in base) {
      if (Object.prototype.hasOwnProperty.call(base, key)) {
        out[key] = base[key];
      }
    }

    if (!override || typeof override !== 'object') {
      return out;
    }

    for (key in override) {
      if (Object.prototype.hasOwnProperty.call(override, key)) {
        out[key] = override[key];
      }
    }

    return out;
  }

  function pickFirstString(obj, keys) {
    var i;
    var value;

    if (!obj || typeof obj !== 'object') {
      return '';
    }

    for (i = 0; i < keys.length; i += 1) {
      value = obj[keys[i]];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }

  function stripAccents(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function normalizeText(value) {
    return stripAccents(value)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(value) {
    var normalized = normalizeText(value);

    if (!normalized) {
      return [];
    }

    return normalized.split(' ').filter(function (token) {
      return token.length >= 2;
    });
  }

  function tokenSet(value) {
    var map = Object.create(null);
    tokenize(value).forEach(function (token) {
      map[token] = true;
    });
    return map;
  }

  function jaccardSimilarity(a, b) {
    var setA = tokenSet(a);
    var setB = tokenSet(b);
    var key;
    var inter = 0;
    var union = 0;

    for (key in setA) {
      if (Object.prototype.hasOwnProperty.call(setA, key)) {
        union += 1;
        if (setB[key]) {
          inter += 1;
        }
      }
    }

    for (key in setB) {
      if (Object.prototype.hasOwnProperty.call(setB, key) && !setA[key]) {
        union += 1;
      }
    }

    if (union === 0) {
      return 0;
    }

    return inter / union;
  }

  function toNumber(value) {
    var num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function safePercentDiff(a, b) {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
      return null;
    }

    return Math.abs(a - b) / ((a + b) / 2) * 100;
  }

  function normalizePhone(value) {
    return String(value || '').replace(/[^0-9+]/g, '');
  }

  function haversineMeters(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var toRad = Math.PI / 180;
    var dLat;
    var dLon;
    var a;
    var c;

    if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
      return null;
    }

    dLat = (lat2 - lat1) * toRad;
    dLon = (lon2 - lon1) * toRad;

    a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function buildCompositeFingerprint(normalizedListing) {
    return [
      normalizedListing.asset_type,
      normalizedListing.operation,
      normalizedListing.city,
      normalizedListing.zone,
      normalizedListing.surface_m2,
      normalizedListing.rooms,
      normalizedListing.bathrooms
    ].join('|');
  }

  function makeFlag(code, severity, weight, message, extra) {
    var out = {
      code: code,
      severity: severity,
      weight: weight,
      message: message
    };

    return mergeShallow(out, extra || {});
  }

  function normalizeListingForRisk(listing) {
    var price = toNumber(listing && listing.price);
    var surface = toNumber(listing && listing.surface_m2);
    var normalized = {
      id: pickFirstString(listing, ['id']),
      slug: pickFirstString(listing, ['slug']),
      title: pickFirstString(listing, ['title']),
      summary: pickFirstString(listing, ['summary']),
      description: pickFirstString(listing, ['description']),
      operation: normalizeText(pickFirstString(listing, ['operation'])),
      asset_type: normalizeText(pickFirstString(listing, ['asset_type'])),
      country: normalizeText(pickFirstString(listing, ['country'])),
      city: normalizeText(pickFirstString(listing, ['city'])),
      zone: normalizeText(pickFirstString(listing, ['zone', 'district', 'neighborhood'])),
      region: normalizeText(pickFirstString(listing, ['region'])),
      price: price,
      currency: pickFirstString(listing, ['currency']),
      surface_m2: surface,
      rooms: toNumber(listing && listing.rooms),
      bathrooms: toNumber(listing && listing.bathrooms),
      status: normalizeText(pickFirstString(listing, ['status'])),
      verification_state: normalizeText(pickFirstString(listing, ['verification_state'])),
      advertiser_id: pickFirstString(listing, ['advertiser_id', 'owner_id', 'user_id', 'agent_id']),
      contact_email: normalizeText(pickFirstString(listing, ['contact_email', 'email'])),
      contact_phone: normalizePhone(pickFirstString(listing, ['contact_phone', 'phone'])),
      free_tier: listing && listing.plan_tier ? String(listing.plan_tier).toLowerCase() === 'free' : false,
      images: Array.isArray(listing && listing.images) ? listing.images.slice() : [],
      published_at: pickFirstString(listing, ['published_at']),
      expiration_at: pickFirstString(listing, ['expiration_at']),
      coordinates: listing && listing.coordinates && typeof listing.coordinates === 'object'
        ? {
            lat: toNumber(listing.coordinates.lat),
            lng: toNumber(listing.coordinates.lng)
          }
        : { lat: null, lng: null }
    };

    normalized.text_corpus = [normalized.title, normalized.summary, normalized.description].join(' ').trim();
    normalized.price_per_m2 = (Number.isFinite(price) && Number.isFinite(surface) && surface > 0) ? price / surface : null;
    normalized.composite_fingerprint = buildCompositeFingerprint(normalized);
    normalized.image_hashes = normalized.images.map(function (image) { return String(image); });

    return normalized;
  }

  function computeDuplicateSignals(listing, listings, options) {
    var rules = mergeShallow(DEFAULT_FRAUD_RULES.duplicate_detection, options && options.rules);
    var target = normalizeListingForRisk(listing);
    var all = Array.isArray(listings) ? listings : [];
    var flags = [];
    var peers = [];
    var strongCount = 0;

    all.forEach(function (candidateRaw) {
      var candidate = normalizeListingForRisk(candidateRaw);
      var peerScore = 0;
      var peerSignals = [];
      var titleSim;
      var descSim;
      var priceDiff;
      var surfaceDiff;
      var sharedImages;
      var sharedRatio;
      var distance;

      if (target.id && candidate.id && target.id === candidate.id) {
        return;
      }

      if (target.slug && candidate.slug && target.slug === candidate.slug) {
        return;
      }

      titleSim = jaccardSimilarity(target.title, candidate.title);
      if (titleSim >= rules.title_similarity.strong_threshold) {
        peerSignals.push(makeFlag('duplicate_title_strong', 'high', rules.title_similarity.weight_strong, 'Título extremadamente similar', { similarity: titleSim }));
        peerScore += rules.title_similarity.weight_strong;
      } else if (titleSim >= rules.title_similarity.medium_threshold) {
        peerSignals.push(makeFlag('duplicate_title_medium', 'medium', rules.title_similarity.weight_medium, 'Título potencialmente duplicado', { similarity: titleSim }));
        peerScore += rules.title_similarity.weight_medium;
      }

      descSim = jaccardSimilarity(target.description, candidate.description);
      if (descSim >= rules.description_similarity.strong_threshold) {
        peerSignals.push(makeFlag('duplicate_description_strong', 'high', rules.description_similarity.weight_strong, 'Descripción extremadamente similar', { similarity: descSim }));
        peerScore += rules.description_similarity.weight_strong;
      } else if (descSim >= rules.description_similarity.medium_threshold) {
        peerSignals.push(makeFlag('duplicate_description_medium', 'medium', rules.description_similarity.weight_medium, 'Descripción potencialmente duplicada', { similarity: descSim }));
        peerScore += rules.description_similarity.weight_medium;
      }

      if (target.country && target.city && target.country === candidate.country && target.city === candidate.city) {
        if (target.zone && candidate.zone && target.zone === candidate.zone) {
          peerSignals.push(makeFlag('duplicate_location_strong', 'high', rules.location_equivalence.same_country_city_zone_weight, 'Misma ubicación país/ciudad/zona', {}));
          peerScore += rules.location_equivalence.same_country_city_zone_weight;
        } else {
          peerSignals.push(makeFlag('duplicate_location_city', 'medium', rules.location_equivalence.same_country_city_weight, 'Misma ubicación país/ciudad', {}));
          peerScore += rules.location_equivalence.same_country_city_weight;
        }
      }

      distance = haversineMeters(
        target.coordinates.lat,
        target.coordinates.lng,
        candidate.coordinates.lat,
        candidate.coordinates.lng
      );
      if (Number.isFinite(distance) && distance <= rules.location_equivalence.coordinates_close_meters) {
        peerSignals.push(makeFlag('duplicate_coordinates_close', 'medium', rules.location_equivalence.coordinates_close_weight, 'Coordenadas muy próximas', { distance_meters: distance }));
        peerScore += rules.location_equivalence.coordinates_close_weight;
      }

      if (Number.isFinite(target.price) && Number.isFinite(candidate.price)) {
        if (target.price === candidate.price) {
          peerSignals.push(makeFlag('duplicate_price_exact', 'medium', rules.price_similarity.exact_price_weight, 'Precio idéntico', { peer_price: candidate.price }));
          peerScore += rules.price_similarity.exact_price_weight;
        } else {
          priceDiff = safePercentDiff(target.price, candidate.price);
          if (Number.isFinite(priceDiff) && priceDiff <= rules.price_similarity.near_price_percent) {
            peerSignals.push(makeFlag('duplicate_price_near', 'low', rules.price_similarity.near_price_weight, 'Precio casi idéntico', { percent_diff: priceDiff }));
            peerScore += rules.price_similarity.near_price_weight;
          }
        }
      }

      if (target.composite_fingerprint && target.composite_fingerprint === candidate.composite_fingerprint) {
        peerSignals.push(makeFlag('duplicate_structural_exact', 'high', rules.structural_fingerprint.exact_match_weight, 'Huella estructural idéntica', {}));
        peerScore += rules.structural_fingerprint.exact_match_weight;
      } else {
        surfaceDiff = safePercentDiff(target.surface_m2, candidate.surface_m2);
        if (target.asset_type === candidate.asset_type &&
            target.operation === candidate.operation &&
            target.city === candidate.city &&
            Number.isFinite(surfaceDiff) &&
            surfaceDiff <= rules.structural_fingerprint.near_surface_percent) {
          peerSignals.push(makeFlag('duplicate_structural_near', 'medium', rules.structural_fingerprint.near_surface_weight, 'Huella estructural cercana', { surface_percent_diff: surfaceDiff }));
          peerScore += rules.structural_fingerprint.near_surface_weight;
        }
      }

      if (target.image_hashes.length > 0 && candidate.image_hashes.length > 0) {
        sharedImages = target.image_hashes.filter(function (imageHash) {
          return candidate.image_hashes.indexOf(imageHash) !== -1;
        });
        sharedRatio = sharedImages.length / Math.max(target.image_hashes.length, candidate.image_hashes.length);

        if (sharedImages.length >= rules.images.shared_image_count_strong && sharedRatio >= rules.images.shared_image_ratio_strong) {
          peerSignals.push(makeFlag('duplicate_images_strong', 'high', rules.images.weight_strong, 'Conjunto de imágenes muy solapado', { shared_images: sharedImages }));
          peerScore += rules.images.weight_strong;
        } else if (sharedRatio >= rules.images.shared_image_ratio_medium) {
          peerSignals.push(makeFlag('duplicate_images_medium', 'medium', rules.images.weight_medium, 'Imágenes parcialmente repetidas', { shared_images: sharedImages }));
          peerScore += rules.images.weight_medium;
        }
      }

      if (target.advertiser_id && candidate.advertiser_id && target.advertiser_id === candidate.advertiser_id) {
        peerSignals.push(makeFlag('duplicate_same_advertiser', 'medium', rules.contact_advertiser.same_advertiser_weight, 'Mismo anunciante', { advertiser_id: target.advertiser_id }));
        peerScore += rules.contact_advertiser.same_advertiser_weight;
      }

      if ((target.contact_email && target.contact_email === candidate.contact_email) ||
          (target.contact_phone && target.contact_phone === candidate.contact_phone)) {
        peerSignals.push(makeFlag('duplicate_same_contact', 'medium', rules.contact_advertiser.same_contact_weight, 'Mismo dato de contacto', {}));
        peerScore += rules.contact_advertiser.same_contact_weight;
      }

      if (peerSignals.length > 0) {
        if (peerSignals.some(function (flag) { return flag.severity === 'high'; })) {
          strongCount += 1;
        }

        peers.push({
          peer_id: candidate.id || candidate.slug || 'sin-id',
          peer_slug: candidate.slug || '',
          peer_score: peerScore,
          peer_signals: peerSignals
        });
      }
    });

    if (!target.contact_email && !target.contact_phone && !target.advertiser_id) {
      flags.push(makeFlag('missing_contact_identity', 'low', rules.contact_advertiser.missing_contact_penalty, 'Sin identificadores de contacto/anunciante')); 
    }

    if (Array.isArray(options && options.previousListings)) {
      options.previousListings.forEach(function (oldRaw) {
        var old = normalizeListingForRisk(oldRaw);
        var sameFingerprint = old.composite_fingerprint && old.composite_fingerprint === target.composite_fingerprint;
        var oldStatus = old.status;
        var oldDate = Date.parse(old.expiration_at || old.published_at || '');
        var days;

        if (!sameFingerprint) {
          return;
        }

        if (Number.isNaN(oldDate)) {
          return;
        }

        days = (Date.now() - oldDate) / 86400000;
        if (days < 0 || days > rules.relist_abuse.window_days) {
          return;
        }

        if (oldStatus === 'expired') {
          flags.push(makeFlag('relist_after_expired', 'medium', rules.relist_abuse.weight_relist_after_expired, 'Re-subida tras expiración reciente', { reference_listing: old.id || old.slug }));
        }

        if (oldStatus === 'off_market') {
          flags.push(makeFlag('relist_after_off_market', 'high', rules.relist_abuse.weight_relist_after_off_market, 'Re-subida tras retirada off-market reciente', { reference_listing: old.id || old.slug }));
        }
      });
    }

    peers.sort(function (a, b) { return b.peer_score - a.peer_score; });

    return {
      score: peers.reduce(function (acc, peer) { return acc + peer.peer_score; }, 0) + flags.reduce(function (acc, flag) { return acc + flag.weight; }, 0),
      strong_match_count: strongCount,
      peers: peers,
      flags: flags,
      top_peer: peers.length ? peers[0] : null
    };
  }

  function computeFraudSignals(listing, context, options) {
    var target = normalizeListingForRisk(listing);
    var rules = mergeShallow(DEFAULT_FRAUD_RULES.fraud_signals, options && options.rules);
    var flags = [];
    var actor = context && context.actor ? context.actor : {};
    var telemetry = context && context.activity ? context.activity : {};
    var reputation = context && context.reputation ? context.reputation : {};
    var market = context && context.marketStats ? context.marketStats : {};
    var pricePerM2Median = toNumber(market.median_price_per_m2);
    var pricePerM2 = target.price_per_m2;
    var deviation;

    if (target.free_tier) {
      if (toNumber(actor.active_free_listings) > rules.free_tier_abuse.max_active_free_listings) {
        flags.push(makeFlag('free_tier_active_limit', 'high', rules.free_tier_abuse.weight_active_limit, 'Exceso de anuncios free activos', { active_free_listings: actor.active_free_listings }));
      }

      if (toNumber(actor.new_free_listings_30d) > rules.free_tier_abuse.max_new_free_listings_30d) {
        flags.push(makeFlag('free_tier_velocity_limit', 'medium', rules.free_tier_abuse.weight_velocity_limit, 'Alta frecuencia de altas free en 30 días', { new_free_listings_30d: actor.new_free_listings_30d }));
      }
    }

    if (toNumber(telemetry.publish_actions_7d) > rules.publication_churn.max_publish_actions_7d) {
      flags.push(makeFlag('publish_churn', 'medium', rules.publication_churn.weight_publish_churn, 'Churn elevado de publicaciones', { publish_actions_7d: telemetry.publish_actions_7d }));
    }

    if (toNumber(telemetry.status_changes_14d) > rules.publication_churn.max_status_changes_14d) {
      flags.push(makeFlag('status_churn', 'high', rules.publication_churn.weight_status_churn, 'Exceso de cambios de estado', { status_changes_14d: telemetry.status_changes_14d }));
    }

    if (toNumber(telemetry.creations_per_hour_per_ip) > rules.automation_abuse.max_creations_per_hour_per_ip) {
      flags.push(makeFlag('ip_velocity_abuse', 'high', rules.automation_abuse.weight_ip_velocity, 'Patrón de creación acelerado por IP', { creations_per_hour_per_ip: telemetry.creations_per_hour_per_ip }));
    }

    if (toNumber(telemetry.accounts_per_device_24h) > rules.automation_abuse.max_accounts_per_device_24h) {
      flags.push(makeFlag('device_fanout_abuse', 'critical', rules.automation_abuse.weight_device_fanout, 'Multiplicidad de cuentas por dispositivo', { accounts_per_device_24h: telemetry.accounts_per_device_24h }));
    }

    if (target.verification_state !== 'verified' && (!target.contact_email || !target.contact_phone)) {
      flags.push(makeFlag('identity_unverified', 'medium', rules.identity_and_contact.unverified_contact_weight, 'Contacto o identidad sin verificación suficiente'));
    }

    if (Array.isArray(context && context.highRiskEmailDomains) && target.contact_email) {
      var domain = target.contact_email.split('@')[1] || '';
      if (context.highRiskEmailDomains.indexOf(domain) !== -1) {
        flags.push(makeFlag('high_risk_email_domain', 'high', rules.identity_and_contact.high_risk_domain_weight, 'Dominio de correo en lista de riesgo', { domain: domain }));
      }
    }

    if (toNumber(reputation.reused_phone_count) > 1) {
      flags.push(makeFlag('phone_reuse', 'medium', rules.identity_and_contact.phone_reuse_weight, 'Teléfono reutilizado en múltiples cuentas', { reused_phone_count: reputation.reused_phone_count }));
    }

    if (Number.isFinite(pricePerM2) && Number.isFinite(pricePerM2Median) && pricePerM2Median > 0) {
      deviation = safePercentDiff(pricePerM2, pricePerM2Median);
      if (Number.isFinite(deviation) && deviation > rules.value_anomaly.price_per_m2_deviation_percent) {
        flags.push(makeFlag('price_per_m2_outlier', 'medium', rules.value_anomaly.weight_value_outlier, 'Desviación extrema en precio por m2', { deviation_percent: deviation, median_price_per_m2: pricePerM2Median }));
      }
    }

    return {
      score: flags.reduce(function (acc, flag) { return acc + flag.weight; }, 0),
      flags: flags
    };
  }

  function riskBand(score) {
    if (score >= 75) {
      return 'critical';
    }
    if (score >= 50) {
      return 'high';
    }
    if (score >= 25) {
      return 'medium';
    }
    return 'low';
  }

  function classifyModerationOutcome(score, signals, context) {
    var rules = mergeShallow(DEFAULT_MODERATION_RULES, context && context.moderationRules);
    var duplicateStrongCount = signals && signals.duplicate && signals.duplicate.strong_match_count ? signals.duplicate.strong_match_count : 0;
    var criticalSignalCount = 0;
    var allFlags = [];
    var outcome;
    var suspensionHistory = context && context.reputation ? context.reputation : {};

    if (signals && signals.duplicate && Array.isArray(signals.duplicate.flags)) {
      allFlags = allFlags.concat(signals.duplicate.flags);
    }
    if (signals && signals.duplicate && Array.isArray(signals.duplicate.peers)) {
      signals.duplicate.peers.forEach(function (peer) {
        if (Array.isArray(peer.peer_signals)) {
          allFlags = allFlags.concat(peer.peer_signals);
        }
      });
    }
    if (signals && signals.fraud && Array.isArray(signals.fraud.flags)) {
      allFlags = allFlags.concat(signals.fraud.flags);
    }

    criticalSignalCount = allFlags.filter(function (flag) { return flag.severity === 'critical'; }).length;

    if (duplicateStrongCount >= rules.hard_blocks.duplicate_strong_count || criticalSignalCount >= rules.hard_blocks.critical_signal_count) {
      outcome = rules.hard_blocks.force_outcome;
    } else if (score >= rules.outcomes.suspend_candidate.min_score) {
      outcome = 'suspend_candidate';
    } else if (score >= rules.outcomes.quarantine.min_score && score <= rules.outcomes.quarantine.max_score) {
      outcome = 'quarantine';
    } else if (score >= rules.outcomes.pending_review.min_score && score <= rules.outcomes.pending_review.max_score) {
      outcome = 'pending_review';
    } else if (score >= rules.outcomes.allow_with_monitoring.min_score && score <= rules.outcomes.allow_with_monitoring.max_score) {
      outcome = 'allow_with_monitoring';
    } else {
      outcome = 'allow';
    }

    if (toNumber(suspensionHistory.repeated_quarantine_events_30d) >= rules.suspension_triggers.repeated_quarantine_events_30d ||
        toNumber(suspensionHistory.confirmed_fraud_events_90d) >= rules.suspension_triggers.confirmed_fraud_events_90d) {
      outcome = rules.suspension_triggers.force_outcome;
    }

    return {
      outcome: outcome,
      band: riskBand(score),
      duplicate_strong_count: duplicateStrongCount,
      critical_signal_count: criticalSignalCount
    };
  }

  function scoreListingRisk(listing, listings, context) {
    var ctx = context || {};
    var duplicateRules = ctx.fraudRules && ctx.fraudRules.duplicate_detection ? ctx.fraudRules.duplicate_detection : DEFAULT_FRAUD_RULES.duplicate_detection;
    var fraudRules = ctx.fraudRules && ctx.fraudRules.fraud_signals ? ctx.fraudRules.fraud_signals : DEFAULT_FRAUD_RULES.fraud_signals;
    var duplicate = computeDuplicateSignals(listing, listings, {
      rules: duplicateRules,
      previousListings: Array.isArray(ctx.previousListings) ? ctx.previousListings : []
    });
    var fraud = computeFraudSignals(listing, ctx, { rules: fraudRules });
    var rawScore = duplicate.score + fraud.score;
    var score = Math.max(0, Math.min(100, Math.round(rawScore)));
    var classification = classifyModerationOutcome(score, { duplicate: duplicate, fraud: fraud }, { moderationRules: ctx.moderationRules, reputation: ctx.reputation });

    return {
      score: score,
      raw_score: rawScore,
      duplicate: duplicate,
      fraud: fraud,
      classification: classification
    };
  }

  function buildModerationSummary(listing, result) {
    var normalized = normalizeListingForRisk(listing);
    var topPeer = result && result.duplicate ? result.duplicate.top_peer : null;
    var topFraudFlags = result && result.fraud && Array.isArray(result.fraud.flags) ? result.fraud.flags.slice(0, 5) : [];
    var topDuplicateFlags = [];

    if (topPeer && Array.isArray(topPeer.peer_signals)) {
      topDuplicateFlags = topPeer.peer_signals.slice(0, 5);
    }

    return {
      listing_id: normalized.id || normalized.slug || 'sin-id',
      listing_slug: normalized.slug,
      computed_score: result.score,
      raw_score: result.raw_score,
      risk_band: result.classification.band,
      outcome: result.classification.outcome,
      duplicate_summary: {
        strong_match_count: result.duplicate.strong_match_count,
        top_peer_id: topPeer ? topPeer.peer_id : null,
        top_peer_score: topPeer ? topPeer.peer_score : 0,
        top_peer_signals: topDuplicateFlags
      },
      fraud_summary: {
        flag_count: result.fraud.flags.length,
        top_flags: topFraudFlags
      },
      audit_notes: [
        'Motor de riesgo ejecutado en modo local/dataset.',
        'Decisión orientativa, pendiente de workflow de moderación humana si aplica.',
        'Sin 301 ni alteración de canonicals legacy en esta fase.'
      ]
    };
  }

  return {
    normalizeListingForRisk: normalizeListingForRisk,
    computeDuplicateSignals: computeDuplicateSignals,
    computeFraudSignals: computeFraudSignals,
    scoreListingRisk: scoreListingRisk,
    classifyModerationOutcome: classifyModerationOutcome,
    buildModerationSummary: buildModerationSummary
  };
});
