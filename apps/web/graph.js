// Obsidian-style force-directed knowledge graph, pure canvas, offline.
const tabs = document.querySelectorAll('.tab-btn');
const sections = document.querySelectorAll('[data-view-section]');
const canvas = document.getElementById('graphCanvas');
const stage = canvas?.closest('.graph-stage');
const statsEl = document.getElementById('graphStats');
const legendEl = document.getElementById('graphLegend');
const tooltip = document.getElementById('graphTooltip');
const searchInput = document.getElementById('graphSearch');
const includeInbox = document.getElementById('graphIncludeInbox');
const resetBtn = document.getElementById('graphReset');
const reloadBtn = document.getElementById('graphReload');
const repulsionInput = document.getElementById('graphRepulsion');
const linkLengthInput = document.getElementById('graphLinkLength');
const nodeSizeInput = document.getElementById('graphNodeSize');
const repulsionValue = document.getElementById('graphRepulsionValue');
const linkLengthValue = document.getElementById('graphLinkLengthValue');
const nodeSizeValue = document.getElementById('graphNodeSizeValue');
const notePanel = document.getElementById('graphNotePanel');
const notePanelTitle = document.getElementById('notePanelTitle');
const notePanelMeta = document.getElementById('notePanelMeta');
const notePanelBody = document.getElementById('notePanelBody');
const notePanelClose = document.getElementById('notePanelClose');

const ctx = canvas?.getContext('2d');
const PALETTE = ['#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#7d5fff', '#64d2ff', '#ff2d55', '#34c759', '#bf5af2', '#5e5ce6'];

const graphSettings = {
  repulsion: Number(repulsionInput?.value || 2600),
  linkLength: Number(linkLengthInput?.value || 96),
  nodeSize: Number(nodeSizeInput?.value || 1),
};

const state = {
  nodes: [],
  edges: [],
  groups: [],
  colorByGroup: new Map(),
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  hover: null,
  selected: null,
  dragNode: null,
  dragging: false,
  panning: false,
  lastPointer: { x: 0, y: 0 },
  raf: null,
  loaded: false,
  alpha: 1,
};

function activateView(view) {
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  sections.forEach((s) => { s.hidden = s.dataset.viewSection !== view; });
  if (view === 'graph') {
    resizeCanvas();
    if (!state.loaded) loadGraph();
    else startSim();
  } else {
    stopSim();
  }
}

tabs.forEach((tab) => tab.addEventListener('click', () => activateView(tab.dataset.view)));

function resizeCanvas() {
  if (!canvas || !stage) return;
  const rect = stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(320, rect.width) * dpr;
  canvas.height = Math.max(360, rect.height) * dpr;
  canvas.style.width = `${Math.max(320, rect.width)}px`;
  canvas.style.height = `${Math.max(360, rect.height)}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', () => { resizeCanvas(); });

async function loadGraph() {
  if (!ctx) return;
  statsEl.textContent = '加载中...';
  try {
    const inbox = includeInbox?.checked ? 'true' : 'false';
    const res = await fetch(`/api/vault/graph?includeInbox=${inbox}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '加载失败');
    initGraph(data);
    statsEl.textContent = `${data.nodeCount} 个节点 · ${data.edgeCount} 条连接 · ${data.groups.length} 个分组`;
    state.loaded = true;
  } catch (error) {
    statsEl.textContent = `加载失败：${error.message}`;
  }
}

function initGraph(data) {
  const rect = stage.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  state.groups = data.groups;
  state.colorByGroup = new Map(data.groups.map((g, i) => [g, PALETTE[i % PALETTE.length]]));
  state.nodes = data.nodes.map((n, i) => {
    const angle = (i / data.nodes.length) * Math.PI * 2;
    const radius = 60 + Math.random() * 200;
    return {
      ...n,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      baseR: 4 + Math.min(14, Math.sqrt(n.degree || 0) * 2.4),
    };
  });
  const idx = new Map(state.nodes.map((n) => [n.id, n]));
  state.edges = data.edges
    .map((e) => ({ source: idx.get(e.source), target: idx.get(e.target) }))
    .filter((e) => e.source && e.target);
  state.scale = 1;
  state.offsetX = 0;
  state.offsetY = 0;
  state.selected = null;
  state.alpha = 1;
  renderLegend();
  startSim();
}

