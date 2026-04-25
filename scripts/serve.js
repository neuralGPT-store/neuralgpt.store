const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Price IDs reales de Stripe Live
const PRICE_SENSACIONAL = "price_1TOPlHFVnpodYhTU9MoCCrEs";
const PRICE_MAS_VISIBILIDAD = "price_1TOPkHFVnpodYhTUDY6ZVO0m";
const PRICE_PLAN_PREMIUM = "price_1TOPjIFVnpodYhTUuIXQF1D9";
const PRICE_PLAN_BASICO = "price_1TOPi0FVnpodYhTUdV5rkCsf";
const PRICE_DONATION = String(process.env.STRIPE_DONATION_PRICE_ID || '').trim();

function sha256(str) {
  return crypto.createHash('sha256').update(String(str || '')).digest('hex');
}
const root = process.cwd();
const port = process.env.PORT || 8080;
const opsAuthUser = process.env.OPS_BASIC_AUTH_USER || '';
const opsAuthPass = process.env.OPS_BASIC_AUTH_PASS || '';
const opsViewers = String(process.env.OPS_VIEWERS || '').split(',').map((v) => v.trim()).filter(Boolean);
const opsOperators = String(process.env.OPS_OPERATORS || '').split(',').map((v) => v.trim()).filter(Boolean);
const opsAdmins = String(process.env.OPS_ADMINS || '').split(',').map((v) => v.trim()).filter(Boolean);
const listingPublicToken = String(process.env.LISTING_PUBLIC_TOKEN || '').trim();
const listingRequireToken = process.env.LISTING_REQUIRE_TOKEN === 'true';
const emailNotifyWebhookUrl = String(process.env.LISTING_EMAIL_NOTIFY_WEBHOOK_URL || '').trim();
const emailNotifyTo = String(process.env.LISTING_EMAIL_NOTIFY_TO || 'wilfreyera@gmail.com,neuralgpt.store@protonmail.com')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);
const emailNotifyEnabled = process.env.LISTING_EMAIL_NOTIFY_ENABLED !== 'false';
const publicListingRateState = new Map();
const PUBLIC_LISTING_RATE_WINDOW_MS = 15 * 60 * 1000;
const PUBLIC_LISTING_RATE_MAX = Number(process.env.PUBLIC_LISTING_RATE_MAX_OVERRIDE || '') || 5;
const statusRateState = new Map();
const STATUS_RATE_WINDOW_MS = 10 * 60 * 1000;
const STATUS_RATE_MAX = Number(process.env.PUBLIC_STATUS_RATE_MAX_OVERRIDE || '') || 20;

const opsActionEngine = require(path.join(__dirname, 'ops-action-engine.js'));
const opsBatchReviewEngine = require(path.join(__dirname, 'ops-batch-review-engine.js'));
const opsBatchItemReviewEngine = require(path.join(__dirname, 'ops-batch-item-review-engine.js'));
const opsBatchPreflightEngine = require(path.join(__dirname, 'ops-batch-preflight-engine.js'));
const opsBatchExecutionEngine = require(path.join(__dirname, 'ops-batch-execution-engine.js'));
const imageUploadGuard = require(path.join(__dirname, 'image-upload-guard.js'));
const listingFlowEngine = require(path.join(__dirname, 'listing-flow-engine.js'));

const mime = {
  '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.webp':'image/webp', '.avif':'image/avif',
  '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf', '.ico':'image/x-icon'
};

function send(res, statusCode, payload, headers) {
  res.statusCode = statusCode;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  if (headers && typeof headers === 'object') {
    Object.keys(headers).forEach((key) => res.setHeader(key, headers[key]));
  }
  if (payload == null) {
    res.end();
    return;
  }
  if (typeof payload === 'string' || Buffer.isBuffer(payload)) {
    res.end(payload);
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function send404(res){
  const filePath = path.join(root, '404.html');
  try {
    if (fs.existsSync(filePath)) {
      const html = fs.readFileSync(filePath);
      return send(res, 404, html, { 'Content-Type': 'text/html; charset=utf-8' });
    }
  } catch (_) {}
  return send(res, 404, 'Not found');
}
function send401(res){
  send(res, 401, 'Unauthorized', {
    'WWW-Authenticate': 'Basic realm="Chany Ops", charset="UTF-8"'
  });
}
function send403(res){ send(res, 403, 'Forbidden'); }
function send405(res){ send(res, 405, { ok: false, error: 'method_not_allowed' }); }

function parseJsonBody(req, callback) {
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    try {
      callback(null, JSON.parse(body || '{}'));
    } catch (e) {
      callback(e, null);
    }
  });
}

function isOpsPath(urlPath) {
  return urlPath === '/ops' || urlPath.startsWith('/ops/');
}

function parseOpsCredentials(req) {
  if (!opsAuthUser || !opsAuthPass) return { valid: false, user: null };
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Basic ')) return { valid: false, user: null };
  const token = authHeader.slice(6).trim();
  if (!token) return { valid: false, user: null };
  let decoded = '';
  try {
    decoded = Buffer.from(token, 'base64').toString('utf8');
  } catch (_error) {
    return { valid: false, user: null };
  }
  const idx = decoded.indexOf(':');
  if (idx < 0) return { valid: false, user: null };
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);
  // timing-safe comparison — previene ataques de tiempo sobre credenciales
  const userBuf = Buffer.from(user.padEnd(Math.max(user.length, opsAuthUser.length), '\0'));
  const passBuf = Buffer.from(pass.padEnd(Math.max(pass.length, opsAuthPass.length), '\0'));
  const expectedUserBuf = Buffer.from(opsAuthUser.padEnd(Math.max(user.length, opsAuthUser.length), '\0'));
  const expectedPassBuf = Buffer.from(opsAuthPass.padEnd(Math.max(pass.length, opsAuthPass.length), '\0'));
  const userMatch = crypto.timingSafeEqual(userBuf, expectedUserBuf);
  const passMatch = crypto.timingSafeEqual(passBuf, expectedPassBuf);
  const valid = userMatch && passMatch && user === opsAuthUser && pass === opsAuthPass;
  return { valid, user: user || null };
}

function hasUser(list, user) {
  if (!user) return false;
  if (!Array.isArray(list) || !list.length) return false;
  return list.includes(user) || list.includes('*');
}

function resolveRole(user) {
  if (hasUser(opsAdmins, user)) return 'admin';
  if (hasUser(opsOperators, user)) return 'operator';
  if (hasUser(opsViewers, user)) return 'viewer';
  return 'viewer';
}

function parseJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        resolve(JSON.parse(raw));
      } catch (_error) {
        reject(new Error('invalid_json_body'));
      }
    });
    req.on('error', (error) => reject(error));
  });
}

function parseMultipartBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers['content-type'] || '');
    const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
    if (!boundaryMatch || !boundaryMatch[1]) {
      reject(new Error('multipart_boundary_missing'));
      return;
    }
    const boundary = boundaryMatch[1].trim().replace(/^"|"$/g, '');
    const chunks = [];
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks);
        const delimiter = Buffer.from('--' + boundary);
        const closeDelimiter = Buffer.from('--' + boundary + '--');
        const fields = {};
        const files = [];
        let cursor = 0;
        while (cursor < body.length) {
          let partStart = body.indexOf(delimiter, cursor);
          if (partStart < 0) break;
          if (body.indexOf(closeDelimiter, partStart) === partStart) break;
          partStart += delimiter.length;
          if (body[partStart] === 13 && body[partStart + 1] === 10) partStart += 2;
          const nextBoundary = body.indexOf(delimiter, partStart);
          if (nextBoundary < 0) break;
          let part = body.slice(partStart, nextBoundary);
          if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
            part = part.slice(0, part.length - 2);
          }
          const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
          if (headerEnd < 0) {
            cursor = nextBoundary;
            continue;
          }
          const headerText = part.slice(0, headerEnd).toString('utf8');
          const data = part.slice(headerEnd + 4);
          const dispositionLine = headerText.split('\r\n').find((line) => /^content-disposition:/i.test(line)) || '';
          const nameMatch = dispositionLine.match(/name=\"([^\"]+)\"/i);
          if (!nameMatch || !nameMatch[1]) {
            cursor = nextBoundary;
            continue;
          }
          const fieldName = nameMatch[1];
          const fileNameMatch = dispositionLine.match(/filename=\"([^\"]*)\"/i);
          if (fileNameMatch && fileNameMatch[1]) {
            const fileContentTypeLine = headerText.split('\r\n').find((line) => /^content-type:/i.test(line)) || '';
            const mimeType = fileContentTypeLine.split(':')[1] ? fileContentTypeLine.split(':')[1].trim().toLowerCase() : null;
            files.push({
              field_name: fieldName,
              filename: fileNameMatch[1],
              mime_type: mimeType,
              buffer: data
            });
          } else {
            fields[fieldName] = data.toString('utf8');
          }
          cursor = nextBoundary;
        }
        resolve({ fields, files });
      } catch (error) {
        reject(new Error('invalid_multipart_body'));
      }
    });
    req.on('error', (error) => reject(error));
  });
}

function normalizeIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (forwarded) return forwarded;
  return String(req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown');
}

