import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import {
  ingestFile,
  ensureVaultDirs,
  indexVault,
  buildVaultGraph,
  extractKeywords,
  todayStamp,
  slugify,
} from '../../packages/ingestion-core/index.js';
import { DEFAULT_VAULT_PATH } from '../../packages/ingestion-core/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

function jsonSchema(properties = {}, required = []) {
  return { type: 'object', properties, required, additionalProperties: false };
}

const tools = [
  {
    name: 'ingest_document',
    description: 'Ingest a local document into the Knowledge Forge vault inbox. Supports current ingestion-core formats such as PDF, DOCX, XLS/XLSX, CSV, Markdown and TXT. Returns note, manifest and agent-pack paths.',
    inputSchema: jsonSchema({
      path: { type: 'string', description: 'Absolute or project-relative local file path.' },
      vaultPath: { type: 'string', description: 'Optional vault path override.' },
    }, ['path']),
  },
  {
    name: 'list_recent_inbox',
    description: 'List recent Markdown notes in the vault inbox.',
    inputSchema: jsonSchema({
      limit: { type: 'number', description: 'Max notes to return. Default 20.' },
      vaultPath: { type: 'string', description: 'Optional vault path override.' },
    }),
  },
  {
    name: 'search_vault',
    description: 'Search Markdown notes in the vault using lightweight local keyword scoring.',
    inputSchema: jsonSchema({
      query: { type: 'string' },
      limit: { type: 'number', description: 'Default 10.' },
      includeInbox: { type: 'boolean', description: 'Whether to include inbox notes. Default true.' },
      vaultPath: { type: 'string', description: 'Optional vault path override.' },
    }, ['query']),
  },
  {
    name: 'create_obsidian_note',
    description: 'Create a Markdown note in the vault, optionally under a folder. Use inbox by default to avoid polluting permanent knowledge structure.',
    inputSchema: jsonSchema({
      title: { type: 'string' },
      content: { type: 'string' },
      folder: { type: 'string', description: 'Relative folder. Default inbox.' },
      tags: { type: 'array', items: { type: 'string' } },
      vaultPath: { type: 'string', description: 'Optional vault path override.' },
    }, ['title', 'content']),
  },
  {
    name: 'generate_exam_review',
    description: 'Generate a local fallback exam-review pack from a vault note or text. This is rules-based; deep output should later be produced by an Agent/LLM over the source pack.',
    inputSchema: jsonSchema({
      path: { type: 'string', description: 'Vault-relative or absolute Markdown path.' },
      text: { type: 'string', description: 'Direct source text if no path is provided.' },
      title: { type: 'string' },
      vaultPath: { type: 'string', description: 'Optional vault path override.' },
    }),
  },
  {
    name: 'generate_flashcards',
    description: 'Generate simple Q/A flashcards from a vault note or text.',
    inputSchema: jsonSchema({
      path: { type: 'string' },
      text: { type: 'string' },
      title: { type: 'string' },
      count: { type: 'number', description: 'Default 10.' },
      vaultPath: { type: 'string' },
    }),
  },
  {
    name: 'generate_quiz',
    description: 'Generate a lightweight self-test quiz from a vault note or text.',
    inputSchema: jsonSchema({
      path: { type: 'string' },
      text: { type: 'string' },
      title: { type: 'string' },
      count: { type: 'number', description: 'Default 8.' },
      vaultPath: { type: 'string' },
    }),
  },
  {
    name: 'link_concepts',
    description: 'Return concept/link suggestions and graph context for the vault.',
    inputSchema: jsonSchema({
      includeInbox: { type: 'boolean', description: 'Default true.' },
      vaultPath: { type: 'string' },
    }),
  },
  {
    name: 'rollback_ingestion',
    description: 'Rollback a Knowledge Forge ingestion manifest by moving generated files to .knowledge-forge/trash instead of deleting them.',
    inputSchema: jsonSchema({
      manifestPath: { type: 'string', description: 'Absolute or vault-relative manifest JSON path returned by ingest_document.' },
      vaultPath: { type: 'string' },
    }, ['manifestPath']),
  },
];

