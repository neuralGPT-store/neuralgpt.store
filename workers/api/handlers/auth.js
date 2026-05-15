import { sendJson, sendError, readJsonBody } from '../lib/http.js';

const MAX_JSON_BYTES = 8192;
const SESSION_TTL = 7 * 24 * 3600; // 7 días

function createAuthHandlers(env) {

  async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function generateToken() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function register(request) {
    let body;
    try { body = await readJsonBody(request, MAX_JSON_BYTES); }
    catch { return sendError(400, 'invalid_body', null, request); }

    const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
    const password = String(body.password || '');
    const name = String(body.name || '').trim().slice(0, 100);
    const account_type = String(body.account_type || 'familiar').trim();

    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) return sendError(400, 'invalid_email', null, request);
    if (password.length < 8) return sendError(400, 'password_too_short', null, request);
    if (!name) return sendError(400, 'name_required', null, request);
    if (!body.terms_accepted || !body.privacy_accepted) return sendError(400, 'terms_required', null, request);

    const existingUser = await env.LOVENTY_KV.get('user:' + email);
    if (existingUser) return sendError(409, 'email_already_registered', null, request);

    const salt = await generateToken();
    const hash = await hashPassword(password, salt);
    const userId = 'u_' + (await generateToken()).slice(0, 16);

    const user = {
      id: userId,
      email,
      name,
      account_type,
      password_hash: hash,
      password_salt: salt,
      terms_accepted: true,
      privacy_accepted: true,
      created_at: new Date().toISOString(),
      status: 'active'
    };

    await env.LOVENTY_KV.put('user:' + email, JSON.stringify(user));
    await env.LOVENTY_KV.put('userid:' + userId, email);

    const token = await generateToken();
    const session = { userId, email, name, account_type, created_at: new Date().toISOString() };
    await env.LOVENTY_KV.put('session:' + token, JSON.stringify(session), { expirationTtl: SESSION_TTL });

    return sendJson(201, { ok: true, token, user: { id: userId, email, name, account_type } }, request);
  }

  async function login(request) {
    let body;
    try { body = await readJsonBody(request, MAX_JSON_BYTES); }
    catch { return sendError(400, 'invalid_body', null, request); }

    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) return sendError(400, 'email_and_password_required', null, request);

    const raw = await env.LOVENTY_KV.get('user:' + email);
    if (!raw) return sendError(401, 'invalid_credentials', null, request);

    const user = JSON.parse(raw);
    const hash = await hashPassword(password, user.password_salt);

    if (hash !== user.password_hash) return sendError(401, 'invalid_credentials', null, request);
    if (user.status !== 'active') return sendError(403, 'account_suspended', null, request);

    const token = await generateToken();
    const session = { userId: user.id, email: user.email, name: user.name, account_type: user.account_type, created_at: new Date().toISOString() };
    await env.LOVENTY_KV.put('session:' + token, JSON.stringify(session), { expirationTtl: SESSION_TTL });

    return sendJson(200, { ok: true, token, user: { id: user.id, email: user.email, name: user.name, account_type: user.account_type } }, request);
  }

  async function logout(request) {
    const token = getTokenFromRequest(request);
    if (token) await env.LOVENTY_KV.delete('session:' + token);
    return sendJson(200, { ok: true }, request);
  }

  async function me(request) {
    const token = getTokenFromRequest(request);
    if (!token) return sendError(401, 'unauthorized', null, request);

    const raw = await env.LOVENTY_KV.get('session:' + token);
    if (!raw) return sendError(401, 'session_expired', null, request);

    const session = JSON.parse(raw);
    return sendJson(200, { ok: true, user: session }, request);
  }

  async function googleCallback(request) {
    let body;
    try { body = await readJsonBody(request, MAX_JSON_BYTES); }
    catch { return sendError(400, 'invalid_body', null, request); }

    const idToken = String(body.id_token || '').trim();
    const account_type = String(body.account_type || 'familiar').trim();

    if (!idToken) return sendError(400, 'id_token_required', null, request);

    // Verificar el token con Google
    const googleRes = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + idToken);
    if (!googleRes.ok) return sendError(401, 'invalid_google_token', null, request);

    const gData = await googleRes.json();
    if (gData.aud !== env.GOOGLE_CLIENT_ID) return sendError(401, 'google_client_mismatch', null, request);
    if (!gData.email_verified) return sendError(401, 'google_email_not_verified', null, request);

    const email = gData.email.toLowerCase();
    const name = gData.name || gData.email.split('@')[0];
    const googleId = gData.sub;

    let user;
    const existingRaw = await env.LOVENTY_KV.get('user:' + email);

    if (existingRaw) {
      user = JSON.parse(existingRaw);
      // Actualiza googleId si es la primera vez que entra con Google
      if (!user.google_id) {
        user.google_id = googleId;
        await env.LOVENTY_KV.put('user:' + email, JSON.stringify(user));
      }
    } else {
      // Registro automático con Google
      const userId = 'u_' + (await generateToken()).slice(0, 16);
      user = {
        id: userId,
        email,
        name,
        account_type,
        google_id: googleId,
        password_hash: null,
        password_salt: null,
        terms_accepted: true,
        privacy_accepted: true,
        created_at: new Date().toISOString(),
        status: 'active'
      };
      await env.LOVENTY_KV.put('user:' + email, JSON.stringify(user));
      await env.LOVENTY_KV.put('userid:' + user.id, email);
    }

    const token = await generateToken();
    const session = { userId: user.id, email: user.email, name: user.name, account_type: user.account_type, created_at: new Date().toISOString() };
    await env.LOVENTY_KV.put('session:' + token, JSON.stringify(session), { expirationTtl: SESSION_TTL });

    return sendJson(200, { ok: true, token, user: { id: user.id, email: user.email, name: user.name, account_type: user.account_type } }, request);
  }

  function getTokenFromRequest(request) {
    const auth = request.headers.get('Authorization') || '';
    if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
    return null;
  }

  return { register, login, logout, me, googleCallback };
}

export { createAuthHandlers };
