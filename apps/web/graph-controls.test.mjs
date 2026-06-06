import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const graphJs = await readFile(new URL('./graph.js', import.meta.url), 'utf8');

test('graph view exposes Obsidian-like force controls', () => {
  for (const id of ['graphRepulsion', 'graphLinkLength', 'graphNodeSize']) {
    assert.match(html, new RegExp(`id="${id}"[^>]+type="range"|type="range"[^>]+id="${id}"`));
    assert.match(graphJs, new RegExp(`getElementById\\('${id}'\\)`));
  }
});

test('graph simulation reads user-adjustable physics settings', () => {
  assert.match(graphJs, /graphSettings/);
  assert.match(graphJs, /repulsion/);
  assert.match(graphJs, /linkLength/);
  assert.match(graphJs, /nodeSize/);
});
