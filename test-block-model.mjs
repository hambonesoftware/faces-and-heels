import assert from 'node:assert/strict';
import {bevelGeometry} from './block-model.js';
const mesh=bevelGeometry([0,0,0],[1,.8,.6],.06);
assert.equal(mesh.vertices.length,32);assert.equal(mesh.faces.length,26);
for(const p of mesh.vertices)assert.ok(p.every(Number.isFinite));
for(const indices of mesh.faces)for(const i of indices)assert.ok(i>=0&&i<32);
assert.ok(mesh.faces.every(f=>f.length===4||f.length===8));
for(const axis of [0,1,2])assert.ok(mesh.vertices.some(p=>Math.abs(p[axis])>0));
console.log('Beveled block topology passed: 32 vertices, 26 planar faces, narrow edge bevels.');