function renderLegend() {
  legendEl.innerHTML = state.groups
    .map((g) => `<span class="legend-item"><i style="background:${state.colorByGroup.get(g)}"></i>${g}</span>`)
    .join('');
}

function nodeRadius(node) {
  return node.baseR * graphSettings.nodeSize;
}

function startSim() {
  state.alpha = Math.max(state.alpha, 0.8);
  if (state.raf) return;
  const loop = () => {
    step();
    draw();
    state.raf = requestAnimationFrame(loop);
  };
  state.raf = requestAnimationFrame(loop);
}
function stopSim() {
  if (state.raf) cancelAnimationFrame(state.raf);
  state.raf = null;
}

function step() {
  const nodes = state.nodes;
  if (!nodes.length) return;
  const rect = stage.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  state.alpha *= 0.99;
  if (state.alpha < 0.03 && !state.dragging) { stopSim(); return; }

  // Repulsion (Barnes-Hut-free, fine for a few hundred nodes).
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let d2 = dx * dx + dy * dy || 0.01;
      const force = graphSettings.repulsion / d2;
      const d = Math.sqrt(d2);
      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }
  }
  // Springs.
  for (const e of state.edges) {
    let dx = e.target.x - e.source.x;
    let dy = e.target.y - e.source.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const force = (d - graphSettings.linkLength) * 0.012;
    const fx = (dx / d) * force;
    const fy = (dy / d) * force;
    e.source.vx += fx; e.source.vy += fy;
    e.target.vx -= fx; e.target.vy -= fy;
  }
  // Gravity to center + integrate.
  for (const n of nodes) {
    n.vx += (cx - n.x) * 0.0012;
    n.vy += (cy - n.y) * 0.0012;
    if (n === state.dragNode && state.dragging) continue;
    n.vx *= 0.86; n.vy *= 0.86;
    n.x += n.vx * state.alpha;
    n.y += n.vy * state.alpha;
  }
}

function worldToScreen(x, y) {
  return { x: x * state.scale + state.offsetX, y: y * state.scale + state.offsetY };
}
function screenToWorld(x, y) {
  return { x: (x - state.offsetX) / state.scale, y: (y - state.offsetY) / state.scale };
}

