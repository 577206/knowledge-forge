import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, execFile } from 'node:child_process';
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

function runNotebookLmAuthCheck() {
  const notebookLmExe = path.join(root, '.venv-notebooklm', 'Scripts', 'notebooklm.exe');
  return new Promise((resolve) => {
    fs.access(notebookLmExe, fs.constants.X_OK, (accessError) => {
      if (accessError) {
        resolve({
          installed: false,
          connected: false,
          status: 'missing',
          message: 'notebooklm-py is not installed. Run the setup commands in README.md.',
        });
        return;
      }

      execFile(notebookLmExe, ['auth', 'check', '--test', '--json'], { cwd: root, timeout: 30000 }, (error, stdout) => {
        try {
          const data = JSON.parse(stdout || '{}');
          const connected = data.status === 'ok' && data.checks?.token_fetch === true;
          resolve({
            installed: true,
            connected,
            status: connected ? 'connected' : 'needs_login',
            message: connected ? 'NotebookLM is connected.' : 'NotebookLM login is required or expired.',
            checks: {
              storage_exists: Boolean(data.checks?.storage_exists),
              json_valid: Boolean(data.checks?.json_valid),
              cookies_present: Boolean(data.checks?.cookies_present),
              token_fetch: data.checks?.token_fetch === true,
            },
          });
        } catch {
          resolve({
            installed: true,
            connected: false,
            status: 'error',
            message: error?.message || 'Failed to parse notebooklm auth check output.',
          });
        }
      });
    });
  });
}

function getNotebookLmActions(connected = false) {
  return [
    { id: 'auth-check', label: '检查登录状态', available: true, output: 'status' },
    { id: 'open-login', label: '打开 NotebookLM 登录', available: true, requiresConfirmation: true, output: 'browser' },
    { id: 'write-sample-digest', label: '写入示例 Digest 到 Obsidian Inbox', available: true, requiresConfirmation: true, output: 'markdown' },
    { id: 'create-notebook', label: '创建 Notebook', available: connected, requiresConnection: true, output: 'notebooklm', reason: connected ? undefined : 'NotebookLM is not connected' },
    { id: 'add-source', label: '添加 Source', available: connected, requiresConnection: true, output: 'notebooklm', reason: connected ? undefined : 'NotebookLM is not connected' },
    { id: 'ask', label: '提问生成 Digest', available: connected, requiresConnection: true, output: 'markdown', reason: connected ? undefined : 'NotebookLM is not connected' },
  ];
}

function getLocalForgeActions() {
  return [
    { id: 'summary', label: '生成摘要', description: '基于本地规则摘要生成可复习 Markdown。', available: true, output: 'markdown' },
    { id: 'study-guide', label: '生成学习指南', description: '生成学习目标、重点概念、复习路径。', available: true, output: 'markdown' },
    { id: 'quiz', label: '生成测验题', description: '生成选择题/简答题草稿。', available: true, output: 'markdown' },
    { id: 'flashcards', label: '生成闪卡', description: '生成 Q/A 卡片，可后续导出 Anki。', available: true, output: 'markdown' },
    { id: 'pdf', label: '导出 PDF', description: 'PDF 渲染器尚未接入，演示版先返回 501。', available: false, reason: 'PDF renderer not wired yet', output: 'pdf' },
  ];
}