function checkPublicListingRateLimit(ip) {
  const now = Date.now();
  if (publicListingRateState.size > 5000) {
    publicListingRateState.forEach((stamps, k) => {
      if (!stamps.some((s) => (now - s) < PUBLIC_LISTING_RATE_WINDOW_MS)) publicListingRateState.delete(k);
    });
  }
  const key = String(ip || 'unknown');
  const existing = publicListingRateState.get(key) || [];
  const fresh = existing.filter((stamp) => (now - stamp) < PUBLIC_LISTING_RATE_WINDOW_MS);
  if (fresh.length >= PUBLIC_LISTING_RATE_MAX) {
    const retryAfterMs = PUBLIC_LISTING_RATE_WINDOW_MS - (now - fresh[0]);
    return { allowed: false, retry_after_seconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  fresh.push(now);
  publicListingRateState.set(key, fresh);
  return { allowed: true, retry_after_seconds: 0 };
}

function checkStatusRateLimit(ip, listingId) {
  const now = Date.now();
  const key = String(ip || 'unknown') + '::' + String(listingId || '');
  const existing = statusRateState.get(key) || [];
  const fresh = existing.filter((stamp) => (now - stamp) < STATUS_RATE_WINDOW_MS);
  if (fresh.length >= STATUS_RATE_MAX) {
    const retryAfterMs = STATUS_RATE_WINDOW_MS - (now - fresh[0]);
    return { allowed: false, retry_after_seconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  fresh.push(now);
  statusRateState.set(key, fresh);
  return { allowed: true, retry_after_seconds: 0 };
}

function safePathInsideRoot(baseRoot, candidatePath) {
  const resolvedRoot = path.resolve(baseRoot);
  const resolvedCandidate = path.resolve(candidatePath);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep);
}

function isSensitiveUrlPath(urlPath) {
  const parts = String(urlPath || '').split('/').filter(Boolean);
  const hasHiddenSegment = parts.some((segment) => segment.startsWith('.') && segment !== '.well-known');
  if (hasHiddenSegment) return true;
  if (urlPath === '/package.json' || urlPath === '/package-lock.json') return true;
  if (urlPath === '/runtime' || urlPath.startsWith('/runtime/')) return true;
  if (urlPath === '/docs' || urlPath.startsWith('/docs/')) return true;
  if (urlPath === '/data/private' || urlPath.startsWith('/data/private/')) return true;
  return false;
}

function normalizeContactPhone(raw) {
  const text = String(raw || '').trim();
  return text.replace(/[^\d+().\- ]/g, '').slice(0, 40);
}

function sanitizeErrorCode(value) {
  return String(value || 'unknown_error').replace(/[^a-z0-9_:.+-]/gi, '_').slice(0, 120);
}

function cleanText(value, maxLen) {
  return String(value || '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}

function ensureOpsWriteAllowed(authContext, res) {
  const role = authContext && authContext.role ? String(authContext.role) : 'viewer';
  if (role === 'operator' || role === 'admin') return true;
  send(res, 403, { ok: false, error: 'forbidden_role_insufficient' });
  return false;
}

function writePublicListingLog(entry) {
  const filePath = path.join(root, 'data', 'chany', 'public-listing-upsert-log.jsonl');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');
}

function writeEmailNotificationLog(entry) {
  const filePath = path.join(root, 'data', 'chany', 'email-notifications.log.jsonl');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');
}

function postJson(urlStr, payload) {
  return new Promise((resolve, reject) => {
    let urlObj = null;
    try {
      urlObj = new URL(urlStr);
    } catch (_error) {
      reject(new Error('invalid_notification_webhook_url'));
      return;
    }
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    const transport = urlObj.protocol === 'https:' ? https : http;
    const req = transport.request({
      method: 'POST',
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + (urlObj.search || ''),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': String(body.length)
      },
      timeout: 4500
    }, (resp) => {
      const chunks = [];
      resp.on('data', (chunk) => chunks.push(chunk));
      resp.on('end', () => {
        const status = Number(resp.statusCode || 0);
        if (status >= 200 && status < 300) {
          resolve({ ok: true, status });
          return;
        }
        reject(new Error('notification_webhook_http_' + String(status || '0')));
      });
    });
    req.on('timeout', () => req.destroy(new Error('notification_webhook_timeout')));
    req.on('error', (error) => reject(error));
    req.write(body);
    req.end();
  });
}

function triggerEmailNotification(eventPayload) {
  if (!emailNotifyEnabled) return;
  const envelope = {
    ts: new Date().toISOString(),
    channel: 'listing_public_portal',
    recipients: emailNotifyTo,
    payload: eventPayload
  };
  writeEmailNotificationLog(envelope);
  if (!emailNotifyWebhookUrl) return;
  postJson(emailNotifyWebhookUrl, envelope)
    .then((result) => {
      writeEmailNotificationLog({
        ts: new Date().toISOString(),
        channel: 'listing_public_portal',
        recipients: emailNotifyTo,
        transport: 'webhook',
        status: 'sent',
        status_code: result.status,
        listing_id: eventPayload && eventPayload.listing_id ? eventPayload.listing_id : null
      });
    })
    .catch((error) => {
      writeEmailNotificationLog({
        ts: new Date().toISOString(),
        channel: 'listing_public_portal',
        recipients: emailNotifyTo,
        transport: 'webhook',
        status: 'failed',
        listing_id: eventPayload && eventPayload.listing_id ? eventPayload.listing_id : null,
        error: error && error.message ? error.message : 'notification_dispatch_failed'
      });
    });
}

function handleStripeWebhookEvent(event, res) {
  // Manejar eventos de suscripciones
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object;
    const subscribersPath = path.join(root, 'data', 'subscribers.json');
    try {
      let subscribers = [];
      if (fs.existsSync(subscribersPath)) {
        subscribers = JSON.parse(fs.readFileSync(subscribersPath, 'utf8'));
      }
      subscribers.push({
        customer_id: subscription.customer,
        subscription_id: subscription.id,
        status: subscription.status,
        plan_id: subscription.items.data[0]?.price?.id || null,
        created_at: new Date().toISOString()
      });
      fs.writeFileSync(subscribersPath, JSON.stringify(subscribers, null, 2), 'utf8');
      console.log('Subscription created:', subscription.id);
      return send(res, 200, { ok: true, received: true, processed: 'subscription_created' });
    } catch (e) {
      console.error('Subscription creation error:', e.message);
      return send(res, 500, { ok: false, error: 'subscription_processing_failed' });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const subscribersPath = path.join(root, 'data', 'subscribers.json');
    try {
      if (fs.existsSync(subscribersPath)) {
        let subscribers = JSON.parse(fs.readFileSync(subscribersPath, 'utf8'));
        subscribers = subscribers.filter(s => s.subscription_id !== subscription.id);
        fs.writeFileSync(subscribersPath, JSON.stringify(subscribers, null, 2), 'utf8');
      }
      console.log('Subscription deleted:', subscription.id);
      return send(res, 200, { ok: true, received: true, processed: 'subscription_deleted' });
    } catch (e) {
      console.error('Subscription deletion error:', e.message);
      return send(res, 500, { ok: false, error: 'subscription_deletion_failed' });
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const income = {
      fecha: new Date().toISOString(),
      concepto: 'subscription_payment',
      importe: invoice.amount_paid / 100,
      iva: 0.21,
      neto: parseFloat(((invoice.amount_paid / 100) / 1.21).toFixed(2)),
      stripe_invoice: invoice.id,
      customer_id: invoice.customer
    };
    const mes = new Date().toISOString().slice(0,7);
    const fiscalDir = path.join(root, 'data', 'fiscal', 'ingresos', mes);
    fs.mkdirSync(fiscalDir, { recursive: true });
    const fiscalFile = path.join(fiscalDir, `ingresos-${mes}.jsonl`);
    fs.appendFileSync(fiscalFile, JSON.stringify(income) + '\n', 'utf8');
    console.log('Invoice payment processed:', invoice.id, income.importe, 'EUR');
    return send(res, 200, { ok: true, received: true, processed: 'invoice_payment' });
  }

  if (event.type !== 'checkout.session.completed') {
    return send(res, 200, { ok: true, received: true, skipped: event.type });
  }
  const session = event.data.object;
  const { listing_id, type } = session.metadata || {};
  if (!listing_id || !type) {
    console.warn('Webhook session missing metadata:', session.id);
    return send(res, 200, { ok: true, received: true, warning: 'missing_metadata' });
  }
  const listingsPath = path.join(root, 'data', 'listings.json');
  try {
    const listings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
    const idx = listings.findIndex(l => l.id === listing_id || l.slug === listing_id);
    if (idx === -1) {
      console.warn('Listing not found:', listing_id);
      return send(res, 200, { ok: true, received: true, warning: 'listing_not_found' });
    }
    if (type === 'contact_unlock') {
      listings[idx].contact_unlocked = true;
      listings[idx].contact_unlocked_at = new Date().toISOString();
    }
    if (type === 'mas_visibilidad') {
      listings[idx].featured = true;
      listings[idx].featured_until = new Date(Date.now() + 30*24*60*60*1000).toISOString();
    }
    if (type === 'sensacional_24h') {
      listings[idx].sensacional = true;
      listings[idx].sensacional_until = new Date(Date.now() + 24*60*60*1000).toISOString();
    }
    fs.writeFileSync(listingsPath, JSON.stringify(listings, null, 2), 'utf8');
    const income = {
      fecha: new Date().toISOString(),
      concepto: type,
      importe: session.amount_total / 100,
      iva: 0.21,
      neto: parseFloat(((session.amount_total / 100) / 1.21).toFixed(2)),
      stripe_session: session.id,
      listing_id: listing_id
    };
    const mes = new Date().toISOString().slice(0,7);
    const fiscalDir = path.join(root, 'data', 'fiscal', 'ingresos', mes);
    fs.mkdirSync(fiscalDir, { recursive: true });
    const fiscalFile = path.join(fiscalDir, `ingresos-${mes}.jsonl`);
    fs.appendFileSync(fiscalFile, JSON.stringify(income) + '\n', 'utf8');
    console.log('Webhook processed:', type, listing_id, session.amount_total / 100, 'EUR');
    return send(res, 200, { ok: true, received: true, processed: type });
  } catch (e) {
    console.error('Webhook processing error:', e.message);
    return send(res, 500, { ok: false, error: 'processing_failed' });
  }
}

function handleOpsApi(req, res, urlPath, authContext) {
  if (urlPath === '/ops/api/actions/recent') {
    if (req.method !== 'GET') return send405(res);
    const query = req.url.includes('?') ? req.url.split('?')[1] : '';
    const searchParams = new URLSearchParams(query);
    const limit = Number(searchParams.get('limit') || '20');
    try {
      const entries = opsActionEngine.listRecentActions({ root, limit });
      return send(res, 200, {
        ok: true,
        role: authContext.role || 'viewer',
        count: entries.length,
        entries
      });
    } catch (error) {
      return send(res, 500, { ok: false, error: error.message || 'recent_actions_failed' });
    }
  }

  if (urlPath === '/ops/api/actions/apply') {
    if (req.method !== 'POST') return send405(res);
    if (!ensureOpsWriteAllowed(authContext, res)) return;
    return parseJsonBody(req, 128 * 1024)
      .then((body) => {
        const actorFallback = authContext && authContext.user ? authContext.user : null;
        const role = authContext && authContext.role ? authContext.role : 'viewer';
        const payload = Object.assign({}, body, {
          actor: actorFallback
        });
        const result = opsActionEngine.applyAction(payload, {
          root,
          actor: actorFallback,
          role
        });
        send(res, 200, result);
      })
      .catch((error) => {
        const isClientError = String(error && error.message || '').startsWith('action_') ||
          String(error && error.message || '').includes('_required') ||
          String(error && error.message || '').includes('invalid_') ||
          String(error && error.message || '').includes('target_not_found') ||
          String(error && error.message || '').includes('reason_too_short') ||
          String(error && error.message || '').includes('confirmation_required') ||
          String(error && error.message || '').includes('payload_too_large');
        send(res, isClientError ? 400 : 500, {
          ok: false,
          error: error && error.message ? error.message : 'apply_failed'
        });
      });
  }

  if (urlPath === '/ops/api/batches/reviews/recent') {
    if (req.method !== 'GET') return send405(res);
    const query = req.url.includes('?') ? req.url.split('?')[1] : '';
    const searchParams = new URLSearchParams(query);
    const limit = Number(searchParams.get('limit') || '20');
    try {
      const entries = opsBatchReviewEngine.listRecentReviews({ root, limit });
      return send(res, 200, {
        ok: true,
        role: authContext.role || 'viewer',
        count: entries.length,
        entries
      });
    } catch (error) {
      return send(res, 500, { ok: false, error: error.message || 'recent_batch_reviews_failed' });
    }
  }

  if (urlPath === '/ops/api/batches/review') {
    if (req.method !== 'POST') return send405(res);
    if (!ensureOpsWriteAllowed(authContext, res)) return;
    return parseJsonBody(req, 128 * 1024)
      .then((body) => {
        const actorFallback = authContext && authContext.user ? authContext.user : null;
        const role = authContext && authContext.role ? authContext.role : 'viewer';
        const payload = Object.assign({}, body, {
          reviewed_by: body && body.reviewed_by ? body.reviewed_by : actorFallback
        });
        const result = opsBatchReviewEngine.submitReview(payload, {
          root,
          actor: actorFallback,
          role
        });
        send(res, 200, result);
      })
      .catch((error) => {
        const message = error && error.message ? error.message : 'batch_review_failed';
        const isClientError = message.includes('_required') ||
          message.includes('invalid_') ||
          message.includes('forbidden') ||
          message.includes('payload_too_large');
        send(res, isClientError ? 400 : 500, {
          ok: false,
          error: message
        });
      });
  }

  if (urlPath === '/ops/api/batches/items/reviews/recent') {
    if (req.method !== 'GET') return send405(res);
    const query = req.url.includes('?') ? req.url.split('?')[1] : '';
    const searchParams = new URLSearchParams(query);
    const limit = Number(searchParams.get('limit') || '40');
    try {
      const entries = opsBatchItemReviewEngine.listRecentItemReviews({ root, limit });
      return send(res, 200, {
        ok: true,
        role: authContext.role || 'viewer',
        count: entries.length,
        entries
      });
    } catch (error) {
      return send(res, 500, { ok: false, error: error.message || 'recent_batch_item_reviews_failed' });
    }
  }

  if (urlPath === '/ops/api/batches/items/review') {
    if (req.method !== 'POST') return send405(res);
    if (!ensureOpsWriteAllowed(authContext, res)) return;
    return parseJsonBody(req, 128 * 1024)
      .then((body) => {
        const actorFallback = authContext && authContext.user ? authContext.user : null;
        const role = authContext && authContext.role ? authContext.role : 'viewer';
        const payload = Object.assign({}, body, {
          reviewed_by: body && body.reviewed_by ? body.reviewed_by : actorFallback
        });
        const result = opsBatchItemReviewEngine.submitItemReview(payload, {
          root,
          actor: actorFallback,
          role
        });
        send(res, 200, result);
      })
      .catch((error) => {
        const message = error && error.message ? error.message : 'batch_item_review_failed';
        const isClientError = message.includes('_required') ||
          message.includes('invalid_') ||
          message.includes('forbidden') ||
          message.includes('payload_too_large');
        const statusCode = Number.isFinite(error && error.statusCode) ? error.statusCode : (isClientError ? 400 : 500);
        send(res, statusCode, {
          ok: false,
          error: message,
          error_code: error && error.error_code ? error.error_code : null,
          details: error && error.details ? error.details : null
        });
      });
  }

  if (urlPath === '/ops/api/batches/execute') {
    if (req.method !== 'POST') return send405(res);
    if (!ensureOpsWriteAllowed(authContext, res)) return;
    return parseJsonBody(req, 128 * 1024)
      .then((body) => {
        const actorFallback = authContext && authContext.user ? authContext.user : null;
        const role = authContext && authContext.role ? authContext.role : 'viewer';
        const result = opsBatchExecutionEngine.executeBatch(body, {
          root,
          actor: actorFallback,
          role
        });
        const status = result.ok ? 200 : (result.preflight_blocked ? 400 : 500);
        send(res, status, result);
      })
      .catch((error) => {
        const msg = error && error.message ? error.message : 'execution_failed';
        const isClientError = msg.includes('_required') || msg.includes('invalid_') ||
          msg.includes('forbidden') || msg.includes('confirmation_required') ||
          msg.includes('too_short') || msg.includes('payload_too_large');
        send(res, isClientError ? 400 : 500, { ok: false, error: msg });
      });
  }

  if (urlPath === '/ops/api/batches/executions/recent') {
    if (req.method !== 'GET') return send405(res);
    const query = req.url.includes('?') ? req.url.split('?')[1] : '';
    const searchParams = new URLSearchParams(query);
    const limit = Number(searchParams.get('limit') || '20');
    try {
      const entries = opsBatchExecutionEngine.listRecentExecutions({ root, limit });
      return send(res, 200, { ok: true, role: authContext.role || 'viewer', count: entries.length, entries });
    } catch (error) {
      return send(res, 500, { ok: false, error: error.message || 'executions_list_failed' });
    }
  }

  if (urlPath.startsWith('/ops/api/batches/executions/') && req.method === 'GET') {
    const executionId = decodeURIComponent(urlPath.replace('/ops/api/batches/executions/', ''));
    if (!executionId || executionId.length > 128 || /[\x00-\x1f\x7f]/.test(executionId)) return send404(res);
    try {
      const entry = opsBatchExecutionEngine.getExecution(executionId, { root });
      if (!entry) return send(res, 404, { ok: false, error: 'execution_not_found' });
      return send(res, 200, { ok: true, role: authContext.role || 'viewer', execution: entry });
    } catch (error) {
      return send(res, 500, { ok: false, error: error.message || 'execution_get_failed' });
    }
  }

  if (urlPath === '/ops/api/batches/preflight') {
    if (req.method !== 'GET') return send405(res);
    try {
      const snapshotPath = path.join(root, 'data', 'chany', 'ops-snapshot.json');
      if (!fs.existsSync(snapshotPath)) {
        return send(res, 404, { ok: false, error: 'snapshot_not_found' });
      }
      const snap = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      const listingsPath = path.join(root, 'data', 'listings.json');
      const listingsData = fs.existsSync(listingsPath)
        ? JSON.parse(fs.readFileSync(listingsPath, 'utf8'))
        : [];
      const batchReviewPath = path.join(root, 'data', 'chany', 'batch-review-log.jsonl');
      const itemReviewPath = path.join(root, 'data', 'chany', 'batch-item-review-log.jsonl');
      const conflictPath = path.join(root, 'data', 'chany', 'batch-item-review-conflicts.log.jsonl');
      const executionPath = path.join(root, 'data', 'chany', 'batch-execution-log.jsonl');
      function readJsonlFile(p) {
        if (!fs.existsSync(p)) return [];
        const raw = fs.readFileSync(p, 'utf8');
        if (!raw.trim()) return [];
        const out = [];
        raw.split(/\r?\n/).forEach((line) => {
          const text = line.trim();
          if (!text) return;
          try { out.push(JSON.parse(text)); } catch (_) { /* skip */ }
        });
        return out;
      }
      const result = opsBatchPreflightEngine.runBatchPreflight({
        batches: Array.isArray(snap.operational_batches) ? snap.operational_batches : [],
        validations: Array.isArray(snap.operational_batch_validations) ? snap.operational_batch_validations : [],
        batchReviews: readJsonlFile(batchReviewPath),
        itemReviews: readJsonlFile(itemReviewPath),
        conflicts: readJsonlFile(conflictPath),
        executionLogs: readJsonlFile(executionPath),
        listingsData
      });
      return send(res, 200, { ok: true, role: authContext.role || 'viewer', ...result });
    } catch (error) {
      return send(res, 500, { ok: false, error: error.message || 'preflight_failed' });
    }
  }

  // inventario de ecosistema: artefactos nuevos, docs, huérfanos
  if (urlPath === '/ops/api/ecosystem/status') {
    if (req.method !== 'GET') return send405(res);
    try {
      const checkFile = (rel) => fs.existsSync(path.join(root, rel));
      const KNOWN_SCRIPTS = [
        { path: 'scripts/ops-batch-preflight-engine.js', note: 'Motor de preflight — nuevo en Fase 4C.0', status: 'active' },
        { path: 'scripts/ops-batch-execution-engine.js', note: 'Motor de ejecución manual — nuevo en Fase 4C', status: 'active' },
        { path: 'scripts/image-upload-guard.js', note: 'Validador de imágenes — nuevo en Fase 4C.1', status: 'active' },
        { path: 'scripts/ops-batch-review-engine.js', note: 'Motor de revisión de lotes', status: 'active' },
        { path: 'scripts/ops-batch-item-review-engine.js', note: 'Motor de revisión por ítem', status: 'active' },
        { path: 'scripts/sync-clawbot-readonly.js', note: 'Sincronización Chany — archivo técnico, renombre pendiente', status: 'active' },
        { path: 'scripts/check-ops-batch-item-review-api.js', note: 'Script de check de API — pendiente de clasificar', status: 'review' },
        { path: 'scripts/check-chany-snapshot-regression.js', note: 'Regresión de snapshot — pendiente de clasificar', status: 'review' },
        { path: 'scripts/inventory-asset-references.js', note: 'Inventario de assets — potencialmente redundante', status: 'review' },
        { path: 'scripts/ops-action-engine.js', note: 'Motor de acciones — modificado en Fase 4B', status: 'active' },
        { path: 'scripts/ops-batch-item-review-engine.js', note: 'Motor de revisión por ítem', status: 'active' }
      ];
      const DOCS_FILES = [
        'docs/migration-plan/phase-36-full-product-convergence-map.md',
        'docs/migration-plan/phase-37-convergence-execution-plan-wave-1.md',
        'docs/migration-plan/phase-38-wave-1-execution-gate-and-retirement-prep.md',
        'docs/migration-plan/phase-3b1-rbac-idempotency-dryrun.md',
        'docs/migration-plan/wave-1-execution-checklist.md',
        'docs/migration-plan/wave-1-retirement-manifest.json',
        'docs/migration-plan/component-retirement-matrix.csv',
        'docs/migration-plan/convergence-decision-matrix.csv',
        'reports/bridge-public-surfaces.patch',
        'reports/wave-1-readiness-status.md'
      ];
      const OTHER_ARTIFACTS = [
        { path: 'deploy/reverse-proxy/', note: 'Configuración de reverse proxy — pendiente de integrar al deploy', status: 'pending' },
        { path: 'css/design-tokens.css', note: 'Design tokens — nuevo, fuente única de verdad de paleta', status: 'active' }
      ];
      const scripts = KNOWN_SCRIPTS.filter((s) => checkFile(s.path));
      const docs = DOCS_FILES.map((d) => ({ path: d, note: 'Plan de migración' })).filter((d) => checkFile(d.path));
      const orphans = [
        ...scripts.filter((s) => s.status === 'review'),
        ...OTHER_ARTIFACTS.filter((a) => a.status === 'pending' && checkFile(a.path))
      ];
      const active = [
        ...scripts.filter((s) => s.status === 'active'),
        ...OTHER_ARTIFACTS.filter((a) => a.status === 'active' && checkFile(a.path))
      ];
      return send(res, 200, {
        ok: true,
        generated_at: new Date().toISOString(),
        active_count: active.length,
        docs_count: docs.length,
        review_count: orphans.length,
        active,
        scripts: active,
        docs,
        orphans
      });
    } catch (error) {
      return send(res, 500, { ok: false, error: error.message || 'ecosystem_status_failed' });
    }
  }

  // endpoint de validación de metadatos de imágenes (sin almacenamiento)
  if (urlPath === '/ops/api/images/validate') {
    if (req.method !== 'POST') return send405(res);
    return parseJsonBody(req, 32 * 1024)
      .then((body) => {
        const files = Array.isArray(body && body.files) ? body.files : [];
        const result = imageUploadGuard.validateUploadBatch(files);
        send(res, result.ok ? 200 : 422, { ok: result.ok, ...result });
      })
      .catch((error) => {
        send(res, 400, { ok: false, error: error && error.message ? error.message : 'validate_failed' });
      });
  }

  if (urlPath === '/api/listings/upsert') {
    if (req.method !== 'POST') return send405(res);
    const ip = normalizeIp(req);
    const rate = checkPublicListingRateLimit(ip);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retry_after_seconds));
      return send(res, 429, {
        ok: false,
        error: 'rate_limit_exceeded',
        message: 'Demasiadas solicitudes de publicación/edición. Intenta más tarde.',
        retry_after_seconds: rate.retry_after_seconds
      });
    }

    // modo estricto: LISTING_REQUIRE_TOKEN=true sin token configurado → endpoint deshabilitado
    if (listingRequireToken && !listingPublicToken) {
      return send(res, 503, { ok: false, error: 'listing_endpoint_disabled', message: 'Publicación no habilitada en este entorno. Configura LISTING_PUBLIC_TOKEN.' });
    }
    if (listingPublicToken) {
      const providedToken = String(req.headers['x-listing-token'] || '').trim();
      if (!providedToken || providedToken !== listingPublicToken) {
        return send(res, 403, { ok: false, error: 'forbidden_invalid_listing_token', message: 'Token de publicación inválido.' });
      }
    }

    let uploadDirRef = null;
    let lastMode = 'upsert';
    let lastSafeListingId = null;
    parseMultipartBody(req, 48 * 1024 * 1024)
      .then(async (multipart) => {
        const fields = multipart && multipart.fields ? multipart.fields : {};
        lastMode = fields.mode || 'upsert';
        const files = Array.isArray(multipart && multipart.files) ? multipart.files : [];

        // anti-bot: campo honeypot oculto — si viene relleno, es un bot
        if (String(fields.hp_check || '').trim() !== '') {
          const err = new Error('bot_check_failed');
          err.statusCode = 400;
          throw err;
        }

        if (String(fields.privacy_accepted || '').toLowerCase() !== 'true') {
          const err = new Error('privacy_acceptance_required');
          err.statusCode = 400;
          throw err;
        }
        if (files.length > 6) {
          const err = new Error('too_many_files_max_6');
          err.statusCode = 422;
          throw err;
        }
        const totalBytes = files.reduce((acc, item) => acc + (item && item.buffer ? item.buffer.length : 0), 0);
        if (totalBytes > (40 * 1024 * 1024)) {
          const err = new Error('files_total_size_exceeded');
          err.statusCode = 422;
          throw err;
        }

        // sanitizar listing_id: solo chars seguros para paths — sin puntos para evitar path traversal
        const rawListingId = String(fields.listing_id || fields.id || '').trim();
        const safeListingId = rawListingId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 80) || null;
        lastSafeListingId = safeListingId;
        if (!safeListingId) {
          const err = new Error('listing_id_invalid_or_missing');
          err.statusCode = 400;
          throw err;
        }
        const contactName = cleanText(fields.contact_name, 80);
        const contactEmail = cleanText(fields.contact_email, 120).toLowerCase();
        const contactPhone = normalizeContactPhone(fields.contact_phone || '');
        if (!contactName || !contactEmail || !contactPhone) {
          const err = new Error('advertiser_contact_required_fields_missing:contact_name,contact_phone,contact_email');
          err.statusCode = 400;
          throw err;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
          const err = new Error('contact_email_invalid');
          err.statusCode = 400;
          throw err;
        }
        if (contactPhone.replace(/[^\d]/g, '').length < 7) {
          const err = new Error('contact_phone_invalid');
          err.statusCode = 400;
          throw err;
        }

        const uploadDir = path.join(root, 'data', 'tmp', 'uploads', Date.now().toString(36));
        fs.mkdirSync(uploadDir, { recursive: true });
        uploadDirRef = uploadDir;
        const imageFiles = files.map((item, idx) => {
          const safeName = path.basename(String(item.filename || ('upload_' + idx)));
          const absPath = path.join(uploadDir, String(idx + 1).padStart(2, '0') + '_' + safeName);
          fs.writeFileSync(absPath, item.buffer);
          return {
            path: absPath,
            original_name: safeName,
            mime: item.mime_type || null
          };
        });

        const listing = {
          id: safeListingId,
          slug: cleanText(fields.slug, 120) || null,
          title: cleanText(fields.title, 180) || null,
          summary: cleanText(fields.summary, 450) || null,
          description: cleanText(fields.description, 7000) || null,
          operation: cleanText(fields.operation, 40) || null,
          asset_type: cleanText(fields.asset_type, 40) || null,
          country: cleanText(fields.country, 16).toUpperCase() || null,
          region: cleanText(fields.region, 120) || null,
          city: cleanText(fields.city, 120) || null,
          zone: cleanText(fields.zone, 140) || null,
          price: Number(fields.price || 0),
          currency: 'EUR',
          surface_m2: Number(fields.surface_m2 || 0),
          rooms: fields.rooms ? Number(fields.rooms) : null,
          bathrooms: fields.bathrooms ? Number(fields.bathrooms) : null,
          images: [],
          coordinates: {
            lat: Number(fields.lat || 0),
            lng: Number(fields.lng || 0)
          },
          badges: [],
          contact_cta: 'Solicitar información',
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone
        };
        if (String(fields.mode || 'upsert') !== 'edit') {
          listing.status = 'pending';
          listing.verification_state = 'pending';
          listing.featured = false;
          listing.published_at = new Date().toISOString();
          listing.expiration_at = new Date(Date.now() + (90 * 86400000)).toISOString();
        }

        const result = await listingFlowEngine.upsertListing({
          mode: fields.mode || 'upsert',
          target_id: fields.target_id || null,
          edit_key: fields.edit_key || null,
          listing: listing,
          image_files: imageFiles
        }, {
          root,
          actor: 'public_portal',
          role: 'publisher'
        });

        writePublicListingLog({
          ts: new Date().toISOString(),
          ok: true,
          ip: ip,
          listing_id: result && result.listing ? result.listing.id : null,
          mode: result && result.mode ? result.mode : null,
          image_processed_count: result && result.listing ? Number(result.listing.image_processed_count || 0) : 0,
          content_policy_score: result && result.content_policy ? Number(result.content_policy.content_policy_score || 0) : 0,
          content_policy_review_required: !!(result && result.content_policy && result.content_policy.review_required),
          duplicate_score: result && result.duplicate_review ? Number(result.duplicate_review.duplicate_score || 0) : 0,
          review_required: !!(
            (result && result.duplicate_review && result.duplicate_review.review_required) ||
            (result && result.content_policy && result.content_policy.review_required)
          ),
          duplicate_abuse_blocked: !!(result && result.duplicate_review && result.duplicate_review.duplicate_abuse_blocked)
        });
        triggerEmailNotification({
          event: 'listing_upsert_ok',
          mode: result && result.mode ? result.mode : (fields.mode || 'upsert'),
          ip: ip,
          listing_id: result && result.listing ? result.listing.id : null,
          listing_slug: result && result.listing ? result.listing.slug : null,
          operation: listing.operation || null,
          city: listing.city || null,
          country: listing.country || null,
          review_required: !!(
            (result && result.duplicate_review && result.duplicate_review.review_required) ||
            (result && result.content_policy && result.content_policy.review_required)
          ),
          duplicate_abuse_blocked: !!(result && result.duplicate_review && result.duplicate_review.duplicate_abuse_blocked)
        });

        // respuesta pública filtrada: no exponer internos de moderación ni ops_flags
        const publicResult = {
          ok: result.ok,
          mode: result.mode,
          edit_key: result.edit_key || null,
          listing_id: result.listing ? result.listing.id : null,
          listing_slug: result.listing ? result.listing.slug : null,
          content_policy: result.content_policy ? {
            content_policy_score: result.content_policy.content_policy_score,
            content_policy_flags: result.content_policy.content_policy_flags,
            review_required: result.content_policy.review_required
          } : null,
          duplicate_review: result.duplicate_review ? {
            duplicate_score: result.duplicate_review.duplicate_score,
            review_required: result.duplicate_review.review_required,
            duplicate_abuse_blocked: result.duplicate_review.duplicate_abuse_blocked,
            review_severity: result.duplicate_review.review_severity
          } : null
        };
        return send(res, 200, publicResult);
      })
      .catch((error) => {
        const statusCode = Number.isFinite(error && error.statusCode) ? error.statusCode : 500;
        writePublicListingLog({
          ts: new Date().toISOString(),
          ok: false,
          ip: ip,
          error: error && error.message ? error.message : 'public_listing_upsert_failed'
        });
        triggerEmailNotification({
          event: 'listing_upsert_failed',
          mode: lastMode,
          ip: ip,
          listing_id: lastSafeListingId,
          error: error && error.message ? error.message : 'public_listing_upsert_failed'
        });
        return send(res, statusCode, {
          ok: false,
          error: sanitizeErrorCode(error && error.message ? error.message : 'public_listing_upsert_failed'),
          message: 'No se pudo publicar/editar el anuncio.',
          details: null
        });
      })
      .finally(() => {
        if (uploadDirRef) {
          try { fs.rmSync(uploadDirRef, { recursive: true, force: true }); } catch (_) {}
        }
      });
    return;
  }

  // alta/edición real de listing con pipeline de imágenes + anti-duplicado (sin acciones destructivas)
  if (urlPath === '/ops/api/listings/upsert') {
    if (req.method !== 'POST') return send405(res);
    if (!ensureOpsWriteAllowed(authContext, res)) return;
    return parseJsonBody(req, 2 * 1024 * 1024)
      .then((body) => {
        const actorFallback = authContext && authContext.user ? authContext.user : null;
        const role = authContext && authContext.role ? authContext.role : 'viewer';
        return listingFlowEngine.upsertListing(body || {}, {
          root,
          actor: actorFallback || 'ops_local',
          role
        });
      })
      .then((result) => {
        const blocked = result && result.duplicate_review && result.duplicate_review.duplicate_abuse_blocked === true;
        send(res, blocked ? 202 : 200, result);
      })
      .catch((error) => {
        const statusCode = Number.isFinite(error && error.statusCode) ? error.statusCode : 500;
        send(res, statusCode, {
          ok: false,
          error: error && error.message ? error.message : 'listing_upsert_failed',
          details: error && error.details ? error.details : null
        });
      });
  }

  // estado público de un anuncio — verificación de edit_key sin auth
  if (urlPath === '/api/listings/status') {
    if (req.method !== 'GET') return send405(res);
    const queryStr = req.url.includes('?') ? req.url.split('?')[1] : '';
    const sp = new URLSearchParams(queryStr);
    const statusListingId = String(sp.get('listing_id') || '').trim();
    const statusEditKey = String(sp.get('edit_key') || '').trim();
    if (!statusListingId || !statusEditKey) {
      return send(res, 400, { ok: false, error: 'listing_id_and_edit_key_required', message: 'listing_id y edit_key son obligatorios.' });
    }
    if (!/^[a-zA-Z0-9_\-]{1,80}$/.test(statusListingId) || statusEditKey.length > 256) {
      return send(res, 400, { ok: false, error: 'status_params_invalid', message: 'Parámetros inválidos.' });
    }
    const ip = normalizeIp(req);
    const rate = checkStatusRateLimit(ip, statusListingId);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retry_after_seconds));
      return send(res, 429, { ok: false, error: 'status_rate_limit_exceeded', retry_after_seconds: rate.retry_after_seconds });
    }
    const statusListingsPath = path.join(root, 'data', 'listings.json');
    let statusListings = [];
    try {
      if (fs.existsSync(statusListingsPath)) statusListings = JSON.parse(fs.readFileSync(statusListingsPath, 'utf8'));
    } catch (_) {}
    const found = Array.isArray(statusListings) ? statusListings.find((l) => l && String(l.id || '') === statusListingId) : null;
    if (!found) return send(res, 404, { ok: false, error: 'listing_not_found', message: 'Anuncio no encontrado.' });
    const expectedHash = String(found.edit_key_hash || '');
    const candidateHash = statusEditKey ? sha256(statusEditKey) : '';
    if (!expectedHash || !candidateHash || expectedHash !== candidateHash) {
      return send(res, 403, { ok: false, error: 'edit_forbidden_invalid_key', message: 'Clave de edición incorrecta.' });
    }
    return send(res, 200, {
      ok: true,
      listing: {
        id: found.id, slug: found.slug, title: found.title, summary: found.summary,
        description: found.description, operation: found.operation, asset_type: found.asset_type,
        country: found.country, region: found.region, city: found.city, zone: found.zone,
        price: found.price, currency: found.currency, surface_m2: found.surface_m2,
        rooms: found.rooms, bathrooms: found.bathrooms, status: found.status,
        verification_state: found.verification_state, featured: found.featured,
        images: Array.isArray(found.images) ? found.images : [],
        contact_name: found.contact_name || null, contact_email: found.contact_email || null, contact_phone: found.contact_phone || null,
        published_at: found.published_at || null
      }
    });
  }

  // anuncios pendientes de revisión humana — solo ops autenticado
  if (urlPath === '/ops/api/listings/pending-review') {
    if (req.method !== 'GET') return send405(res);
    const prListingsPath = path.join(root, 'data', 'listings.json');
    let prListings = [];
    try {
      if (fs.existsSync(prListingsPath)) prListings = JSON.parse(fs.readFileSync(prListingsPath, 'utf8'));
    } catch (_) {}
    const pending = Array.isArray(prListings) ? prListings.filter((l) =>
      l && (l.verification_state === 'pending_review' ||
        (Array.isArray(l.ops_flags) && (
          l.ops_flags.includes('duplicate_candidate') ||
          l.ops_flags.includes('duplicate_abuse_blocked') ||
          l.ops_flags.includes('content_policy_review')
        )))
    ) : [];
    const summaries = pending.map((l) => ({
      id: l.id, slug: l.slug, title: l.title, city: l.city, country: l.country,
      operation: l.operation, status: l.status, verification_state: l.verification_state,
      ops_flags: Array.isArray(l.ops_flags) ? l.ops_flags : [],
      duplicate_score: l.duplicate_score || 0,
      content_policy_score: Number(l.content_policy_score || 0),
      abuse_blocked: l.duplicate_abuse_blocked === true,
      published_at: l.published_at || null, updated_at: l.updated_at || null
    }));
    return send(res, 200, { ok: true, count: summaries.length, items: summaries });
  }

  // publicaciones recientes del portal público — solo para ops autenticado
  if (urlPath === '/ops/api/listings/recent-public') {
    if (req.method !== 'GET') return send405(res);
    const queryStr = req.url.includes('?') ? req.url.split('?')[1] : '';
    const sp = new URLSearchParams(queryStr);
    const limit = Math.min(Number(sp.get('limit') || '20'), 100);
    const logPath = path.join(root, 'data', 'chany', 'public-listing-upsert-log.jsonl');
    try {
      const entries = [];
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
        lines.slice(-limit).reverse().forEach((line) => {
          try { entries.push(JSON.parse(line)); } catch (_) {}
        });
      }
      return send(res, 200, { ok: true, role: authContext.role || 'viewer', count: entries.length, entries });
    } catch (error) {
      return send(res, 500, { ok: false, error: error.message || 'recent_public_failed' });
    }
  }

  if (urlPath === '/ops/api/notifications/email/recent') {
    if (req.method !== 'GET') return send405(res);
    const queryStr = req.url.includes('?') ? req.url.split('?')[1] : '';
    const sp = new URLSearchParams(queryStr);
    const limit = Math.min(Number(sp.get('limit') || '20'), 100);
    const logPath = path.join(root, 'data', 'chany', 'email-notifications.log.jsonl');
    try {
      const entries = [];
      if (fs.existsSync(logPath)) {
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
        lines.slice(-limit).reverse().forEach((line) => {
          try { entries.push(JSON.parse(line)); } catch (_) {}
        });
      }
      return send(res, 200, {
        ok: true,
        role: authContext.role || 'viewer',
        count: entries.length,
        webhook_configured: !!emailNotifyWebhookUrl,
        recipients: emailNotifyTo,
        entries
      });
    } catch (error) {
      return send(res, 500, { ok: false, error: error.message || 'recent_email_notifications_failed' });
    }
  }

  return send404(res);
}

