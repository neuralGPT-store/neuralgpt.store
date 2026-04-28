# API Security Configuration

## Overview

All `/api/*` endpoints are protected with API key authentication using the `X-API-Key` header.

**Exceptions** (public endpoints):
- `/api/health` - Health check endpoint
- `/api/stripe/webhook` - Stripe webhook (authenticated via Stripe signature)

## Backend Configuration

### 1. Environment Variable

Set the `API_SECRET_KEY` in your `.env` file:

```bash
# Generate a secure random key
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# Add to .env
API_SECRET_KEY=your-generated-key-here
```

### 2. Server Validation

The server (`runtime/router.js`) validates the API key using constant-time comparison to prevent timing attacks.

## Frontend Configuration

### Automatic Integration

The frontend (`js/runtime-config.js`) automatically adds the `X-API-Key` header to all `/api/*` requests using a fetch polyfill.

### Configuration Methods

#### Option 1: Meta Tag (Recommended for SSR/SSG)

Add to your HTML `<head>`:

```html
<meta name="neural-api-key" content="your-api-key-here">
```

#### Option 2: Window Variable

Set before loading `runtime-config.js`:

```html
<script>
  window.NEURAL_API_KEY = 'your-api-key-here';
</script>
<script src="/js/runtime-config.js"></script>
```

### Usage Examples

#### Automatic (Recommended)

The fetch polyfill handles authentication automatically:

```javascript
// X-API-Key is added automatically
fetch('/api/listings/upsert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... })
});
```

#### Manual (Alternative)

Use the `apiRequest` helper:

```javascript
window.NeuralRuntime.apiRequest('/listings/upsert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... })
});
```

## Security Considerations

### ⚠️ Important Notes

1. **Client-Side Visibility**: The API key is visible in the frontend code. This is acceptable for same-origin requests where the key serves as CSRF protection and prevents unauthorized third-party access.

2. **Same-Origin Only**: This authentication scheme assumes requests come from the same origin (your website). For public APIs, use OAuth2 or similar.

3. **HTTPS Required**: Always serve over HTTPS in production to prevent key interception.

4. **Key Rotation**: Change the API key periodically and after any suspected compromise.

### Best Practices

- ✅ Use different keys for development and production
- ✅ Inject the key at build/deploy time, not in source code
- ✅ Monitor for unauthorized API access attempts
- ✅ Rate-limit API endpoints
- ✅ Use HTTPS in production

## Deployment

### Static Hosting (Netlify, Vercel, etc.)

Inject the API key at build time using environment variables:

```javascript
// In your build script
const apiKey = process.env.API_SECRET_KEY;
const html = htmlTemplate.replace(
  '</head>',
  `<meta name="neural-api-key" content="${apiKey}"></head>`
);
```

### Server-Side Rendering

Inject the key from environment variables:

```javascript
app.get('*', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="neural-api-key" content="${process.env.API_SECRET_KEY}">
        ...
      </head>
      ...
    </html>
  `);
});
```

## Testing

### Development Mode

In development, the configuration is logged to console:

```
[NeuralRuntime] Configuration: {
  apiBase: '/api',
  backendReady: true,
  apiKeyConfigured: true,
  fetchPatched: true
}
```

### Verify Authentication

Test that authentication works:

```bash
# Without API key - should fail with 401
curl http://localhost:8081/api/listings/status \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}'

# With valid API key - should succeed
curl http://localhost:8081/api/listings/status \
  -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key-here" \
  -d '{}'

# Health check - should work without key
curl http://localhost:8081/api/health
```

## Troubleshooting

### 401 Unauthorized Error

Check:
1. API key is set in `.env`
2. Frontend has access to the key (meta tag or window variable)
3. Key matches exactly (no extra whitespace)
4. Using HTTPS in production

### API Key Not Being Sent

Check browser console for:
```
[NeuralRuntime] Configuration: { apiKeyConfigured: false }
```

If `false`, the key is not configured in the frontend.

## Migration Guide

If you have existing fetch calls in your codebase, they will automatically work with the new authentication system thanks to the fetch polyfill. No code changes required.

However, if you prefer explicit control, you can use:

```javascript
// Old way (still works, key added automatically)
fetch(window.NeuralRuntime.api('/listings/upsert'), { ... });

// New way (explicit)
window.NeuralRuntime.apiRequest('/listings/upsert', { ... });
```
