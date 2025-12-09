const fs = require('fs');
const path = require('path');

const reportPath = path.resolve(__dirname, '..', 'build', 'validation-summary.json');
if (!fs.existsSync(reportPath)) {
  console.error('validation-summary.json not found at', reportPath);
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const missing = report.missingAssets || [];
if (!missing.length) {
  console.log('No missing assets listed in validation report.');
  process.exit(0);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

missing.forEach((entry, idx) => {
  const resolved = entry.resolved;
  if (!resolved) return;
  // Normalize Windows paths that may contain drive letters
  const outPath = path.resolve(resolved);
  if (fs.existsSync(outPath)) {
    console.log('[skip]', outPath, 'already exists');
    return;
  }
  ensureDir(outPath);
  const baseName = path.basename(outPath);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">\n  <rect width="100%" height="100%" fill="#f3f4f6"/>\n  <text x="50%" y="45%" font-family="Arial,Helvetica,sans-serif" font-size="20" fill="#6b7280" text-anchor="middle">Placeholder</text>\n  <text x="50%" y="60%" font-family="Arial,Helvetica,sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle">${entry.productId || baseName}</text>\n</svg>`;
  try {
    fs.writeFileSync(outPath, svg, 'utf8');
    console.log('[created]', outPath);
  } catch (err) {
    console.error('[error]', outPath, err.message);
  }
});

console.log('Placeholders generation finished.');
