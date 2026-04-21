'use strict';

const {
  readStore,
  writeStore,
  sanitizeListingInput,
  buildListingRecord,
  verifyEditKey,
  getListingEditState
} = require('../services/listings-store');
const { parseUrl, readMultipartBody, sendError, sendJson } = require('../lib/http');

const MAX_MULTIPART_BYTES = 12 * 1024 * 1024;

function createListingsHandlers(env) {
  function getStatus(req, res) {
    const url = parseUrl(req);
    const listingId = String(url.searchParams.get('listing_id') || '').trim();
    const editKey = String(url.searchParams.get('edit_key') || '').trim();

    const state = getListingEditState(env.listingsStorePath, listingId, editKey, env.listingsEditKeyPepper);
    if (!state.ok) {
      if (state.code === 'listing_id_and_edit_key_required') return sendError(res, 400, state.code);
      if (state.code === 'listing_not_found') return sendError(res, 404, state.code);
      if (state.code === 'invalid_edit_key') return sendError(res, 403, state.code);
      return sendError(res, 400, state.code || 'invalid_status_request');
    }

    return sendJson(res, 200, {
      ok: true,
      listing: state.listing
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
