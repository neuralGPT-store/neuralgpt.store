'use strict';

const {
  readStore,
  writeStore,
  sanitizeListingInput,
  buildListingRecord,
  verifyEditKey,
  getListingEditState
} = require('../services/listings-store');
const { parseUrl, readMultipartBody, readJsonBody, sendError, sendJson } = require('../lib/http');

const MAX_MULTIPART_BYTES = 12 * 1024 * 1024;
const MAX_JSON_BYTES = 256 * 1024;

function createListingsHandlers(env) {
  async function getStatus(req, res) {
    let body;
    try {
      body = await readJsonBody(req, MAX_JSON_BYTES);
    } catch (error) {
      return sendError(res, 400, error.message || 'invalid_json_body');
    }

    const listingId = String(body.listing_id || '').trim();
    const editKey = String(body.edit_key || '').trim();

    const state = getListingEditState(env.listingsStorePath, listingId, editKey, env.listingsEditKeyPepper);
    if (!state.ok) {
      if (state.code === 'listing_id_and_edit_key_required') return sendError(res, 400, state.code);
      if (state.code === 'listing_not_found') return sendError(res, 404, state.code);
      if (state.code === 'invalid_edit_key') return sendError(res, 403, state.code);
      return sendError(res, 400, state.code || 'invalid_status_request');
    }

    const listing = state.listing;
    const hasActivePlan = listing.commercial?.subscription?.active &&
      ['basico', 'premium', 'enterprise'].includes(listing.commercial?.subscription?.tier);

    const safeListing = {
      id: listing.id,
      slug: listing.slug,
      operation: listing.operation,
      asset_type: listing.asset_type,
      country: listing.country,
      region: listing.region,
      city: listing.city,
      zone: listing.zone,
      title: listing.title,
      summary: listing.summary,
      description: listing.description,
      price: listing.price,
      surface_m2: listing.surface_m2,
      rooms: listing.rooms,
      bathrooms: listing.bathrooms,
      lat: listing.lat,
      lng: listing.lng,
      status: listing.status,
      files_count: listing.files_count,
      updated_at: listing.updated_at,
      created_at: listing.created_at,
      meta: listing.meta
    };

    if (hasActivePlan) {
      safeListing.contact_name = listing.contact_name;
      safeListing.contact_phone = listing.contact_phone;
      safeListing.contact_email = listing.contact_email;
    }

    return sendJson(res, 200, {
      ok: true,
      listing: safeListing,
      has_active_plan: hasActivePlan
    });
  }

  async function upsert(req, res) {
    let parsed;
    try {
      parsed = await readMultipartBody(req, MAX_MULTIPART_BYTES);
    } catch (error) {
      if (error.message === 'payload_too_large') return sendError(res, 413, 'payload_too_large');
      return sendError(res, 400, error.message || 'invalid_multipart_body');
    }

    const input = sanitizeListingInput(parsed.fields, parsed.files);

    if (input.honeypot) return sendError(res, 400, 'honeypot_rejected');
    if (!input.privacyAccepted) return sendError(res, 400, 'privacy_required');
    if (!input.title || !input.summary || !input.description) return sendError(res, 400, 'listing_required_fields_missing');
    if (!input.contactName || !input.contactPhone || !input.contactEmail) {
      return sendError(res, 400, 'advertiser_contact_required_fields_missing');
    }

    const rows = readStore(env.listingsStorePath);
    const isEdit = input.mode === 'edit' || Boolean(input.editKey);

    if (isEdit) {
      const listingId = input.listingId;
      if (!listingId || !input.editKey) return sendError(res, 400, 'listing_id_and_edit_key_required');
      const idx = rows.findIndex((row) => String(row.id) === listingId);
      if (idx < 0) return sendError(res, 404, 'listing_not_found');

      if (!verifyEditKey(rows[idx], input.editKey, env.listingsEditKeyPepper)) {
        return sendError(res, 403, 'invalid_edit_key');
      }

      const built = buildListingRecord(input, rows[idx], env.listingsEditKeyPepper);
      rows[idx] = built.record;
      writeStore(env.listingsStorePath, rows);

      return sendJson(res, 200, {
        ok: true,
        mode: 'updated',
        listing_id: built.record.id,
        listing_slug: built.record.slug
      });
    }

    const built = buildListingRecord(input, null, env.listingsEditKeyPepper);
    rows.push(built.record);
    writeStore(env.listingsStorePath, rows);

    return sendJson(res, 200, {
      ok: true,
      mode: 'created',
      listing_id: built.record.id,
      listing_slug: built.record.slug,
      edit_key: built.plainEditKey,
      duplicate_review: { review_required: false },
      content_policy: { review_required: false }
    });
  }

  return {
    getStatus,
    upsert
  };
}

module.exports = {
  createListingsHandlers
};