function extractSection(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(content || '').match(new RegExp(`## ${escaped}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i'));
  return match?.[1]?.trim() || '';
}

function extractBullets(content, limit = 8) {
  return String(content || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .slice(0, limit)
    .map((line) => line.replace(/^[-*]\s+/, ''));
}

function extractHeadings(content, limit = 10) {
  return Array.from(String(content || '').matchAll(/^#{1,3}\s+(.+)$/gm))
    .map((match) => match[1].trim())
    .filter(Boolean)
    .slice(0, limit);
}

function extractKeywordsFromNote(content, limit = 12) {
  const keywordLine = String(content || '').match(/关键词[:：]\s*([^\n]+)/);
  if (keywordLine) {
    return keywordLine[1].split(/[、,，]/).map((item) => item.trim()).filter(Boolean).slice(0, limit);
  }
  return Array.from(new Set(String(content || '').match(/[A-Za-z][A-Za-z0-9-]{2,}|[\u4e00-\u9fa5]{2,8}/g) || []))
    .filter((word) => !/^title|type|status|created|updated|source|parser|tags$/i.test(word))
    .slice(0, limit);
}

function buildLocalForgeArtifact(action, note) {
  const title = note.title.replace(/^\d{4}-\d{2}-\d{2}\s+-\s+/, '');
  const content = note.content || '';
  const summary = extractSection(content, '规则摘要');
  const outline = extractSection(content, 'Markdown 大纲');
  const concepts = extractSection(content, '关键概念候选') || extractSection(content, '关键字段/概念候选');
  const bullets = extractBullets(summary || content, 8);
  const headings = extractHeadings(content, 10);
  const keywords = extractKeywordsFromNote(content, 12);

  if (action === 'pdf') {
    const error = new Error('PDF export is not wired in this demo build.');
    error.statusCode = 501;
    throw error;
  }

  if (action === 'summary') {
    return {
      title: `Summary - ${title}`,
      content: [
        `# Summary - ${title}`,
        '',
        '## 核心摘要',
        bullets.length ? bullets.map((item) => `- ${item}`).join('\n') : '- 暂未提取到明确摘要，请回到原始笔记复核。',
        '',
        '## 关键词',
        keywords.length ? keywords.map((item) => `- ${item}`).join('\n') : '- 待提取',
        '',
        '## 大纲',
        outline || (headings.length ? headings.map((item) => `- ${item}`).join('\n') : '- 待提取'),
      ].join('\n'),
    };
  }

  if (action === 'study-guide') {
    return {
      title: `Study Guide - ${title}`,
      content: [
        `# Study Guide - ${title}`,
        '',
        '## 学习目标',
        '- 用自己的话复述这份材料的核心问题。',
        '- 解释关键概念之间的关系。',
        '- 产出一个可执行的小练习或项目应用。',
        '',
        '## 重点概念',
        concepts || (keywords.length ? keywords.map((item) => `- [[${item}]]`).join('\n') : '- 待整理'),
        '',
        '## 复习路径',
        '1. 先读摘要，标记不懂的概念。',
        '2. 回到原文对应小节，补齐定义和例子。',
        '3. 用费曼法写 5 句话解释。',
        '4. 做一轮测验题，错题回链到原笔记。',
        '',
        '## 原始大纲',
        outline || (headings.length ? headings.map((item) => `- ${item}`).join('\n') : '- 待提取'),
      ].join('\n'),
    };
  }

  if (action === 'quiz') {
    const stems = headings.length ? headings : keywords.slice(0, 6);
    return {
      title: `Quiz - ${title}`,
      content: [
        `# Quiz - ${title}`,
        '',
        '## 简答题',
        ...(stems.slice(0, 6).map((item, index) => `${index + 1}. 请解释「${item}」的核心含义，并举一个应用例子。`)),
        '',
        '## 选择题草稿',
        ...(keywords.slice(0, 4).map((item, index) => [
          `${index + 1}. 关于「${item}」，下列哪一项最准确？`,
          '   - A. 它是材料中的关键概念，需要结合上下文理解。',
          '   - B. 它与本文完全无关。',
          '   - C. 它只能通过死记硬背掌握。',
          '   - D. 它不需要复习。',
          '   - 答案：A',
        ].join('\n'))),
      ].join('\n'),
    };
  }

  if (action === 'flashcards') {
    const cards = keywords.slice(0, 10).map((item) => [`Q: ${item} 是什么？`, `A: 用原文和自己的话解释「${item}」，并补一个例子。`].join('\n'));
    return {
      title: `Flashcards - ${title}`,
      content: [
        `# Flashcards - ${title}`,
        '',
        ...cards.map((card) => `## Card\n\n${card}`),
      ].join('\n\n'),
    };
  }

  const error = new Error(`Unsupported Local Forge action: ${action}`);
  error.statusCode = 400;
  throw error;
}