function draw() {
  if (!ctx) return;
  const rect = stage.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = '#f8fbff';
  ctx.fillRect(0, 0, rect.width, rect.height);

  const neighbors = new Set();
  if (state.selected) {
    neighbors.add(state.selected.id);
    for (const e of state.edges) {
      if (e.source.id === state.selected.id) neighbors.add(e.target.id);
      if (e.target.id === state.selected.id) neighbors.add(e.source.id);
    }
  }

  // Edges.
  for (const e of state.edges) {
    const s = worldToScreen(e.source.x, e.source.y);
    const t = worldToScreen(e.target.x, e.target.y);
    const active = state.selected && (neighbors.has(e.source.id) && neighbors.has(e.target.id));
    ctx.strokeStyle = active ? 'rgba(10,132,255,0.48)' : (state.selected ? 'rgba(102,112,133,0.08)' : 'rgba(102,112,133,0.18)');
    ctx.lineWidth = active ? 1.8 : 0.8;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
  }

  // Nodes.
  for (const n of state.nodes) {
    const p = worldToScreen(n.x, n.y);
    const dim = state.selected && !neighbors.has(n.id);
    const color = state.colorByGroup.get(n.group) || '#9aa4bf';
    const r = nodeRadius(n) * state.scale;
    if (n === state.hover || n === state.selected) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,132,255,0.14)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = dim ? 'rgba(152,162,179,0.22)' : color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = dim ? 'rgba(152,162,179,0.22)' : 'rgba(255,255,255,0.72)';
    ctx.stroke();
    if (n.inbox) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = dim ? 'rgba(152,162,179,0.28)' : '#111827';
      ctx.stroke();
    }
    if (state.scale > 1.15 || nodeRadius(n) > 9 || n === state.hover || n === state.selected) {
      ctx.fillStyle = dim ? 'rgba(102,112,133,0.35)' : 'rgba(17,24,39,0.9)';
      ctx.font = `600 ${Math.max(10, 11 * state.scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillText(n.label.slice(0, 18), p.x + r + 3, p.y + 4);
    }
  }
}

function nodeAt(sx, sy) {
  for (let i = state.nodes.length - 1; i >= 0; i--) {
    const n = state.nodes[i];
    const p = worldToScreen(n.x, n.y);
    const r = nodeRadius(n) * state.scale + 4;
    if ((sx - p.x) ** 2 + (sy - p.y) ** 2 <= r * r) return n;
  }
  return null;
}

function pointerPos(evt) {
  const rect = canvas.getBoundingClientRect();
  return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
}

canvas?.addEventListener('mousedown', (evt) => {
  const p = pointerPos(evt);
  const hit = nodeAt(p.x, p.y);
  state.lastPointer = p;
  if (hit) {
    state.dragNode = hit;
    state.dragging = true;
    state.selected = hit;
    state.alpha = Math.max(state.alpha, 0.5);
    startSim();
  } else {
    state.panning = true;
  }
});
canvas?.addEventListener('mousemove', (evt) => {
  const p = pointerPos(evt);
  if (state.dragging && state.dragNode) {
    const w = screenToWorld(p.x, p.y);
    state.dragNode.x = w.x; state.dragNode.y = w.y;
    state.dragNode.vx = 0; state.dragNode.vy = 0;
    state.alpha = Math.max(state.alpha, 0.4);
  } else if (state.panning) {
    state.offsetX += p.x - state.lastPointer.x;
    state.offsetY += p.y - state.lastPointer.y;
    state.lastPointer = p;
    draw();
  } else {
    const hit = nodeAt(p.x, p.y);
    state.hover = hit;
    if (hit) {
      tooltip.hidden = false;
      tooltip.style.left = `${p.x + 12}px`;
      tooltip.style.top = `${p.y + 12}px`;
      tooltip.innerHTML = `<strong>${hit.label}</strong><br><span>${hit.group} · ${hit.degree} 连接</span><br><small>${hit.path}</small>`;
      canvas.style.cursor = 'pointer';
    } else {
      tooltip.hidden = true;
      canvas.style.cursor = 'grab';
    }
    if (!state.raf) draw();
  }
});
window.addEventListener('mouseup', () => {
  state.dragging = false;
  state.dragNode = null;
  state.panning = false;
});
canvas?.addEventListener('dblclick', (evt) => {
  const p = pointerPos(evt);
  const hit = nodeAt(p.x, p.y);
  if (hit) { state.selected = hit; openNotePanel(hit); }
});
canvas?.addEventListener('wheel', (evt) => {
  evt.preventDefault();
  const p = pointerPos(evt);
  const before = screenToWorld(p.x, p.y);
  const factor = evt.deltaY < 0 ? 1.12 : 0.89;
  state.scale = Math.min(4, Math.max(0.2, state.scale * factor));
  const after = screenToWorld(p.x, p.y);
  state.offsetX += (after.x - before.x) * state.scale;
  state.offsetY += (after.y - before.y) * state.scale;
  draw();
}, { passive: false });

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
}

// Minimal, safe markdown -> html for the read panel.
function renderMarkdown(md) {
  const src = String(md || '').replace(/^\ufeff/, '').replace(/^---\n[\s\S]*?\n---\n/, '');
  const lines = src.split(/\r?\n/);
  const html = [];
  let inCode = false;
  let inList = false;
  for (const raw of lines) {
    const line = raw;
    if (/^```/.test(line)) {
      if (inCode) { html.push('</code></pre>'); inCode = false; }
      else { if (inList) { html.push('</ul>'); inList = false; } html.push('<pre><code>'); inCode = true; }
      continue;
    }
    if (inCode) { html.push(escapeHtml(line)); continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      if (inList) { html.push('</ul>'); inList = false; }
      const level = h[1].length;
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    const li = line.match(/^[-*]\s+(.*)$/);
    if (li) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${inline(li[1])}</li>`);
      continue;
    }
    if (!line.trim()) { if (inList) { html.push('</ul>'); inList = false; } continue; }
    if (inList) { html.push('</ul>'); inList = false; }
    html.push(`<p>${inline(line)}</p>`);
  }
  if (inList) html.push('</ul>');
  if (inCode) html.push('</code></pre>');
  return html.join('\n');

  function inline(t) {
    let s = escapeHtml(t);
    s = s.replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_m, p1, p2) => `<span class="wikilink">${escapeHtml(p2 || p1)}</span>`);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    return s;
  }
}

async function openNotePanel(node) {
  if (!notePanel) return;
  notePanel.hidden = false;
  notePanelTitle.textContent = node.label;
  notePanelMeta.textContent = `${node.group} · ${node.degree} 连接`;
  notePanelBody.innerHTML = '<p class="muted">加载中...</p>';
  try {
    const res = await fetch(`/api/vault/note?path=${encodeURIComponent(node.id)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '读取失败');
    notePanelMeta.innerHTML = `${escapeHtml(node.group)} · ${node.degree} 连接 · <code>${escapeHtml(data.note.path)}</code>`;
    notePanelBody.innerHTML = renderMarkdown(data.note.content);
  } catch (error) {
    notePanelBody.innerHTML = `<p class="muted">读取失败：${escapeHtml(error.message)}</p>`;
  }
}