function getVaultPath(args = {}) {
  return path.resolve(args.vaultPath || DEFAULT_VAULT_PATH);
}

function resolveMaybeRelative(inputPath, base = root) {
  if (!inputPath) throw new Error('Missing path');
  return path.resolve(path.isAbsolute(inputPath) ? inputPath : path.join(base, inputPath));
}

function safeInside(base, target) {
  const rootPath = path.resolve(base);
  const full = path.resolve(target);
  if (full !== rootPath && !full.startsWith(rootPath + path.sep)) throw new Error(`Path is outside allowed root: ${target}`);
  return full;
}

function toRelative(vaultPath, fullPath) {
  return path.relative(vaultPath, fullPath).replaceAll('\\', '/');
}

function inferMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.csv': 'text/csv',
  };
  return map[ext] || 'application/octet-stream';
}

async function walkMarkdown(dir, rootDir = dir, out = []) {
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkMarkdown(full, rootDir, out);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) out.push({ full, relative: path.relative(rootDir, full).replaceAll('\\', '/') });
  }
  return out;
}

function strip(text = '') {
  return String(text)
    .replace(/^---[\s\S]*?---\s*/g, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[>#*_`~|\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentences(text = '') {
  const clean = strip(text);
  return clean.match(/[^。！？.!?\n]{18,220}[。！？.!?]?/g)?.map((s) => s.trim()).filter(Boolean).slice(0, 80) || [];
}

async function readSource(args = {}) {
  const vaultPath = getVaultPath(args);
  if (args.text) return { title: args.title || 'Untitled Source', content: String(args.text), path: null };
  if (!args.path) throw new Error('Provide either path or text');
  const full = path.isAbsolute(args.path) ? path.resolve(args.path) : safeInside(vaultPath, path.join(vaultPath, args.path));
  const content = await fs.readFile(full, 'utf8');
  return { title: args.title || path.parse(full).name, content, path: toRelative(vaultPath, full) };
}

function topKeywords(content, n = 12) {
  return extractKeywords(content, n).map((item) => item.keyword);
}

function makeExamReview({ title, content, sourcePath }) {
  const keys = topKeywords(content, 12);
  const sents = sentences(content);
  const summary = sents.slice(0, 5);
  const p0 = keys.slice(0, 5);
  const p1 = keys.slice(5, 10);
  return [
    `# Exam Review Pack - ${title}`,
    '',
    `> Generated by Knowledge Forge MCP local fallback. Source: ${sourcePath || 'direct text'}`,
    '',
    '## 1. Core Summary',
    ...summary.map((s) => `- ${s}`),
    '',
    '## 2. P0 Must-Know Points',
    ...p0.map((k) => `- **${k}** — explain this in your own words and connect it to the source.`),
    '',
    '## 3. P1 Review Points',
    ...p1.map((k) => `- ${k}`),
    '',
    '## 4. Feynman Check',
    ...p0.slice(0, 4).map((k) => `- Can you explain **${k}** to a beginner without jargon?`),
    '',
    '## 5. 3-Pass Plan',
    '- Pass 1: skim headings and summary; mark unknown terms.',
    '- Pass 2: actively recall P0 points and write answers from memory.',
    '- Pass 3: test with quiz/flashcards and return to weak source sections.',
    '',
    '## 6. Caveat',
    '- This is a rules-based draft. For formal study output, run an Agent/LLM over the full Knowledge Forge source pack.',
  ].join('\n');
}

function makeFlashcards({ content, count = 10 }) {
  const keys = topKeywords(content, Math.max(count, 10));
  const sents = sentences(content);
  return keys.slice(0, count).map((keyword, index) => ({
    id: index + 1,
    front: `Explain: ${keyword}`,
    back: sents.find((s) => s.toLowerCase().includes(String(keyword).toLowerCase())) || `Define ${keyword}, then connect it to the source material.`,
  }));
}

function makeQuiz({ content, count = 8 }) {
  const cards = makeFlashcards({ content, count });
  return cards.map((card, index) => ({
    id: index + 1,
    type: 'short_answer',
    question: `What is the role or meaning of "${card.front.replace(/^Explain: /, '')}" in this material?`,
    answerGuide: card.back,
  }));
}

async function listRecentInbox(args = {}) {
  const vaultPath = getVaultPath(args);
  const limit = Number(args.limit || 20);
  const inbox = path.join(vaultPath, 'inbox');
  const files = await walkMarkdown(inbox, vaultPath);
  const rows = await Promise.all(files.map(async (file) => {
    const stat = await fs.stat(file.full);
    const raw = await fs.readFile(file.full, 'utf8').catch(() => '');
    const h1 = raw.match(/^#\s+(.+)$/m)?.[1];
    return { title: h1 || path.parse(file.full).name, path: file.relative, modifiedAt: stat.mtime.toISOString(), size: stat.size };
  }));
  return rows.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)).slice(0, limit);
}

async function searchVault(args = {}) {
  const vaultPath = getVaultPath(args);
  const query = String(args.query || '').trim();
  if (!query) throw new Error('query is required');
  const includeInbox = args.includeInbox !== false;
  const limit = Number(args.limit || 10);
  const qTokens = new Set(strip(query).toLowerCase().match(/[a-z0-9-]{2,}|[\u4e00-\u9fa5]{2,8}/g) || []);
  const files = (await walkMarkdown(vaultPath)).filter((file) => includeInbox || !file.relative.startsWith('inbox/'));
  const scored = [];
  for (const file of files) {
    const raw = await fs.readFile(file.full, 'utf8').catch(() => '');
    const clean = strip(raw.slice(0, 8000));
    let score = 0;
    const lower = clean.toLowerCase();
    for (const token of qTokens) if (lower.includes(token)) score += token.length > 3 ? 2 : 1;
    if (file.relative.toLowerCase().includes(query.toLowerCase())) score += 5;
    if (score > 0) scored.push({ title: raw.match(/^#\s+(.+)$/m)?.[1] || path.parse(file.full).name, path: file.relative, score, excerpt: clean.slice(0, 260) });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

async function createObsidianNote(args = {}) {
  const vaultPath = getVaultPath(args);
  await ensureVaultDirs(vaultPath);
  const folder = String(args.folder || 'inbox').replace(/^[/\\]+/, '');
  const dir = safeInside(vaultPath, path.join(vaultPath, folder));
  await fs.mkdir(dir, { recursive: true });
  const safeTitle = slugify(args.title || 'Untitled');
  let notePath = path.join(dir, `${todayStamp()} - ${safeTitle}.md`);
  let suffix = 2;
  while (fssync.existsSync(notePath)) {
    notePath = path.join(dir, `${todayStamp()} - ${safeTitle}-${suffix}.md`);
    suffix += 1;
  }
  const tags = Array.isArray(args.tags) ? args.tags : ['knowledge-forge'];
  const content = [
    '---',
    `title: ${JSON.stringify(args.title || safeTitle)}`,
    'type: note',
    'status: inbox',
    `created: ${new Date().toISOString()}`,
    'tags:',
    ...tags.map((tag) => `  - ${JSON.stringify(String(tag))}`),
    '---',
    '',
    String(args.content || '').trim(),
    '',
  ].join('\n');
  await fs.writeFile(notePath, content, 'utf8');
  return { path: toRelative(vaultPath, notePath), notePath, title: args.title || safeTitle };
}

async function rollbackIngestion(args = {}) {
  const vaultPath = getVaultPath(args);
  const manifestPath = path.isAbsolute(args.manifestPath)
    ? safeInside(vaultPath, args.manifestPath)
    : safeInside(vaultPath, path.join(vaultPath, args.manifestPath));
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const trashDir = path.join(vaultPath, '.knowledge-forge', 'trash', new Date().toISOString().replace(/[:.]/g, '-'));
  await fs.mkdir(trashDir, { recursive: true });
  const moved = [];
  async function moveIfSafe(candidate, label) {
    if (!candidate) return;
    const full = safeInside(vaultPath, candidate);
    if (!fssync.existsSync(full)) return;
    const dest = path.join(trashDir, `${label}-${path.basename(full)}`);
    await fs.rename(full, dest);
    moved.push({ from: toRelative(vaultPath, full), to: toRelative(vaultPath, dest) });
  }
  await moveIfSafe(manifest.notePath, 'note');
  await moveIfSafe(manifest.agentPack?.packDir, 'agent-pack');
  await moveIfSafe(manifestPath, 'manifest');
  return { status: 'rolled_back_to_trash', trashDir, moved };
}

async function callTool(name, args = {}) {
  switch (name) {
    case 'ingest_document': {
      const full = resolveMaybeRelative(args.path);
      const stat = await fs.stat(full);
      if (!stat.isFile()) throw new Error('path must be a file');
      const result = await ingestFile({ path: full, originalName: path.basename(full), mimeType: inferMime(full), size: stat.size }, { vaultPath: getVaultPath(args) });
      return {
        title: result.parsed.title,
        parser: result.parsed.parser,
        kind: result.parsed.kind,
        notePath: result.notePath,
        noteRelativePath: toRelative(getVaultPath(args), result.notePath),
        manifestPath: result.manifestPath,
        manifestRelativePath: toRelative(getVaultPath(args), result.manifestPath),
        agentPack: result.agentPack,
        analysis: result.parsed.analysis,
        linkCandidates: result.linkCandidates,
        conceptCandidates: result.conceptCandidates,
      };
    }
    case 'list_recent_inbox': return listRecentInbox(args);
    case 'search_vault': return searchVault(args);
    case 'create_obsidian_note': return createObsidianNote(args);
    case 'generate_exam_review': {
      const source = await readSource(args);
      return { title: source.title, sourcePath: source.path, markdown: makeExamReview({ title: source.title, content: source.content, sourcePath: source.path }) };
    }
    case 'generate_flashcards': {
      const source = await readSource(args);
      return { title: source.title, sourcePath: source.path, flashcards: makeFlashcards({ content: source.content, count: Number(args.count || 10) }) };
    }
    case 'generate_quiz': {
      const source = await readSource(args);
      return { title: source.title, sourcePath: source.path, quiz: makeQuiz({ content: source.content, count: Number(args.count || 8) }) };
    }
    case 'link_concepts': {
      const vaultPath = getVaultPath(args);
      const graph = await buildVaultGraph(vaultPath, { includeInbox: args.includeInbox !== false });
      const notes = await indexVault(vaultPath, { includeInbox: args.includeInbox !== false });
      const topTags = new Map();
      for (const note of notes) for (const tag of note.tags || []) topTags.set(tag, (topTags.get(tag) || 0) + 1);
      return { graphSummary: { nodeCount: graph.nodeCount, edgeCount: graph.edgeCount, groups: graph.groups }, topTags: Array.from(topTags.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([tag, count]) => ({ tag, count })), highDegreeNodes: graph.nodes.sort((a, b) => b.degree - a.degree).slice(0, 20) };
    }
    case 'rollback_ingestion': return rollbackIngestion(args);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

function contentResult(payload) {
  return { content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }] };
}

async function handle(message) {
  const { id, method, params = {} } = message;
  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: { protocolVersion: params.protocolVersion || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'knowledge-forge-mcp', version: '0.1.0' } } };
  }
  if (method === 'notifications/initialized') return null;
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools } };
  if (method === 'tools/call') {
    try {
      const result = await callTool(params.name, params.arguments || {});
      return { jsonrpc: '2.0', id, result: contentResult(result) };
    } catch (error) {
      return { jsonrpc: '2.0', id, result: { isError: true, ...contentResult({ error: error.message, stack: process.env.KF_MCP_DEBUG ? error.stack : undefined }) } };
    }
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
}

let buffer = Buffer.alloc(0);

function send(payload) {
  if (!payload) return;
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
  process.stdout.write(body);
}

process.stdin.on('data', async (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const header = buffer.slice(0, headerEnd).toString('utf8');
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }
    const length = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (buffer.length < bodyStart + length) return;
    const body = buffer.slice(bodyStart, bodyStart + length).toString('utf8');
    buffer = buffer.slice(bodyStart + length);
    try {
      const message = JSON.parse(body);
      send(await handle(message));
    } catch (error) {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: error.message } });
    }
  }
});

process.stdin.resume();
