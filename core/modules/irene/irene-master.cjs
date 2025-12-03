const { IreneCore } = require('./irene-core.cjs');

async function IreneAgent(message) {
  const input = String(message || '').toLowerCase();

  if (input.includes('supplier') || input.includes('proveedor')) {
    return 'Scanning suppliers…';
  }

  if (input.includes('invite')) {
    return 'Preparing vendor invitation…';
  }

  if (input.includes('product')) {
    return 'Creating product entry…';
  }

  return await IreneCore.respond(message);
}

module.exports = { IreneAgent };