notePanelClose?.addEventListener('click', () => { notePanel.hidden = true; });

function updateGraphSettings() {
  graphSettings.repulsion = Number(repulsionInput?.value || graphSettings.repulsion);
  graphSettings.linkLength = Number(linkLengthInput?.value || graphSettings.linkLength);
  graphSettings.nodeSize = Number(nodeSizeInput?.value || graphSettings.nodeSize);
  if (repulsionValue) repulsionValue.value = String(graphSettings.repulsion);
  if (linkLengthValue) linkLengthValue.value = String(graphSettings.linkLength);
  if (nodeSizeValue) nodeSizeValue.value = graphSettings.nodeSize.toFixed(1);
  state.alpha = Math.max(state.alpha, 0.7);
  startSim();
}

for (const control of [repulsionInput, linkLengthInput, nodeSizeInput]) {
  control?.addEventListener('input', updateGraphSettings);
}
updateGraphSettings();

searchInput?.addEventListener('keydown', (evt) => {
  if (evt.key !== 'Enter') return;
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return;
  const hit = state.nodes.find((n) => n.label.toLowerCase().includes(q));
  if (hit) {
    state.selected = hit;
    const rect = stage.getBoundingClientRect();
    state.scale = 1.6;
    state.offsetX = rect.width / 2 - hit.x * state.scale;
    state.offsetY = rect.height / 2 - hit.y * state.scale;
    startSim();
  }
});
resetBtn?.addEventListener('click', () => {
  state.scale = 1; state.offsetX = 0; state.offsetY = 0; state.selected = null;
  state.alpha = 1; startSim();
});
reloadBtn?.addEventListener('click', () => { state.loaded = false; loadGraph(); });
includeInbox?.addEventListener('change', () => { state.loaded = false; loadGraph(); });
