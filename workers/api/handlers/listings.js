/**
 * Listings handlers for Cloudflare Workers
 */

import {
  readStore,
  writeStore,
  sanitizeListingInput,
  buildListingRecord,
  verifyEditKey,
  getListingEditState
} from '../services/listings-store.js';

import {
  readMultipartBody,
  readJsonBody,
  sendError,
  sendJson
} from '../lib/http.js';

const MAX_MULTIPART_BYTES = 12 * 1024 * 1024;
const MAX_JSON_BYTES = 256 * 1024;

function createListingsHandlers(env) {
  async function getStatus(request) {
    let body;
    try {
      body = await readJsonBody(request, MAX_JSON_BYTES);
    } catch (error) {
      return sendError(400, error.message || 'invalid_json_body', null, request);
    }

    const listingId = String(body.listing_id || '').trim();
    const editKey = String(body.edit_key || '').trim();

    const state = await getListingEditState(
      env.LISTINGS_KV,
      listingId,
      editKey,
      env.LISTINGS_EDIT_KEY_PEPPER
    );

    if (!state.ok) {
      if (state.code === 'listing_id_and_edit_key_required') {
        return sendError(400, state.code, null, request);
      }
      if (state.code === 'listing_not_found') {
        return sendError(404, state.code, null, request);
      }
      if (state.code === 'invalid_edit_key') {
        return sendError(403, state.code, null, request);
      }
      return sendError(400, state.code || 'invalid_status_request', null, request);
    }

    const listing = state.listing;

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
      meta: listing.meta,
      contact_name: listing.contact_name,
      contact_phone: listing.contact_phone,
      contact_email: listing.contact_email
    };

    return sendJson(200, { ok: true, listing: safeListing }, request);
  }

  async function upsert(request) {
    let parsed;
    try {
      parsed = await readMultipartBody(request, MAX_MULTIPART_BYTES);
    } catch (error) {
      if (error.message === 'payload_too_large') {
        return sendError(413, 'payload_too_large', null, request);
      }
      return sendError(400, error.message || 'invalid_multipart_body', null, request);
    }

    const input = sanitizeListingInput(parsed.fields, parsed.files);

    if (input.honeypot) {
      return sendError(400, 'honeypot_rejected', null, request);
    }

    if (!input.privacyAccepted) {
      return sendError(400, 'privacy_required', null, request);
    }

    if (!input.title || !input.summary || !input.description) {
      return sendError(400, 'listing_required_fields_missing', null, request);
    }

    if (!input.contactName || !input.contactPhone || !input.contactEmail) {
      return sendError(400, 'advertiser_contact_required_fields_missing', null, request);
    }

    // Verify client-side image moderation if images are uploaded
    if (input.filesCount > 0 && !input.moderationClientChecked) {
      return sendError(400, 'image_moderation_required', null, request);
    }

    const rows = await readStore(env.LISTINGS_KV);
    const isEdit = input.mode === 'edit' || Boolean(input.editKey);

    if (isEdit) {
      const listingId = input.listingId;

      if (!listingId || !input.editKey) {
        return sendError(400, 'listing_id_and_edit_key_required', null, request);
      }

      const idx = rows.findIndex((row) => String(row.id) === listingId);
      if (idx < 0) {
        return sendError(404, 'listing_not_found', null, request);
      }

      const valid = await verifyEditKey(rows[idx], input.editKey, env.LISTINGS_EDIT_KEY_PEPPER);
      if (!valid) {
        return sendError(403, 'invalid_edit_key', null, request);
      }

      const built = await buildListingRecord(input, rows[idx], env.LISTINGS_EDIT_KEY_PEPPER);
      rows[idx] = built.record;

      await writeStore(env.LISTINGS_KV, rows);

      return sendJson(200, {
        ok: true,
        mode: 'updated',
        listing_id: built.record.id,
        listing_slug: built.record.slug
      }, request);
    }

    const built = await buildListingRecord(input, null, env.LISTINGS_EDIT_KEY_PEPPER);
    rows.push(built.record);

    await writeStore(env.LISTINGS_KV, rows);

    return sendJson(200, {
      ok: true,
      mode: 'created',
      listing_id: built.record.id,
      listing_slug: built.record.slug,
      edit_key: built.plainEditKey,
      duplicate_review: { review_required: false },
      content_policy: { review_required: false }
    }, request);
  }

  return { getStatus, upsert };
}

export { createListingsHandlers };