const server = http.createServer((req,res)=>{
  try{
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    let authContext = { valid: false, user: null, role: 'viewer' };

    if (isOpsPath(urlPath)) {
      if (!opsAuthUser || !opsAuthPass) return send403(res);
      authContext = parseOpsCredentials(req);
      if (!authContext.valid) return send401(res);
      authContext.role = resolveRole(authContext.user);
    }

    // Stripe payment endpoints (public)
    if (urlPath === '/api/stripe/checkout-contact-unlock' && req.method === 'POST') {
      if (!stripe) return send(res, 503, { ok: false, error: 'stripe_not_configured' });
      return parseJsonBody(req, async (err, body) => {
        if (err) return send(res, 400, { ok: false, error: 'invalid_json' });
        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: 'eur',
                unit_amount: 1995,
                product_data: { name: 'Desbloqueo de contacto del anunciante' }
              },
              quantity: 1
            }],
            mode: 'payment',
            metadata: { listing_id: body.listing_id || '', type: 'contact_unlock' },
            success_url: `https://neuralgpt.store/listing.html?slug=${body.listing_id || ''}&unlocked=true`,
            cancel_url: `https://neuralgpt.store/listing.html?slug=${body.listing_id || ''}`
          });
          return send(res, 200, { ok: true, url: session.url });
        } catch (e) {
          return send(res, 500, { ok: false, error: 'stripe_error' });
        }
      });
    }
    if (urlPath === '/api/stripe/checkout-mas-visibilidad' && req.method === 'POST') {
      if (!stripe) return send(res, 503, { ok: false, error: 'stripe_not_configured' });
      return parseJsonBody(req, async (err, body) => {
        if (err) return send(res, 400, { ok: false, error: 'invalid_json' });
        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price: PRICE_MAS_VISIBILIDAD,
              quantity: 1
            }],
            mode: 'payment',
            metadata: { listing_id: body.listing_id || '', type: 'mas_visibilidad' },
            success_url: 'https://neuralgpt.store/confirm.html?upgrade=visibilidad',
            cancel_url: `https://neuralgpt.store/listing.html?slug=${body.listing_id || ''}`
          });
          return send(res, 200, { ok: true, url: session.url });
        } catch (e) {
          return send(res, 500, { ok: false, error: 'stripe_error' });
        }
      });
    }
    if (urlPath === '/api/stripe/checkout-sensacional' && req.method === 'POST') {
      if (!stripe) return send(res, 503, { ok: false, error: 'stripe_not_configured' });
      return parseJsonBody(req, async (err, body) => {
        if (err) return send(res, 400, { ok: false, error: 'invalid_json' });
        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price: PRICE_SENSACIONAL,
              quantity: 1
            }],
            mode: 'payment',
            metadata: { listing_id: body.listing_id || '', type: 'sensacional_24h' },
            success_url: 'https://neuralgpt.store/confirm.html?upgrade=sensacional',
            cancel_url: `https://neuralgpt.store/listing.html?slug=${body.listing_id || ''}`
          });
          return send(res, 200, { ok: true, url: session.url });
        } catch (e) {
          return send(res, 500, { ok: false, error: 'stripe_error' });
        }
      });
    }
    if (urlPath === '/api/stripe/checkout-plan-basico' && req.method === 'POST') {
      if (!stripe) return send(res, 503, { ok: false, error: 'stripe_not_configured' });
      return parseJsonBody(req, async (err, body) => {
        if (err) return send(res, 400, { ok: false, error: 'invalid_json' });
        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price: PRICE_PLAN_BASICO,
              quantity: 1
            }],
            mode: 'subscription',
            success_url: 'https://neuralgpt.store/confirm.html?plan=basico',
            cancel_url: 'https://neuralgpt.store/pricing.html'
          });
          return send(res, 200, { ok: true, url: session.url });
        } catch (e) {
          return send(res, 500, { ok: false, error: 'stripe_error' });
        }
      });
    }
    if (urlPath === '/api/stripe/checkout-plan-premium' && req.method === 'POST') {
      if (!stripe) return send(res, 503, { ok: false, error: 'stripe_not_configured' });
      return parseJsonBody(req, async (err, body) => {
        if (err) return send(res, 400, { ok: false, error: 'invalid_json' });
        try {
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price: PRICE_PLAN_PREMIUM,
              quantity: 1
            }],
            mode: 'subscription',
            success_url: 'https://neuralgpt.store/confirm.html?plan=premium',
            cancel_url: 'https://neuralgpt.store/pricing.html'
          });
          return send(res, 200, { ok: true, url: session.url });
        } catch (e) {
          return send(res, 500, { ok: false, error: 'stripe_error' });
        }
      });
    }
    if (urlPath === '/api/stripe/checkout-donation' && req.method === 'POST') {
      if (!stripe) return send(res, 503, { ok: false, error: 'stripe_not_configured' });
      if (!PRICE_DONATION) return send(res, 503, { ok: false, error: 'stripe_donation_price_not_configured' });
      return parseJsonBody(req, async (err, body) => {
        if (err) return send(res, 400, { ok: false, error: 'invalid_json' });
        try {
          const successUrl = 'https://neuralgpt.store/confirm.html?donation=ok';
          const cancelUrl = String((body && body.cancel_url) || 'https://neuralgpt.store/?donation=cancel').trim();
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: PRICE_DONATION, quantity: 1 }],
            mode: 'payment',
            metadata: { checkout_type: 'donation_project', type: 'donation_project' },
            success_url: successUrl,
            cancel_url: cancelUrl
          });
          return send(res, 200, { ok: true, url: session.url });
        } catch (e) {
          return send(res, 500, { ok: false, error: 'stripe_error' });
        }
      });
    }
    if (urlPath === '/api/stripe/webhook' && req.method === 'POST') {
      if (!stripe) return send(res, 503, { ok: false, error: 'stripe_not_configured' });
      let rawBody = '';
      req.on('data', chunk => { rawBody += chunk.toString(); });
      return req.on('end', () => {
        try {
          const sig = req.headers['stripe-signature'];
          const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
          if (!webhookSecret) {
            console.warn('STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
            const event = JSON.parse(rawBody);
            return handleStripeWebhookEvent(event, res);
          }
          const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
          return handleStripeWebhookEvent(event, res);
        } catch (e) {
          console.error('Webhook error:', e.message);
          return send(res, 400, { ok: false, error: 'webhook_error' });
        }
      });
    }
    if (urlPath === '/api/listings/contact' && req.method === 'GET') {
      const sp = new URL(req.url, 'http://localhost').searchParams;
      const listingId = String(sp.get('listing_id') || '').trim();
      if (!listingId) return send(res, 400, { ok: false, error: 'listing_id required' });
      return send(res, 402, { ok: false, error: 'payment_required', message: 'Contact unlock requires payment' });
    }

    if (urlPath.startsWith('/ops/api/') || urlPath === '/api/listings/upsert' || urlPath === '/api/listings/status') {
      return handleOpsApi(req, res, urlPath, authContext);
    }

    // Bloquear rutas privadas del filesystem que nunca deben exponerse públicamente
    const privatePaths = ['/scripts/', '/data/chany/', '/data/fiscal/', '/data/risk-report.json', '/data/moderation-events.log.jsonl',
      '/data/products-stripe.json', '/data/commission-config.json', '/deploy/', '/test/', '/ops/'];
    if (privatePaths.some((p) => urlPath === p || urlPath.startsWith(p))) return send404(res);
    if (isSensitiveUrlPath(urlPath)) return send404(res);

    if(urlPath === '/' || urlPath === '') urlPath = '/index.html';
    const filePath = path.resolve(path.join(root, urlPath.replace(/^\//,'')));
    if(!safePathInsideRoot(root, filePath)) return send404(res);

    // listings.json: servir versión filtrada sin datos privados del anunciante
    if (urlPath === '/data/listings.json') {
      const PRIVATE_LISTING_FIELDS = ['contact_email','contact_phone','contact_name','edit_key_hash',
        'ops_flags','duplicate_candidates','duplicate_abuse_block_reason','content_policy_flags',
        'moderation_events','moderation_review_snapshots','review_trail','review_notes'];
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const listings = JSON.parse(raw);
        const sanitized = listings.map((l) => {
          const out = Object.assign({}, l);
          PRIVATE_LISTING_FIELDS.forEach((k) => delete out[k]);
          return out;
        });
        return send(res, 200, sanitized, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60' });
      } catch (_) { return send404(res); }
    }

    fs.stat(filePath, (err, stats)=>{
      if(err || !stats.isFile()) return send404(res);
      const ext = path.extname(filePath).toLowerCase();
      const type = mime[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', type + (type.startsWith('text/')? '; charset=utf-8':''));
      const rs = fs.createReadStream(filePath);
      res.statusCode = 200;
      rs.pipe(res);
    });
  }catch(_e){ send404(res); }
});

server.listen(port, ()=>{
  console.log('Static server running on http://localhost:'+port+' serving', root);
});

process.on('SIGINT', ()=>{ server.close(()=>process.exit(0)); });
