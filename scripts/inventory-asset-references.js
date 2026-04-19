#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const scanRoots = [
  path.join(root, 'assets', 'img'),
  path.join(root, 'assets', 'wallpapers')
];

const sourceExt = new Set(['.html', '.css', '.js']);
const skipDirs = new Set(['.git', 'node_modules', 'backups', 'build']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }

    out.push(full);
  }

  return out;
}

function toWebPath(filePath) {
  const rel = path.relative(root, filePath).split(path.sep).join('/');
  return '/' + rel;
}

function readUtf8(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return '';
  }
}

function main() {
  const repoFiles = walk(root);

  const sourceFiles = repoFiles.filter((filePath) => {
    return sourceExt.has(path.extname(filePath).toLowerCase());
  });

  const sourceContents = sourceFiles.map((filePath) => ({
    filePath,
    content: readUtf8(filePath)
  }));

  const assets = scanRoots.flatMap((dir) => walk(dir));

  const rows = assets.map((assetPath) => {
    const webPath = toWebPath(assetPath);
    const base = path.basename(assetPath);

    let references = 0;
    for (const src of sourceContents) {
      if (!src.content) continue;
      if (
        src.content.includes(webPath) ||
        src.content.includes(assetPath) ||
        src.content.includes(base)
      ) {
        references += 1;
      }
    }

    return {
      asset: webPath,
      referenced_in_files: references,
      status: references > 0 ? 'referenced' : 'unreferenced'
    };
  });

  const summary = {
    generated_at: new Date().toISOString(),
    total_assets: rows.length,
    referenced_assets: rows.filter((r) => r.status === 'referenced').length,
    unreferenced_assets: rows.filter((r) => r.status === 'unreferenced').length,
    assets: rows
  };

  const reportsDir = path.join(root, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });

  const outPath = path.join(reportsDir, 'asset-reference-report.json');
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log('Inventario generado:', outPath);
  console.log('Total assets:', summary.total_assets);
  console.log('Referenciados:', summary.referenced_assets);
  console.log('Sin referencia:', summary.unreferenced_assets);
}

main();
