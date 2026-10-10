import assert from 'node:assert/strict';
import fs from 'node:fs';
import { demoMoves } from './moves.js';

const manifest = JSON.parse(fs.readFileSync('./assets/sprites/generated/manifest.json','utf8'));
assert.equal(manifest.version, '1.1');
assert.equal(Object.keys(manifest.atlases).length, 32);
for (const key of ['stone:suplex','viper:suplex_taken','stone:body_slam','viper:body_slam_taken','stone:clothesline','viper:clothesline_hit']) {
  const meta=manifest.atlases[key];
  assert.ok(meta, `missing ${key}`);
  assert.equal(meta.anchors.length, meta.frameCount, `${key} anchors/frame mismatch`);
  assert.ok(meta.anchors[0].head && meta.anchors[0].waist && meta.anchors[0].hands_center);
}
assert.ok(demoMoves.some(m => m.id === 'running-clothesline'));
assert.ok(demoMoves.some(m => m.id === 'body-slam'));
console.log('v1.1 identity/contact-anchor tests passed.');
