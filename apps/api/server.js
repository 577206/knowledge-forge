import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import Busboy from 'busboy';
import { ingestFile, indexVault, buildVaultGraph } from '../../packages/ingestion-core/index.js';
import { DEFAULT_VAULT_PATH } from '../../packages/ingestion-core/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const publicDir = path.join(root, 'apps', 'web');
const uploadDir = path.join(root, '.uploads');
const port = Number(process.env.PORT || 4177);

await fsp.mkdir(uploadDir, { recursive: true });

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, text, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type });
  res.end(text);
}

function safeVaultPath(relativePath = '') {
  const normalized = String(relativePath || '').replace(/^[/\\]+/, '');
  const full = path.resolve(DEFAULT_VAULT_PATH, normalized);
  const vaultRoot = path.resolve(DEFAULT_VAULT_PATH);
  if (full !== vaultRoot && !full.startsWith(vaultRoot + path.sep)) {
    throw new Error('Path is outside vault');
  }
  return full;
}

function toVaultRelative(fullPath) {
  return path.relative(DEFAULT_VAULT_PATH, fullPath).replaceAll('\\', '/');
}

async function listInbox(limit = 30) {
  const inboxDir = safeVaultPath('inbox');
  let entries = [];
  try {
    entries = await fsp.readdir(inboxDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .map(async (entry) => {
      const full = path.join(inboxDir, entry.name);
      const stat = await fsp.stat(full);
      let title = path.parse(entry.name).name;
      try {
        const raw = await fsp.readFile(full, 'utf8');
        const titleMatch = raw.match(/^title:\s*["']?(.+?)["']?\s*$/m);
        const h1Match = raw.match(/^#\s+(.+)$/m);
        title = titleMatch?.[1] || h1Match?.[1] || title;
      } catch {}
      return {
        title,
        path: toVaultRelative(full),
        modifiedAt: stat.mtime.toISOString(),
        size: stat.size,
        obsidianUri: `obsidian://open?path=${encodeURIComponent(full)}`,
      };
    }));
  return files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)).slice(0, limit);
}

async function readVaultNote(relativePath) {
  const full = safeVaultPath(relativePath);
  const stat = await fsp.stat(full);
  if (!stat.isFile() || !full.toLowerCase().endsWith('.md')) throw new Error('Only markdown notes can be read');
  const content = await fsp.readFile(full, 'utf8');
  return {
    path: toVaultRelative(full),
    title: path.parse(full).name,
    modifiedAt: stat.mtime.toISOString(),
    size: stat.size,
    content,
    obsidianUri: `obsidian://open?path=${encodeURIComponent(full)}`,
  };
}

function openLocalPath(targetPath) {
  const child = spawn('explorer.exe', [targetPath], { detached: true, stdio: 'ignore' });
  child.unref();
}

function toPortablePath(targetPath) {
  return String(targetPath || '').replaceAll('\\', '/');
}

function makeObsidianOpenUri(targetPath) {
  return `obsidian://open?path=${encodeURIComponent(targetPath)}`;
}

function openObsidianPath(targetPath) {
  const uri = makeObsidianOpenUri(targetPath);
  const child = spawn('explorer.exe', [uri], { detached: true, stdio: 'ignore' });
  child.unref();
  return uri;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.normalize(path.join(publicDir, pathname));
  if (!filePath.startsWith(publicDir)) return sendText(res, 403, 'Forbidden');
  try {
    const data = await fsp.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = ext === '.html' ? 'text/html; charset=utf-8'
      : ext === '.css' ? 'text/css; charset=utf-8'
      : ext === '.js' ? 'text/javascript; charset=utf-8'
      : 'application/octet-stream';
    res.writeHead(200, { 'content-type': type });
    res.end(data);
  } catch {
    sendText(res, 404, 'Not Found');
  }
}

function handleUpload(req, res) {
  const busboy = Busboy({ headers: req.headers });
  let uploadPromise = null;
  let originalName = '';
  let mimeType = '';
  let size = 0;

  busboy.on('file', (_fieldname, file, info) => {
    originalName = info.filename || 'upload.bin';
    mimeType = info.mimeType || 'application/octet-stream';
    const safeName = `${Date.now()}-${path.basename(originalName).replace(/[\\/:*?"<>|]/g, '-')}`;
    const savePath = path.join(uploadDir, safeName);
    const stream = fs.createWriteStream(savePath);
    file.on('data', (chunk) => { size += chunk.length; });
    uploadPromise = new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(savePath));
      stream.on('error', reject);
      file.on('error', reject);
    });
    file.pipe(stream);
  });

  busboy.on('finish', async () => {
    try {
      if (!uploadPromise) return sendJson(res, 400, { error: 'No file uploaded' });
      const savePath = await uploadPromise;
      const result = await ingestFile({ path: savePath, originalName, mimeType, size }, { vaultPath: DEFAULT_VAULT_PATH });
      sendJson(res, 200, {
        ok: true,
        kind: result.parsed.kind,
        title: result.parsed.title,
        parser: result.parsed.parser,
        notePath: toPortablePath(result.notePath),
        noteRelativePath: toVaultRelative(result.notePath),
        obsidianUri: `obsidian://open?path=${encodeURIComponent(result.notePath)}`,
        manifestPath: toPortablePath(result.manifestPath),
        analysis: result.parsed.analysis,
        linkCandidates: result.linkCandidates,
        conceptCandidates: result.conceptCandidates,
        noteContent: result.content?.slice(0, 12000),
        recentInbox: await listInbox(20),
        parsed: result.parsed.kind === 'data' ? result.parsed : { ...result.parsed, markdown: result.parsed.markdown?.slice(0, 5000) },
      });
    } catch (error) {
      console.error(error);
      sendJson(res, 500, { error: error.message });
    }
  });

  req.pipe(busboy);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      app: 'Knowledge Forge',
      vaultPath: DEFAULT_VAULT_PATH,
      cwd: process.cwd(),
      node: process.version,
      platform: os.platform(),
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/vault/index') {
    try {
      const notes = await indexVault(DEFAULT_VAULT_PATH);
      return sendJson(res, 200, { ok: true, count: notes.length, notes: notes.slice(0, 200) });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/vault/graph') {
    try {
      const includeInbox = url.searchParams.get('includeInbox') !== 'false';
      const graph = await buildVaultGraph(DEFAULT_VAULT_PATH, { includeInbox });
      return sendJson(res, 200, { ok: true, ...graph });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/vault/inbox') {
    try {
      const limit = Number(url.searchParams.get('limit') || 30);
      return sendJson(res, 200, { ok: true, vaultPath: DEFAULT_VAULT_PATH, notes: await listInbox(limit) });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/vault/note') {
    try {
      const note = await readVaultNote(url.searchParams.get('path'));
      return sendJson(res, 200, { ok: true, note });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/vault/open') {
    try {
      const body = await readJsonBody(req);
      const target = body.path ? safeVaultPath(body.path) : DEFAULT_VAULT_PATH;
      openLocalPath(target);
      return sendJson(res, 200, { ok: true, opened: body.path || DEFAULT_VAULT_PATH });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/obsidian/open') {
    try {
      const body = await readJsonBody(req);
      const target = body.path ? safeVaultPath(body.path) : DEFAULT_VAULT_PATH;
      const obsidianUri = openObsidianPath(target);
      return sendJson(res, 200, {
        ok: true,
        opened: body.path || DEFAULT_VAULT_PATH,
        vaultPath: DEFAULT_VAULT_PATH,
        obsidianUri,
      });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/ingest') {
    return handleUpload(req, res);
  }
  return serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Knowledge Forge running at http://localhost:${port}`);
  console.log(`Vault: ${DEFAULT_VAULT_PATH}`);
});
