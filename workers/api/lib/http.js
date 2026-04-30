/**
 * HTTP utilities for Cloudflare Workers
 * Uses Web APIs standard (Request/Response)
 */

function applyCors(request, headers) {
  const origin = request.headers.get('origin') || '';
  const allowedOrigin = 'https://neuralgpt.store';

  if (origin === allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Vary', 'Origin');
  }

  headers.set('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature, X-API-Key');

  return headers;
}

function setSecurityHeaders(headers) {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return headers;
}

function jsonResponse(statusCode, payload, request = null) {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json; charset=utf-8');

  setSecurityHeaders(headers);
  if (request) applyCors(request, headers);

  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers
  });
}

function sendJson(statusCode, payload, request = null) {
  return jsonResponse(statusCode, payload, request);
}

function sendError(statusCode, error, detail = null, request = null) {
  const body = { ok: false, error: String(error || 'unknown_error') };
  if (detail) body.detail = String(detail);
  return jsonResponse(statusCode, body, request);
}

async function readJsonBody(request, maxBytes = 256 * 1024) {
  try {
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
    if (contentLength > maxBytes) {
      throw new Error('payload_too_large');
    }

    const text = await request.text();
    if (!text || text.trim() === '') return {};

    return JSON.parse(text);
  } catch (error) {
    if (error.message === 'payload_too_large') throw error;
    throw new Error('invalid_json_body');
  }
}

async function readRawBody(request, maxBytes = 1024 * 1024) {
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > maxBytes) {
    throw new Error('payload_too_large');
  }

  return await request.arrayBuffer();
}

async function readMultipartBody(request, maxBytes = 12 * 1024 * 1024) {
  const contentType = request.headers.get('content-type') || '';
  const match = contentType.match(/boundary=([^;]+)/i);

  if (!match || !match[1]) {
    throw new Error('multipart_boundary_missing');
  }

  const boundary = match[1].trim().replace(/^"|"$/g, '');
  const rawBuffer = await readRawBody(request, maxBytes);
  const raw = new Uint8Array(rawBuffer);

  const delimiter = new TextEncoder().encode('--' + boundary);
  const closeDelimiter = new TextEncoder().encode('--' + boundary + '--');

  const fields = {};
  const files = [];
  let cursor = 0;

  while (cursor < raw.length) {
    let partStart = indexOf(raw, delimiter, cursor);
    if (partStart < 0) break;
    if (indexOf(raw, closeDelimiter, partStart) === partStart) break;

    partStart += delimiter.length;
    if (raw[partStart] === 13 && raw[partStart + 1] === 10) partStart += 2;

    const nextBoundary = indexOf(raw, delimiter, partStart);
    if (nextBoundary < 0) break;

    let part = raw.slice(partStart, nextBoundary);
    if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
      part = part.slice(0, part.length - 2);
    }

    const headerEnd = indexOf(part, new TextEncoder().encode('\r\n\r\n'), 0);
    if (headerEnd < 0) {
      cursor = nextBoundary;
      continue;
    }

    const headerText = new TextDecoder().decode(part.slice(0, headerEnd));
    const data = part.slice(headerEnd + 4);

    const disposition = headerText.split('\r\n').find((line) => /^content-disposition:/i.test(line)) || '';
    const nameMatch = disposition.match(/name="([^"]+)"/i);

    if (!nameMatch) {
      cursor = nextBoundary;
      continue;
    }

    const name = nameMatch[1];
    const fileNameMatch = disposition.match(/filename="([^"]*)"/i);

    if (fileNameMatch && fileNameMatch[1]) {
      files.push({
        fieldName: name,
        filename: fileNameMatch[1],
        size: data.length
      });
    } else {
      fields[name] = new TextDecoder().decode(data);
    }

    cursor = nextBoundary;
  }

  return { fields, files };
}

// Helper: find byte sequence in Uint8Array
function indexOf(array, search, start = 0) {
  for (let i = start; i <= array.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (array[i + j] !== search[j]) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
}

export {
  applyCors,
  setSecurityHeaders,
  sendJson,
  sendError,
  readJsonBody,
  readRawBody,
  readMultipartBody
};