async function writeInboxArtifact(title, content) {
  const inboxDir = safeVaultPath('inbox');
  await fsp.mkdir(inboxDir, { recursive: true });
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Knowledge Forge Artifact';
  const fileName = `${new Date().toISOString().slice(0, 10)} - ${safeTitle}.md`;
  const fullPath = path.join(inboxDir, fileName);
  const body = `---\ntitle: ${JSON.stringify(title)}\ntype: generated-artifact\nstatus: inbox\ncreated: ${new Date().toISOString()}\ngenerator: knowledge-forge-local\n---\n\n${content}\n`;
  await fsp.writeFile(fullPath, body, 'utf8');
  return {
    artifactPath: toVaultRelative(fullPath),
    fullPath,
    obsidianUri: makeObsidianOpenUri(fullPath),
  };
}

async function handleLocalForgeGenerate(req, res) {
  try {
    const body = await readJsonBody(req);
    const action = String(body.action || '').trim();
    if (!action) return sendJson(res, 400, { ok: false, error: 'Missing action' });
    if (!body.notePath) return sendJson(res, 400, { ok: false, error: 'Missing notePath' });
    const note = await readVaultNote(body.notePath);
    const artifact = buildLocalForgeArtifact(action, note);
    const writeResult = body.writeToInbox === false ? null : await writeInboxArtifact(artifact.title, artifact.content);
    return sendJson(res, 200, {
      ok: true,
      action,
      title: artifact.title,
      format: 'markdown',
      content: artifact.content,
      artifactPath: writeResult?.artifactPath,
      obsidianUri: writeResult?.obsidianUri,
      recentInbox: await listInbox(20),
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      ok: false,
      error: error.message,
      fallbackActions: error.statusCode === 501 ? ['summary', 'study-guide'] : undefined,
    });
  }
}

async function handleNotebookLmAction(req, res) {
  try {
    const body = await readJsonBody(req);
    const action = String(body.action || '').trim();
    const notebookLmExe = path.join(root, '.venv-notebooklm', 'Scripts', 'notebooklm.exe');

    if (action === 'auth-check') {
      const status = await runNotebookLmAuthCheck();
      return sendJson(res, 200, { ok: true, action, ...status, actions: getNotebookLmActions(status.connected) });
    }

    if (action === 'open-login' || action === 'login') {
      const child = spawn(notebookLmExe, ['login', '--browser', 'chrome', '--fresh'], { cwd: root, detached: true, stdio: 'ignore' });
      child.unref();
      return sendJson(res, 200, { ok: true, action: 'open-login', status: 'started', message: 'NotebookLM login opened in Chrome. Complete login, then run auth-check.' });
    }

    if (action === 'write-sample-digest') {
      const title = body.title || 'NotebookLM Demo Digest';
      const content = [
        `# ${title}`,
        '',
        '## Source-grounded digest',
        '- This is a local demo artifact for the NotebookLM → Agent → Obsidian flow.',
        '- Real NotebookLM notebook/source/ask automation is intentionally behind a confirmation action.',
        '- After auth is connected, this endpoint can be extended to call create-notebook/add-source/ask.',
        '',
        '## Next review actions',
        '- [ ] Replace demo bullets with NotebookLM answer JSON.',
        '- [ ] Verify important claims against the original sources.',
        '- [ ] Promote reviewed notes out of inbox.',
      ].join('\n');
      const writeResult = await writeInboxArtifact(title, content);
      return sendJson(res, 200, { ok: true, action, status: 'completed', title, format: 'markdown', content, ...writeResult, recentInbox: await listInbox(20) });
    }

    return sendJson(res, 501, { ok: false, action, error: 'This NotebookLM action is declared for the UI but not wired in the demo backend yet.', implementedActions: ['auth-check', 'open-login', 'write-sample-digest'] });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message });
  }
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
  if (req.method === 'GET' && url.pathname === '/api/local-forge/actions') {
    return sendJson(res, 200, { ok: true, actions: getLocalForgeActions() });
  }
  if (req.method === 'POST' && url.pathname === '/api/local-forge/generate') {
    return handleLocalForgeGenerate(req, res);
  }
  if (req.method === 'POST' && url.pathname === '/api/notebooklm/action') {
    return handleNotebookLmAction(req, res);
  }
  if (req.method === 'GET' && url.pathname === '/api/notebooklm/status') {
    const status = await runNotebookLmAuthCheck();
    return sendJson(res, 200, {
      ok: true,
      ...status,
      actions: getNotebookLmActions(status.connected),
      safety: {
        unofficial: true,
        authStorage: 'local file only; never expose cookies or storage_state.json',
        writesRequireConfirmation: true,
      },
    });
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
