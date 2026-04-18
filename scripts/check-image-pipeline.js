#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const { runImagePipeline } = require('./image-pipeline.js');

function assert(condition, code) {
  if (!condition) {
    throw new Error(code);
  }
}

function writeFixture(filePath, base64) {
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
}

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ngpt-image-pipeline-'));
  const fixturesDir = path.join(tempRoot, 'fixtures');
  fs.mkdirSync(fixturesDir, { recursive: true });

  const pngPath = path.join(fixturesDir, 'foto-salon-principal.PNG');
  const jpgPath = path.join(fixturesDir, 'fachada-1.jpg');
  const blockedPath = path.join(fixturesDir, 'shell.php');

  // 1x1 PNG
  writeFixture(pngPath, 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9q24wAAAAASUVORK5CYII=');
  // 1x1 JPEG
  writeFixture(jpgPath, '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQDxAQEA8QEA8PEA8QEA8PDw8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMsNygtLisBCgoKDg0OGhAQGi0fHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAQID/8QAFhEBAQEAAAAAAAAAAAAAAAAAAQAC/9oADAMBAAIQAxAAAAH0qg//xAAXEAADAQAAAAAAAAAAAAAAAAAAAREx/9oACAEBAAEFAo9f/8QAFhEAAwAAAAAAAAAAAAAAAAAAARAR/9oACAEDAQE/AYf/xAAVEQEBAAAAAAAAAAAAAAAAAAABEP/aAAgBAgEBPwGX/8QAFhABAQEAAAAAAAAAAAAAAAAAABEB/9oACAEBAAY/Ah0f/8QAFBABAAAAAAAAAAAAAAAAAAAAEP/aAAgBAQABPyH/xAAWEQEBAQAAAAAAAAAAAAAAAAABABH/2gAIAQMBAT8QhP/EABYRAQEBAAAAAAAAAAAAAAAAAAABEf/aAAgBAgEBPxDq/8QAFhABAQEAAAAAAAAAAAAAAAAAABEh/9oACAEBAAE/EFg//9k=');
  fs.writeFileSync(blockedPath, '<?php echo 1;');

  const okResult = await runImagePipeline([
    { path: pngPath, original_name: 'foto-salon-principal.PNG' },
    { path: jpgPath, original_name: 'fachada-1.jpg' }
  ], {
    listingId: 'check-listing-ok',
    outputRoot: path.join(tempRoot, 'out')
  });

  assert(okResult.ok === true, 'ok_result_should_be_ok');
  assert(Array.isArray(okResult.artifacts) && okResult.artifacts.length === 2, 'ok_artifacts_count');
  okResult.artifacts.forEach((item, idx) => {
    assert(item.stages && item.stages.original_controlado && fs.existsSync(item.stages.original_controlado.path), 'original_stage_exists_' + idx);
    assert(item.stages && item.stages.web_optimizada && fs.existsSync(item.stages.web_optimizada.path), 'web_stage_exists_' + idx);
    assert(item.stages && item.stages.thumbnail && fs.existsSync(item.stages.thumbnail.path), 'thumb_stage_exists_' + idx);
    assert(item.hash && typeof item.hash === 'string' && item.hash.length >= 32, 'hash_present_' + idx);
    assert(typeof item.normalized_name === 'string' && item.normalized_name.length > 0, 'normalized_name_present_' + idx);
  });

  const blockedResult = await runImagePipeline([
    { path: blockedPath, original_name: 'shell.php' }
  ], {
    listingId: 'check-listing-blocked',
    outputRoot: path.join(tempRoot, 'out')
  });
  assert(blockedResult.ok === false, 'blocked_should_fail');
  assert(blockedResult.errors.some((e) => String(e).indexOf('blocked_extension') >= 0), 'blocked_extension_error_expected');

  const seven = [pngPath, pngPath, jpgPath, jpgPath, pngPath, jpgPath, pngPath].map((fp, idx) => ({ path: fp, original_name: 'img_' + idx + path.extname(fp) }));
  const tooManyResult = await runImagePipeline(seven, {
    listingId: 'check-listing-too-many',
    outputRoot: path.join(tempRoot, 'out')
  });
  assert(tooManyResult.ok === false, 'too_many_should_fail');
  assert(tooManyResult.errors.some((e) => String(e).indexOf('max_files_exceeded') >= 0), 'max_files_error_expected');

  console.log('[check-image-pipeline] PASS');
  console.log('- fixtures=' + JSON.stringify({ png: pngPath, jpg: jpgPath, blocked: blockedPath }));
  console.log('- output=' + okResult.output_dir);
  console.log('- transformed=' + okResult.artifacts.map((a) => a.transformed === true).join(','));
}

main().catch((error) => {
  console.error('[check-image-pipeline] FAIL:', error && error.message ? error.message : error);
  process.exit(1);
});
