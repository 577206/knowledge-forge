import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, execFile } from 'node:child_process';
import Busboy from 'busboy';
import { ingestFile, stageFile, approveStaged, rejectStaged, indexVault, buildVaultGraph } from '../../packages/ingestion-core/index.js';
import { DEFAULT_VAULT_PATH } from '../../packages/ingestion-core/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const publicDir = path.join(root, 'apps', 'web');
const uploadDir = path.join(root, '.uploads');
const artifactDir = path.join(DEFAULT_VAULT_PATH, '.knowledge-forge');
const artifactLogPath = path.join(artifactDir, 'artifacts.jsonl');
const port = Number(process.env.PORT || 4177);
const openclawAgentId = process.env.KF_OPENCLAW_AGENT || 'main';
const pdfDir = path.join(DEFAULT_VAULT_PATH, '.knowledge-forge', 'pdf');

await fsp.mkdir(uploadDir, { recursive: true });
await fsp.mkdir(artifactDir, { recursive: true });
await fsp.mkdir(pdfDir, { recursive: true });

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


async function readKnowledgeForgeConfig() {
  const candidates = [
    path.join(root, 'knowledge-forge.config.json'),
    path.join(root, 'knowledge-forge.config.example.json'),
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(await fsp.readFile(candidate, 'utf8'));
    } catch {}
  }
  return {
    features: { localForge: true, finalExamReview: true, obsidian: true, notebooklm: true },
    agent: { assumed: true, recommendedSetup: 'full' },
  };
}

function getObsidianExecutableCandidates(config = {}) {
  return [
    config.obsidian?.executablePath,
    process.env.OBSIDIAN_EXECUTABLE,
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Obsidian', 'Obsidian.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Obsidian', 'Obsidian.exe'),
    'D:\\11\\Obsidian\\Obsidian.exe',
  ].filter(Boolean);
}

async function findExistingPath(candidates = []) {
  for (const candidate of candidates) {
    try {
      await fsp.access(candidate);
      return candidate;
    } catch {}
  }
  return null;
}

async function getObsidianStatus() {
  const config = await readKnowledgeForgeConfig();
  const vaultExists = await fsp.stat(DEFAULT_VAULT_PATH).then((stat) => stat.isDirectory()).catch(() => false);
  const executablePath = await findExistingPath(getObsidianExecutableCandidates(config));
  return {
    enabled: config.features?.obsidian !== false,
    vaultPath: DEFAULT_VAULT_PATH,
    vaultExists,
    executablePath,
    protocolUri: makeObsidianOpenUri(DEFAULT_VAULT_PATH),
    fallbacks: ['protocol', 'executable', 'folder', 'copy-path'],
  };
}

function appendJsonl(filePath, payload) {
  return fsp.appendFile(filePath, JSON.stringify(payload) + '\n', 'utf8');
}

async function recordArtifact(payload) {
  await fsp.mkdir(artifactDir, { recursive: true });
  const record = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'draft',
    reviewRequired: true,
    vaultPath: DEFAULT_VAULT_PATH,
    ...payload,
  };
  await appendJsonl(artifactLogPath, record);
  return record;
}

async function listArtifacts(limit = 40) {
  let raw = '';
  try { raw = await fsp.readFile(artifactLogPath, 'utf8'); } catch { return []; }
  return raw.split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean)
    .reverse()
    .slice(0, limit);
}

async function getCapabilities() {
  const config = await readKnowledgeForgeConfig();
  const obsidian = await getObsidianStatus();
  return [
    {
      id: 'local-forge',
      label: 'Local Forge',
      status: 'ready',
      enabled: config.features?.localForge !== false,
      recommended: true,
      description: '本地资料摄入与 fallback 草稿生成，不需要 Google 登录；正式深度生成请使用本机 Agent。',
      actions: ['upload', 'summary:fallback', 'study-guide:fallback', 'quiz:fallback', 'flashcards:fallback'],
    },
    {
      id: 'final-exam-review',
      label: 'Final Exam Review',
      status: config.features?.finalExamReview === false ? 'disabled' : 'ready',
      enabled: config.features?.finalExamReview !== false,
      recommended: true,
      description: '正式 Agent 任务执行内核：通过 Claude Code / OpenClaw / Codex 生成复习计划、考点整理、闪卡、测验；MCP Server 是后续增强形态。',
      skillRepo: 'https://github.com/577206/final-exam-review-skill',
    },
    {
      id: 'obsidian',
      label: 'Obsidian Bridge',
      status: obsidian.vaultExists ? 'ready' : 'needs_config',
      enabled: obsidian.enabled,
      recommended: true,
      description: '把生成结果写入 Obsidian / Markdown vault。',
      details: obsidian,
    },
    {
      id: 'notebooklm',
      label: 'NotebookLM Bridge',
      status: 'disabled',
      enabled: false,
      recommended: false,
      description: '正在测试中，即将上线。当前发布版先关闭 NotebookLM 入口，避免登录态和隐私边界不稳定。',
      details: { message: 'Testing in progress. Coming soon.' },
    },
  ];
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
        obsidianUri: makeObsidianOpenUri(full),
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
    obsidianUri: makeObsidianOpenUri(full),
  };
}

function openLocalPath(targetPath) {
  const child = spawn('explorer.exe', [targetPath], { detached: true, stdio: 'ignore' });
  child.unref();
}

function openLocalFile(targetPath) {
  const child = spawn('cmd.exe', ['/c', 'start', '', targetPath], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

function revealLocalPath(targetPath) {
  const child = spawn('explorer.exe', ['/select,', targetPath], { detached: true, stdio: 'ignore' });
  child.unref();
}

function toPortablePath(targetPath) {
  return String(targetPath || '').replaceAll('\\', '/');
}

function makeObsidianOpenUri(targetPath) {
  const vaultName = path.basename(DEFAULT_VAULT_PATH);
  const fullPath = path.resolve(String(targetPath || DEFAULT_VAULT_PATH));
  const vaultRoot = path.resolve(DEFAULT_VAULT_PATH);
  if (fullPath === vaultRoot) {
    return `obsidian://open?vault=${encodeURIComponent(vaultName)}`;
  }
  if (fullPath.startsWith(vaultRoot + path.sep)) {
    const relative = path.relative(vaultRoot, fullPath).replaceAll('\\', '/');
    // Obsidian's Windows protocol handler is much more reliable with vault+file
    // than with a raw absolute path, especially for Chinese paths and running apps.
    return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(relative)}`;
  }
  return `obsidian://open?path=${encodeURIComponent(fullPath)}`;
}

async function openObsidianPath(targetPath, preferredMethod = 'protocol') {
  const config = await readKnowledgeForgeConfig();
  const fullTargetPath = path.resolve(String(targetPath || DEFAULT_VAULT_PATH));
  const uri = makeObsidianOpenUri(fullTargetPath);
  const executablePath = await findExistingPath(getObsidianExecutableCandidates(config));
  const targetDir = await fsp.stat(fullTargetPath).then((stat) => stat.isDirectory() ? fullTargetPath : path.dirname(fullTargetPath)).catch(() => DEFAULT_VAULT_PATH);

  if (preferredMethod === 'folder') {
    openLocalPath(targetDir);
    return { method: 'folder', opened: targetDir, requestedPath: fullTargetPath };
  }

  if (preferredMethod === 'executable' && executablePath) {
    // Obsidian's CLI reliably opens the vault; the UI can then follow the protocol URI.
    const child = spawn(executablePath, [DEFAULT_VAULT_PATH], { detached: true, stdio: 'ignore' });
    child.unref();
    spawn('explorer.exe', [uri], { detached: true, stdio: 'ignore' }).unref();
    return { method: 'executable+protocol', opened: fullTargetPath, executablePath, obsidianUri: uri };
  }

  try {
    const child = spawn('explorer.exe', [uri], { detached: true, stdio: 'ignore' });
    child.unref();
    return { method: 'protocol', opened: fullTargetPath, obsidianUri: uri, executablePath };
  } catch {
    if (executablePath) {
      const child = spawn(executablePath, [DEFAULT_VAULT_PATH], { detached: true, stdio: 'ignore' });
      child.unref();
      return { method: 'executable', opened: DEFAULT_VAULT_PATH, requestedPath: fullTargetPath, obsidianUri: uri, executablePath };
    }
    openLocalPath(targetDir);
    return { method: 'folder', opened: targetDir, requestedPath: fullTargetPath, obsidianUri: uri };
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function safeAgentPackPath(packDir = '') {
  const rootDir = path.resolve(DEFAULT_VAULT_PATH, '.knowledge-forge', 'agent-packs');
  const full = path.resolve(String(packDir || ''));
  if (full !== rootDir && !full.startsWith(rootDir + path.sep)) {
    throw new Error('Agent pack path is outside Knowledge Forge agent-packs');
  }
  return full;
}

function resolveLocalAgentCommand(command) {
  if (process.platform !== 'win32') return { command, argsPrefix: [] };
  const npmDir = path.join(os.homedir(), 'AppData', 'Roaming', 'npm');
  if (command === 'claude') {
    const direct = path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
    if (fs.existsSync(direct)) return { command: direct, argsPrefix: [] };
  }
  if (command === 'openclaw') {
    const mjs = path.join(npmDir, 'node_modules', 'openclaw', 'openclaw.mjs');
    if (fs.existsSync(mjs)) return { command: process.execPath, argsPrefix: [mjs] };
  }
  if (command === 'codex') {
    const cmd = path.join(npmDir, 'codex.cmd');
    if (fs.existsSync(cmd)) return { command: 'cmd.exe', argsPrefix: ['/c', cmd] };
    const ps1 = path.join(npmDir, 'codex.ps1');
    if (fs.existsSync(ps1)) return { command: 'powershell.exe', argsPrefix: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1] };
  }
  return { command, argsPrefix: [] };
}

function normalizeAgentEngine(engine = 'claude') {
  const normalized = String(engine || 'claude').toLowerCase();
  if (['claude', 'codex', 'openclaw'].includes(normalized)) return normalized;
  const error = new Error(`Unsupported agent engine: ${engine}`);
  error.statusCode = 400;
  throw error;
}

function makeFinalExamReviewPrompt({ packDir = '', task = '', manifests = [], mode = 'single' } = {}) {
  if (mode === 'batch') {
    return [
      'You are the local computer Agent inside Knowledge Forge.',
      'The user uploaded multiple source files and selected FUSE mode.',
      'Your job is to read all source packs and create ONE integrated review artifact.',
      '',
      'Source packs:',
      ...manifests.map((item, index) => `${index + 1}. ${item.manifest.title} - ${item.packDir}`),
      '',
      'Read for every pack:',
      '- manifest.json',
      '- AGENT_TASK.md',
      '- every Markdown file under chunks/',
      '',
      'Important requirements:',
      '- Output ONLY the final Markdown artifact. Do not describe your process.',
      '- Fuse overlapping concepts across files instead of repeating separate summaries.',
      '- Cite source title and chunk ids for important claims, for example: (Lecture 2 / chunk-003).',
      '- If sources conflict, create a "Conflicts / needs review" section.',
      '- If something is unclear, write NEEDS_SOURCE_REVIEW instead of inventing.',
      '- Follow final-exam-review style: integrated summary, knowledge map, P0/P1/P2 points, Feynman explanations, common mistakes, plan, mock questions, flashcards.',
    ].join('\n');
  }
  return [
    'You are the local computer Agent inside Knowledge Forge.',
    'Your job is to read the uploaded source pack and generate a useful study/review artifact.',
    '',
    `Pack directory: ${packDir}`,
    '',
    'Read these files from the pack directory:',
    '- manifest.json',
    '- AGENT_TASK.md',
    '- every Markdown file under chunks/',
    '',
    'Important requirements:',
    '- Output ONLY the final Markdown artifact. Do not describe your process.',
    '- Cite chunk ids for important claims, for example: (chunk-003).',
    '- If something is unclear, write NEEDS_SOURCE_REVIEW instead of inventing.',
    '- Follow the final-exam-review style: summary, knowledge map, P0/P1/P2 points, Feynman explanations, mistakes, plan, mock questions, flashcards.',
    '- If the source is a data table, explain fields and risks first; never invent formulas.',
    '',
    'AGENT_TASK.md:',
    task,
  ].join('\n');
}

function buildAgentPrompt({ customPrompt, taskPrompt, defaultPrompt }) {
  const selected = [customPrompt, taskPrompt, defaultPrompt]
    .map((part) => String(part || '').trim())
    .find(Boolean) || defaultPrompt;
  return [
    selected,
    'Formatting rule for math: if the output contains formulas, write them in standard LaTeX math syntax. Use inline `$...$` for inline math and block `$$...$$` for displayed equations. Do not use screenshots, Unicode-only approximations, or pseudo-formulas when LaTeX is appropriate.',
  ].join('\n\n');
}

async function buildPackInlineContext(packDir, maxChars = 40000) {
  const manifestPath = path.join(packDir, 'manifest.json');
  const taskPath = path.join(packDir, 'AGENT_TASK.md');
  const chunksDir = path.join(packDir, 'chunks');
  const parts = [];
  try { parts.push(`# manifest.json\n\n${await fsp.readFile(manifestPath, 'utf8')}`); } catch {}
  try { parts.push(`# AGENT_TASK.md\n\n${await fsp.readFile(taskPath, 'utf8')}`); } catch {}
  let entries = [];
  try { entries = await fsp.readdir(chunksDir, { withFileTypes: true }); } catch {}
  for (const entry of entries.filter((item) => item.isFile() && item.name.endsWith('.md')).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(chunksDir, entry.name);
    let content = '';
    try { content = await fsp.readFile(full, 'utf8'); } catch { continue; }
    parts.push(`# chunks/${entry.name}\n\n${content}`);
    if (parts.join('\n\n').length > maxChars) {
      parts.push(`\n\n> TRUNCATED: source pack exceeded ${maxChars} characters. Ask user to split or use Claude/Codex if more detail is needed.`);
      break;
    }
  }
  return parts.join('\n\n---\n\n').slice(0, maxChars);
}

async function runCodexExec({ cwd, prompt, timeout = 15 * 60 * 1000 }) {
  const tmpFile = path.join(os.tmpdir(), `knowledge-forge-codex-${Date.now()}-${crypto.randomUUID()}.md`);
  // Use stdin (`-`) instead of passing the prompt as a command-line argument.
  // On Windows, long/multiline/Chinese prompts can be truncated by cmd.exe argument parsing.
  const args = ['exec', '--skip-git-repo-check', '-C', cwd, '--sandbox', 'read-only', '--output-last-message', tmpFile, '-'];
  const resolved = resolveLocalAgentCommand('codex');
  const commandLine = `${resolved.command} ${[...resolved.argsPrefix, ...args].map((arg) => JSON.stringify(arg)).join(' ')} < prompt`;
  try {
    const { stdout, stderr } = await spawnText('codex', args, { cwd, timeout, input: prompt });
    const fileOutput = await fsp.readFile(tmpFile, 'utf8').catch(() => '');
    return { stdout: fileOutput || stdout, stderr, commandLine };
  } finally {
    await fsp.rm(tmpFile, { force: true }).catch(() => {});
  }
}

function spawnText(command, args, options = {}) {
  const resolved = resolveLocalAgentCommand(command);
  const timeout = options.timeout || 10 * 60 * 1000;
  return new Promise((resolve, reject) => {
    const child = spawn(resolved.command, [...resolved.argsPrefix, ...args], {
      cwd: options.cwd,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      const error = new Error(`${command} timed out after ${timeout}ms`);
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    }, timeout);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => {
      clearTimeout(timer);
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const error = new Error(`${command} exited with code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
    if (options.input) child.stdin.end(options.input);
    else child.stdin.end();
  });
}

function execFileText(command, args, options = {}) {
  const resolved = resolveLocalAgentCommand(command);
  return new Promise((resolve, reject) => {
    execFile(resolved.command, [...resolved.argsPrefix, ...args], {
      timeout: 10 * 60 * 1000,
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
      ...options,
    }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

function extractAgentOutput(engine, stdout) {
  const text = String(stdout || '').trim();
  if (!text) return '';
  if (engine === 'openclaw') {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed.payloads)) {
        const payloadText = parsed.payloads
          .map((payload) => payload?.text || payload?.message || '')
          .filter(Boolean)
          .join('\n\n')
          .trim();
        if (payloadText) return payloadText;
      }
      return parsed.reply || parsed.message || parsed.text || parsed.output || parsed.finalAssistantVisibleText || text;
    } catch {
      return text;
    }
  }
  if (engine === 'claude') {
    try {
      const parsed = JSON.parse(text);
      return parsed.result || parsed.message || parsed.response || parsed.text || text;
    } catch {
      return text;
    }
  }
  return text;
}

function makeOpenClawSessionId(seed = 'run') {
  return `knowledge-forge-${slugifyForSession(seed)}-${Date.now()}`.slice(0, 120);
}

function slugifyForSession(input = 'task') {
  return String(input || 'task')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'task';
}

async function runComputerAgentOnPack({ packDir, engine = 'claude', outputType = 'final-exam-review', customPrompt = '', taskPrompt = '' }) {
  engine = normalizeAgentEngine(engine);
  const fullPackDir = safeAgentPackPath(packDir);
  const manifestPath = path.join(fullPackDir, 'manifest.json');
  const taskPath = path.join(fullPackDir, 'AGENT_TASK.md');
  const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  const task = await fsp.readFile(taskPath, 'utf8');
  const title = manifest.title || 'Knowledge Forge Source';
  const defaultPrompt = makeFinalExamReviewPrompt({ packDir: fullPackDir, task });
  let prompt = buildAgentPrompt({ customPrompt, taskPrompt, defaultPrompt });
  if (engine === 'openclaw') {
    prompt = [
      'Knowledge Forge task. Read the local source pack directory below and generate the requested Markdown artifact.',
      `Pack directory: ${fullPackDir}`,
      'Read manifest.json, AGENT_TASK.md, and chunks/*.md. Cite chunk ids. Do not invent facts; use NEEDS_SOURCE_REVIEW when uncertain.',
      taskPrompt ? `User task prompt:\n${taskPrompt}` : '',
      customPrompt ? `Custom prompt:\n${customPrompt}` : '',
      'Output only the final Markdown artifact.',
    ].filter(Boolean).join('\n\n');
  }

  let stdout = '';
  let stderr = '';
  let commandLine = '';
  if (engine === 'openclaw') {
    const sessionId = makeOpenClawSessionId(title);
    const args = ['agent', '--local', '--agent', openclawAgentId, '--session-id', sessionId, '--thinking', 'off', '--message', prompt, '--timeout', '900', '--json'];
    const resolved = resolveLocalAgentCommand('openclaw');
    commandLine = `${resolved.command} ${[...resolved.argsPrefix, ...args].map((arg) => JSON.stringify(arg)).join(' ')}`;
    ({ stdout, stderr } = await execFileText('openclaw', args, { cwd: fullPackDir, timeout: 15 * 60 * 1000 }));
  } else if (engine === 'claude') {
    const args = ['--bare', '--dangerously-skip-permissions', '--permission-mode', 'bypassPermissions', '--add-dir', fullPackDir, '--print', prompt];
    const resolved = resolveLocalAgentCommand('claude');
    commandLine = `${resolved.command} ${[...resolved.argsPrefix, ...args].map((arg) => JSON.stringify(arg)).join(' ')}`;
    ({ stdout, stderr } = await execFileText('claude', args, { cwd: fullPackDir }));
  } else if (engine === 'codex') {
    ({ stdout, stderr, commandLine } = await runCodexExec({ cwd: fullPackDir, prompt, timeout: 15 * 60 * 1000 }));
  }

  const content = extractAgentOutput(engine, stdout).trim();
  if (!content) {
    const error = new Error(`${engine} returned empty output`);
    error.statusCode = 502;
    error.stderr = stderr;
    throw error;
  }

  const artifactTitle = `${outputType === 'final-exam-review' ? 'AI Review Pack' : 'AI Notes'} - ${title}`;
  return {
    engine,
    title: artifactTitle,
    content,
    stderr,
    agentPack: fullPackDir,
    pendingSave: true,
    sourceTitle: title,
    sourceAgentPack: fullPackDir,
    command: commandLine,
  };
}


async function runComputerAgentOnBatch({ packDirs = [], engine = 'claude', outputType = 'final-exam-review', customPrompt = '', taskPrompt = '' }) {
  engine = normalizeAgentEngine(engine);
  const fullPackDirs = packDirs.map((packDir) => safeAgentPackPath(packDir));
  if (!fullPackDirs.length) {
    const error = new Error('No source packs selected');
    error.statusCode = 400;
    throw error;
  }
  const manifests = [];
  for (const packDir of fullPackDirs) {
    const manifest = JSON.parse(await fsp.readFile(path.join(packDir, 'manifest.json'), 'utf8'));
    manifests.push({ packDir, manifest });
  }
  const title = manifests.length === 1
    ? manifests[0].manifest.title
    : `Fused Review - ${manifests.map((item) => item.manifest.title).slice(0, 3).join(' + ')}${manifests.length > 3 ? ` + ${manifests.length - 3} more` : ''}`;
  const defaultPrompt = makeFinalExamReviewPrompt({ manifests, mode: 'batch' });
  let prompt = buildAgentPrompt({ customPrompt, taskPrompt, defaultPrompt });
  if (engine === 'openclaw') {
    prompt = [
      'Knowledge Forge fused task. Read all local source pack directories below and generate ONE integrated Markdown artifact.',
      'Pack directories:',
      ...fullPackDirs.map((dir, index) => `${index + 1}. ${dir}`),
      'For each pack, read manifest.json, AGENT_TASK.md, and chunks/*.md. Cite source titles and chunk ids. Do not invent facts; use NEEDS_SOURCE_REVIEW when uncertain.',
      taskPrompt ? `User task prompt:\n${taskPrompt}` : '',
      customPrompt ? `Custom prompt:\n${customPrompt}` : '',
      'Output only the final Markdown artifact.',
    ].filter(Boolean).join('\n\n');
  }

  let stdout = '';
  let stderr = '';
  let commandLine = '';
  const cwd = fullPackDirs[0];
  if (engine === 'openclaw') {
    const sessionId = makeOpenClawSessionId(title);
    const args = ['agent', '--local', '--agent', openclawAgentId, '--session-id', sessionId, '--thinking', 'off', '--message', prompt, '--timeout', '900', '--json'];
    const resolved = resolveLocalAgentCommand('openclaw');
    commandLine = `${resolved.command} ${[...resolved.argsPrefix, ...args].map((arg) => JSON.stringify(arg)).join(' ')}`;
    ({ stdout, stderr } = await execFileText('openclaw', args, { cwd, timeout: 15 * 60 * 1000 }));
  } else if (engine === 'claude') {
    const addDirs = fullPackDirs.flatMap((dir) => ['--add-dir', dir]);
    const args = ['--bare', '--dangerously-skip-permissions', '--permission-mode', 'bypassPermissions', ...addDirs, '--print', prompt];
    const resolved = resolveLocalAgentCommand('claude');
    commandLine = `${resolved.command} ${[...resolved.argsPrefix, ...args].map((arg) => JSON.stringify(arg)).join(' ')}`;
    ({ stdout, stderr } = await execFileText('claude', args, { cwd, timeout: 15 * 60 * 1000 }));
  } else if (engine === 'codex') {
    const codexPrompt = `${prompt}\n\nAccessible pack directories:\n${fullPackDirs.join('\n')}`;
    ({ stdout, stderr, commandLine } = await runCodexExec({ cwd, prompt: codexPrompt, timeout: 15 * 60 * 1000 }));
  }

  const content = extractAgentOutput(engine, stdout).trim();
  if (!content) {
    const error = new Error(`${engine} returned empty output`);
    error.statusCode = 502;
    error.stderr = stderr;
    throw error;
  }
  const artifactTitle = `${outputType === 'final-exam-review' ? 'AI Fused Review Pack' : 'AI Fused Notes'} - ${title}`;
  return {
    engine,
    title: artifactTitle,
    content,
    stderr,
    agentPacks: fullPackDirs,
    pendingSave: true,
    sourceTitle: title,
    sourceAgentPacks: fullPackDirs,
    command: commandLine,
  };
}


async function checkCommandAvailable(command, args = ['--version']) {
  try {
    const result = await execFileText(command, args, { timeout: 15000, maxBuffer: 1024 * 1024 });
    return { available: true, version: String(result.stdout || result.stderr || '').trim().split(/\r?\n/)[0] };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

async function detectCurrentAgent() {
  const [claude, codex, openclaw] = await Promise.all([
    checkCommandAvailable('claude', ['--version']),
    checkCommandAvailable('codex', ['--version']),
    checkCommandAvailable('openclaw', ['--version']),
  ]);
  const preferred = claude.available ? 'claude' : openclaw.available ? 'openclaw' : codex.available ? 'codex' : null;
  return {
    ok: true,
    preferred,
    currentRuntime: 'Knowledge Forge can launch Claude Code, Codex CLI, or OpenClaw. OpenClaw uses short path-based prompts to avoid Windows command-line length limits.',
    agents: {
      claude: { label: 'Claude Code', ...claude },
      openclaw: { label: 'OpenClaw', ...openclaw },
      codex: { label: 'Codex CLI', ...codex },
    },
  };
}


function shellQuotePowerShell(value = '') {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function openExternalAgentTerminal({ packDir, packDirs = [], engine = 'claude', mode = 'separate' }) {
  const dirs = (packDirs.length ? packDirs : [packDir]).filter(Boolean).map((dir) => safeAgentPackPath(dir));
  if (!dirs.length) {
    const error = new Error('No source pack selected');
    error.statusCode = 400;
    throw error;
  }
  const firstDir = dirs[0];
  const title = engine === 'openclaw' ? 'Knowledge Forge - OpenClaw Agent' : engine === 'codex' ? 'Knowledge Forge - Codex CLI' : 'Knowledge Forge - Claude Code';
  const prompt = mode === 'fuse'
    ? `Read all Knowledge Forge agent packs listed here and create ONE fused final-exam review Markdown. Cite source titles and chunk ids. Packs:\n${dirs.join('\n')}`
    : `Read this Knowledge Forge agent pack and create a final-exam review Markdown. Cite chunk ids. Pack: ${firstDir}`;

  let command = '';
  if (engine === 'openclaw') {
    const resolved = resolveLocalAgentCommand('openclaw');
    const actualCommand = `${shellQuotePowerShell(resolved.command)} ${resolved.argsPrefix.map(shellQuotePowerShell).join(' ')} agent --local --agent ${shellQuotePowerShell(openclawAgentId)} --session-id ${shellQuotePowerShell(makeOpenClawSessionId(mode === 'fuse' ? 'fuse' : path.basename(firstDir)))} --timeout 900 --message ${shellQuotePowerShell(prompt)}`;
    command = `Set-Location ${shellQuotePowerShell(firstDir)}; $Host.UI.RawUI.BackgroundColor='White'; $Host.UI.RawUI.ForegroundColor='Black'; Clear-Host; Write-Host 'Knowledge Forge 外部终端'; Write-Host '即将执行真实命令：'; Write-Host ${shellQuotePowerShell(actualCommand)}; Write-Host ''; ${actualCommand}; Write-Host ''; Write-Host '按 Enter 关闭...'; Read-Host`;
  } else if (engine === 'codex') {
    const tmpFile = path.join(os.tmpdir(), `knowledge-forge-codex-terminal-${Date.now()}.md`);
    const actualCommand = `${shellQuotePowerShell(resolveLocalAgentCommand('codex').command)} exec --skip-git-repo-check -C ${shellQuotePowerShell(firstDir)} --sandbox read-only --output-last-message ${shellQuotePowerShell(tmpFile)} ${shellQuotePowerShell(prompt)}`;
    command = `Set-Location ${shellQuotePowerShell(firstDir)}; $Host.UI.RawUI.BackgroundColor='White'; $Host.UI.RawUI.ForegroundColor='Black'; Clear-Host; Write-Host 'Knowledge Forge 外部终端'; Write-Host '即将执行真实命令：'; Write-Host ${shellQuotePowerShell(actualCommand)}; Write-Host ''; ${actualCommand}; if (Test-Path ${shellQuotePowerShell(tmpFile)}) { Write-Host ''; Write-Host 'Codex 输出：'; Get-Content ${shellQuotePowerShell(tmpFile)} -Raw }; Write-Host ''; Write-Host '按 Enter 关闭...'; Read-Host`;
  } else {
    const resolved = resolveLocalAgentCommand('claude');
    const addDirs = dirs.map((dir) => `--add-dir ${shellQuotePowerShell(dir)}`).join(' ');
    const actualCommand = `${shellQuotePowerShell(resolved.command)} --bare --dangerously-skip-permissions --permission-mode bypassPermissions ${addDirs} ${shellQuotePowerShell(prompt)}`;
    command = `Set-Location ${shellQuotePowerShell(firstDir)}; $Host.UI.RawUI.BackgroundColor='White'; $Host.UI.RawUI.ForegroundColor='Black'; Clear-Host; Write-Host 'Knowledge Forge 外部终端'; Write-Host '即将执行真实命令：'; Write-Host ${shellQuotePowerShell(actualCommand)}; Write-Host ''; ${actualCommand}; Write-Host ''; Write-Host '按 Enter 关闭...'; Read-Host`;
  }

  const args = [
    '-NoExit',
    '-Command',
    `$host.UI.RawUI.WindowTitle = ${shellQuotePowerShell(title)}; ${command}`,
  ];
  const child = spawn('powershell.exe', args, { detached: true, stdio: 'ignore', windowsHide: false });
  child.unref();
  return { opened: true, engine, mode, title, packDirs: dirs };
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


async function listStaging(limit = 30) {
  const stagingDir = safeVaultPath('.knowledge-forge/staging');
  let entries = [];
  try {
    entries = await fsp.readdir(stagingDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const items = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const full = path.join(stagingDir, entry.name);
    try {
      const manifest = JSON.parse(await fsp.readFile(full, 'utf8'));
      if (manifest.status === 'rejected') continue;
      const draftStat = manifest.draftPath ? await fsp.stat(manifest.draftPath).catch(() => null) : null;
      items.push({
        id: manifest.id,
        status: manifest.status || 'staged',
        title: manifest.title,
        source: manifest.source,
        kind: manifest.kind,
        parser: manifest.parser,
        createdAt: manifest.createdAt,
        updatedAt: manifest.updatedAt,
        size: draftStat?.size || 0,
        draftRelativePath: manifest.draftPath ? toVaultRelative(manifest.draftPath) : null,
        noteRelativePath: manifest.notePath ? toVaultRelative(manifest.notePath) : null,
        agentPack: manifest.agentPack ? {
          ...manifest.agentPack,
          packDir: toPortablePath(manifest.agentPack.packDir),
          manifestPath: toPortablePath(manifest.agentPack.manifestPath),
          instructionPath: toPortablePath(manifest.agentPack.instructionPath),
        } : null,
        analysis: manifest.analysis,
        linkCandidates: manifest.linkCandidates || [],
        conceptCandidates: manifest.conceptCandidates || [],
      });
    } catch {}
  }
  return items
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, limit);
}

async function readStagingItem(id) {
  const safeId = String(id || '').replace(/[^a-zA-Z0-9_.-]/g, '');
  if (!safeId) throw new Error('Missing staging id');
  const manifestPath = safeVaultPath(`.knowledge-forge/staging/${safeId}.json`);
  const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  const content = manifest.draftPath ? await fsp.readFile(manifest.draftPath, 'utf8').catch(() => '') : '';
  return {
    id: manifest.id,
    status: manifest.status || 'staged',
    title: manifest.title,
    source: manifest.source,
    kind: manifest.kind,
    parser: manifest.parser,
    createdAt: manifest.createdAt,
    updatedAt: manifest.updatedAt,
    draftRelativePath: manifest.draftPath ? toVaultRelative(manifest.draftPath) : null,
    noteRelativePath: manifest.notePath ? toVaultRelative(manifest.notePath) : null,
    obsidianUri: manifest.notePath ? makeObsidianOpenUri(manifest.notePath) : null,
    content,
    analysis: manifest.analysis,
    linkCandidates: manifest.linkCandidates || [],
    conceptCandidates: manifest.conceptCandidates || [],
    agentPack: manifest.agentPack ? {
      ...manifest.agentPack,
      packDir: toPortablePath(manifest.agentPack.packDir),
      manifestPath: toPortablePath(manifest.agentPack.manifestPath),
      instructionPath: toPortablePath(manifest.agentPack.instructionPath),
    } : null,
  };
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
      const directWrite = new URL(req.url, `http://${req.headers.host}`).searchParams.get('direct') === 'true';
      const result = directWrite
        ? await ingestFile({ path: savePath, originalName, mimeType, size }, { vaultPath: DEFAULT_VAULT_PATH })
        : await stageFile({ path: savePath, originalName, mimeType, size }, { vaultPath: DEFAULT_VAULT_PATH });
      sendJson(res, 200, {
        ok: true,
        staged: !directWrite,
        stagingId: result.stagingId,
        kind: result.parsed.kind,
        title: result.parsed.title,
        parser: result.parsed.parser,
        notePath: result.notePath ? toPortablePath(result.notePath) : null,
        noteRelativePath: result.notePath ? toVaultRelative(result.notePath) : null,
        draftPath: result.draftPath ? toPortablePath(result.draftPath) : null,
        draftRelativePath: result.draftPath ? toVaultRelative(result.draftPath) : null,
        obsidianUri: result.notePath ? makeObsidianOpenUri(result.notePath) : null,
        manifestPath: toPortablePath(result.manifestPath),
        agentPack: result.agentPack ? {
          packDir: toPortablePath(result.agentPack.packDir),
          manifestPath: toPortablePath(result.agentPack.manifestPath),
          instructionPath: toPortablePath(result.agentPack.instructionPath),
          chunkCount: result.agentPack.chunkCount,
          instruction: result.agentPack.instruction,
          recommendedAgents: result.agentPack.manifest?.recommendedAgents || [],
        } : null,
        analysis: result.parsed.analysis,
        linkCandidates: result.linkCandidates,
        conceptCandidates: result.conceptCandidates,
        noteContent: result.content?.slice(0, 12000),
        recentInbox: await listInbox(20),
        stagingQueue: await listStaging(20),
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


function getAgentQuickStartPrompt() {
  return [
    '请帮我安装和配置 Knowledge Forge。',
    '',
    '这是一个 Agent-first 的本地知识摄入与学习工作台，推荐 Full Setup：',
    '- Local Forge 本地资料整理',
    '- Final Exam Review 期末复习增强',
    '- Obsidian Bridge 长期知识库写入',
    '- NotebookLM Bridge 深度阅读桥接',
    '',
    '请先阅读仓库里的 AGENTS.md、FEATURES.md、SETUP.md，然后：',
    '1. 先运行 .\doctor.ps1 或 .\scripts\doctor.ps1 检查环境。',
    '2. 推荐执行 .\setup.ps1 -Full。',
    '3. 执行 .\configure.ps1 -Full，生成/确认 .env.local 和 knowledge-forge.config.json。',
    '4. 启动 .\start.ps1，或双击 start.bat。',
    '5. 运行 .\verify.ps1 -Smoke -StartServer。',
    '6. 告诉我哪些能力已经可用，哪些还需要我手动登录或配置。',
    '',
    '安全要求：不要询问或保存我的 Google 密码；不要提交 .env.local、cookies、NotebookLM storage_state.json 或私人资料。',
  ].join('\n');
}

function getNotebookLmActions(connected = false) {
  return [
    { id: 'auth-check', label: '检查登录状态', available: true, output: 'status' },
    { id: 'open-login', label: '打开 NotebookLM 登录', available: true, requiresConfirmation: true, output: 'browser' },
    { id: 'write-sample-digest', label: '写入示例记录到 Obsidian Inbox', available: true, requiresConfirmation: true, output: 'markdown' },
    { id: 'create-notebook', label: '创建 Notebook', available: connected, requiresConnection: true, output: 'notebooklm', reason: connected ? undefined : 'NotebookLM 尚未连接或登录态已失效' },
    { id: 'add-source', label: '添加 Source', available: connected, requiresConnection: true, output: 'notebooklm', reason: connected ? undefined : 'NotebookLM 尚未连接或登录态已失效' },
    { id: 'ask', label: '提问生成 Digest', available: connected, requiresConnection: true, output: 'markdown', reason: connected ? undefined : 'NotebookLM 尚未连接或登录态已失效' },
  ];
}

function getLocalForgeActions() {
  return [
    { id: 'summary', label: '生成摘要', description: '基于本地规则摘要生成可复习 Markdown。', available: true, output: 'markdown' },
    { id: 'study-guide', label: '生成学习指南', description: '生成学习目标、重点概念、复习路径。', available: true, output: 'markdown' },
    { id: 'quiz', label: '生成测验题', description: '生成选择题/简答题草稿。', available: true, output: 'markdown' },
    { id: 'flashcards', label: '生成闪卡', description: '生成 Q/A 卡片，可后续导出 Anki。', available: true, output: 'markdown' },
    { id: 'final-exam-review', label: '期末复习包', description: '生成复习计划、考点清单、速记卡和临考行动表。', available: true, output: 'markdown', skillRepo: 'https://github.com/577206/final-exam-review-skill' },
    { id: 'pdf', label: '导出 PDF', description: '将 Markdown 通过 Pandoc + Chrome/Edge 渲染为真实 PDF 文件。', available: Boolean(findChromeExecutable()), reason: findChromeExecutable() ? undefined : '需要安装 Chrome 或 Edge', output: 'pdf' },
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

  if (action === 'final-exam-review') {
    const coreItems = (keywords.length ? keywords : headings).slice(0, 12);
    const questionStems = (headings.length ? headings : keywords).slice(0, 8);
    return {
      title: `Final Exam Review - ${title}`,
      content: [
        `# Final Exam Review - ${title}`,
        '',
        '> 生成方式：agent-assisted local draft；参考 final-exam-review-skill 工作流。请结合课程大纲、考试时间和往年题继续复核。',
        '',
        '## 1. 复习优先级',
        ...(coreItems.length ? coreItems.slice(0, 8).map((item, index) => `- P${index < 3 ? 0 : index < 6 ? 1 : 2}：${item}`) : ['- P0：先补充课程大纲和考试范围。']),
        '',
        '## 2. 三轮复习计划',
        '### 第一轮：建图（理解）',
        '- 通读资料，按章节/主题建立知识地图。',
        '- 标记不懂概念，优先补 P0 项。',
        '### 第二轮：刷题（应用）',
        '- 用 Quiz/Flashcards 检查概念是否能主动回忆。',
        '- 把错题回链到原始笔记。',
        '### 第三轮：冲刺（输出）',
        '- 只看公式/定义/易错点/高频题型。',
        '- 用 30 分钟模拟讲解整门课。',
        '',
        '## 3. 考点清单',
        ...(questionStems.length ? questionStems.map((item) => `- [ ] ${item}`) : ['- [ ] 待从课程大纲补充']),
        '',
        '## 4. 临考速记卡',
        ...(coreItems.slice(0, 8).map((item) => `- **${item}**：定义 / 公式 / 例题 / 易错点（待补充）`)),
        '',
        '## 5. 模拟自测题',
        ...(questionStems.slice(0, 6).map((item, index) => `${index + 1}. 请用自己的话解释「${item}」，并说明它可能如何出题。`)),
        '',
        '## 6. 需要你补充给 Agent 的信息',
        '- [ ] 课程名称',
        '- [ ] 考试时间',
        '- [ ] 课程大纲 / lecture list',
        '- [ ] 往年题 / 样题',
        '- [ ] 老师强调过的重点',
      ].join('\n'),
    };
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

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function pandocHtmlTemplate(title, body = '') {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<script>
  window.MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
      displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
      processEscapes: true,
      processEnvironments: true
    },
    svg: { fontCache: 'global' },
    startup: { typeset: true }
  };
</script>
<script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js"></script>
<style>
  body { font-family: "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif; max-width: 920px; margin: 36px auto; line-height: 1.72; color: #111827; }
  h1, h2, h3 { line-height: 1.25; color: #0f172a; }
  h1 { border-bottom: 3px solid #f59e0b; padding-bottom: 12px; }
  h2 { margin-top: 34px; border-left: 6px solid #f59e0b; padding-left: 12px; }
  code, pre { font-family: "Cascadia Code", Consolas, monospace; }
  pre { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; white-space: pre-wrap; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  th, td { border: 1px solid #d1d5db; padding: 8px 10px; }
  th { background: #f3f4f6; }
  blockquote { border-left: 4px solid #93c5fd; margin: 16px 0; padding: 8px 14px; background: #eff6ff; color: #1e3a8a; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

async function exportMarkdownToPdf({ title, markdown, sourcePath }) {
  const safeTitle = String(title || 'Knowledge Forge PDF').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Knowledge Forge PDF';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const base = `${stamp}-${safeTitle}`;
  const tmpMd = path.join(pdfDir, `${base}.md`);
  const tmpHtml = path.join(pdfDir, `${base}.html`);
  const pdfPath = path.join(pdfDir, `${base}.pdf`);
  await fsp.writeFile(tmpMd, markdown, 'utf8');

  let htmlBody = '';
  await execFileText('pandoc', [
    tmpMd,
    '--from', 'markdown+tex_math_dollars+tex_math_single_backslash+pipe_tables+fenced_code_blocks',
    '--to', 'html5',
    '--standalone',
    '--mathjax=https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js',
    '--metadata', `title=${title}`,
    '--output', tmpHtml,
  ], { timeout: 120000, maxBuffer: 20 * 1024 * 1024 });
  try {
    htmlBody = await fsp.readFile(tmpHtml, 'utf8');
  } catch {
    htmlBody = pandocHtmlTemplate(title, `<pre>${String(markdown).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]))}</pre>`);
    await fsp.writeFile(tmpHtml, htmlBody, 'utf8');
  }

  const chrome = findChromeExecutable();
  if (!chrome) {
    const error = new Error('未找到 Chrome/Edge，无法打印 PDF。请安装 Chrome，或只保留 Markdown 输出。');
    error.statusCode = 501;
    throw error;
  }
  await execFileText(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--virtual-time-budget=5000',
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(tmpHtml).href,
  ], { timeout: 120000, maxBuffer: 20 * 1024 * 1024 });

  const stat = await fsp.stat(pdfPath);
  const record = await recordArtifact({
    title: `PDF - ${title}`,
    capability: 'pdf-export',
    action: 'pdf',
    engine: 'pandoc+chrome',
    artifactPath: toVaultRelative(pdfPath),
    fullPath: pdfPath,
    sourcePath,
    status: 'ready',
    reviewRequired: false,
  });
  return {
    title: `PDF - ${title}`,
    pdfPath,
    pdfRelativePath: toVaultRelative(pdfPath),
    sizeBytes: stat.size,
    artifactRecord: record,
  };
}

async function writeInboxArtifact(title, content, meta = {}) {
  const inboxDir = safeVaultPath('inbox');
  await fsp.mkdir(inboxDir, { recursive: true });
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Knowledge Forge Artifact';
  const fileName = `${new Date().toISOString().slice(0, 10)} - ${safeTitle}.md`;
  const fullPath = path.join(inboxDir, fileName);
  const body = `---\ntitle: ${JSON.stringify(title)}\ntype: generated-artifact\nstatus: inbox\ncreated: ${new Date().toISOString()}\ngenerator: knowledge-forge-local\n---\n\n${content}\n`;
  await fsp.writeFile(fullPath, body, 'utf8');
  const artifactPath = toVaultRelative(fullPath);
  const artifactRecord = await recordArtifact({
    title,
    artifactPath,
    fullPath,
    obsidianUri: makeObsidianOpenUri(fullPath),
    ...meta,
  });
  return {
    artifactPath,
    fullPath,
    obsidianUri: makeObsidianOpenUri(fullPath),
    artifactRecord,
  };
}

async function handlePdfExport(req, res) {
  try {
    const body = await readJsonBody(req);
    let title = String(body.title || 'Knowledge Forge PDF').trim();
    let markdown = String(body.markdown || '').trim();
    let sourcePath = body.sourcePath;
    if (!markdown && body.notePath) {
      const note = await readVaultNote(body.notePath);
      title = title || note.title;
      markdown = note.content;
      sourcePath = note.path;
    }
    if (!markdown) return sendJson(res, 400, { ok: false, error: '缺少可导出的 Markdown 内容' });
    const pdf = await exportMarkdownToPdf({ title, markdown, sourcePath });
    return sendJson(res, 200, { ok: true, ...pdf, recentArtifacts: await listArtifacts(20) });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { ok: false, error: error.message });
  }
}

async function handleLocalForgeGenerate(req, res) {
  try {
    const body = await readJsonBody(req);
    const action = String(body.action || '').trim();
    if (!action) return sendJson(res, 400, { ok: false, error: 'Missing action' });
    if (!body.notePath) return sendJson(res, 400, { ok: false, error: 'Missing notePath' });
    const note = await readVaultNote(body.notePath);
    if (action === 'pdf') {
      const pdf = await exportMarkdownToPdf({ title: `PDF - ${note.title}`, markdown: note.content, sourcePath: note.path });
      return sendJson(res, 200, { ok: true, action, title: pdf.title, format: 'pdf', ...pdf, recentInbox: await listInbox(20) });
    }
    const artifact = buildLocalForgeArtifact(action, note);
    const writeResult = body.writeToInbox === false ? null : await writeInboxArtifact(artifact.title, artifact.content, {
      capability: 'local-forge',
      action,
      engine: 'local-rules',
      sourceNotePath: note.path,
      sourceTitle: note.title,
    });
    return sendJson(res, 200, {
      ok: true,
      action,
      title: artifact.title,
      format: 'markdown',
      content: artifact.content,
      artifactPath: writeResult?.artifactPath,
      artifactRecord: writeResult?.artifactRecord,
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
      const title = body.title || 'NotebookLM 示例记录';
      const content = [
        `# ${title}`,
        '',
        '## 当前状态',
        '- 这是本地示例记录，用来验证 NotebookLM → Forge → Obsidian 的写回链路。',
        '- 它不会自动替你操作 Google，也不会读取你的 NotebookLM 私人资料。',
        '- 当前稳定模式：用户在 NotebookLM 手动生成内容，再粘贴回 Forge 捕捉。',
        '',
        '## 下一步',
        '- [ ] 在 NotebookLM 中手动上传 source 并生成摘要/学习指南/测验题。',
        '- [ ] 复制生成结果，回到 Forge 使用「粘贴捕捉」。',
        '- [ ] 人工复核后再从 inbox 提升到长期知识库。',
      ].join('\n');
      const writeResult = await writeInboxArtifact(title, content, {
        capability: 'notebooklm',
        action: 'write-sample-digest',
        engine: 'notebooklm-manual-demo',
        notebookLink: body.notebookLink || null,
        requestedOutputs: body.requestedOutputs || [],
      });
      return sendJson(res, 200, { ok: true, action, status: 'completed', title, format: 'markdown', content, ...writeResult, recentInbox: await listInbox(20) });
    }

    if (action === 'capture-paste') {
      const pasted = String(body.content || '').trim();
      if (!pasted) return sendJson(res, 400, { ok: false, error: 'Missing NotebookLM pasted content' });
      const outputType = String(body.outputType || 'digest').trim();
      const title = String(body.title || `NotebookLM Capture - ${outputType}`).trim().slice(0, 120);
      const notebookLink = body.notebookLink || null;
      const content = [
        `# ${title}`,
        '',
        '## Capture metadata',
        '- Source: NotebookLM manual capture',
        `- Output type: ${outputType}`,
        `- Notebook link: ${notebookLink || 'not provided'}`,
        `- Captured at: ${new Date().toISOString()}`,
        '- Review required: true',
        '',
        '## NotebookLM output',
        '',
        pasted,
        '',
        '## Agent review checklist',
        '',
        '- [ ] 核对重要事实是否能在原始 source 中找到。',
        '- [ ] 把关键概念改成 Obsidian 双链。',
        '- [ ] 标记不确定点和后续问题。',
        '- [ ] 复核后再从 inbox 晋升到正式知识库。',
      ].join('\n');
      const writeResult = await writeInboxArtifact(title, content, {
        capability: 'notebooklm',
        action: 'capture-paste',
        engine: 'notebooklm-manual-capture',
        notebookLink,
        outputType,
      });
      return sendJson(res, 200, { ok: true, action, status: 'completed', title, outputType, format: 'markdown', content, ...writeResult, recentInbox: await listInbox(20) });
    }

    return sendJson(res, 501, { ok: false, action, error: '这个 NotebookLM 自动动作尚未接入。当前已实现：检查登录、打开登录、写入示例记录、粘贴捕捉。', implementedActions: ['auth-check', 'open-login', 'write-sample-digest', 'capture-paste'] });
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
  if (req.method === 'GET' && url.pathname === '/api/staging') {
    try {
      const limit = Number(url.searchParams.get('limit') || 30);
      return sendJson(res, 200, { ok: true, vaultPath: DEFAULT_VAULT_PATH, items: await listStaging(limit) });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/staging/item') {
    try {
      return sendJson(res, 200, { ok: true, item: await readStagingItem(url.searchParams.get('id')) });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: error.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/staging/approve') {
    try {
      const body = await readJsonBody(req);
      const approved = await approveStaged(body.id, { vaultPath: DEFAULT_VAULT_PATH, title: body.title, content: body.content });
      return sendJson(res, 200, {
        ok: true,
        notePath: toPortablePath(approved.notePath),
        noteRelativePath: toVaultRelative(approved.notePath),
        obsidianUri: makeObsidianOpenUri(approved.notePath),
        recentInbox: await listInbox(20),
        stagingQueue: await listStaging(20),
      });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: error.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/staging/reject') {
    try {
      const body = await readJsonBody(req);
      await rejectStaged(body.id, { vaultPath: DEFAULT_VAULT_PATH, reason: body.reason });
      return sendJson(res, 200, { ok: true, stagingQueue: await listStaging(20) });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: error.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/vault/open') {
    try {
      const body = await readJsonBody(req);
      const target = body.path ? safeVaultPath(body.path) : DEFAULT_VAULT_PATH;
      const stat = await fsp.stat(target).catch(() => null);
      const mode = body.mode || 'open';
      if (mode === 'reveal' && stat?.isFile()) {
        revealLocalPath(target);
        return sendJson(res, 200, { ok: true, mode: 'reveal', opened: target });
      }
      if (stat?.isFile()) {
        openLocalFile(target);
        return sendJson(res, 200, { ok: true, mode: 'file', opened: target });
      }
      openLocalPath(target);
      return sendJson(res, 200, { ok: true, mode: 'folder', opened: target });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: error.message });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/obsidian/status') {
    try {
      return sendJson(res, 200, { ok: true, ...(await getObsidianStatus()) });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/obsidian/open') {
    try {
      const body = await readJsonBody(req);
      const target = body.path ? safeVaultPath(body.path) : DEFAULT_VAULT_PATH;
      const opened = await openObsidianPath(target, body.method || 'protocol');
      return sendJson(res, 200, {
        ok: true,
        vaultPath: DEFAULT_VAULT_PATH,
        ...opened,
      });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: error.message });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/agent/quick-start') {
    return sendJson(res, 200, {
      ok: true,
      recommendedSetup: 'full',
      repoUrl: 'https://github.com/577206/knowledge-forge',
      prompt: getAgentQuickStartPrompt(),
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/agent/current') {
    try {
      return sendJson(res, 200, await detectCurrentAgent());
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/capabilities') {
    try {
      return sendJson(res, 200, { ok: true, recommendedSetup: 'full', capabilities: await getCapabilities() });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/artifacts') {
    try {
      const limit = Number(url.searchParams.get('limit') || 40);
      return sendJson(res, 200, { ok: true, artifacts: await listArtifacts(limit) });
    } catch (error) {
      return sendJson(res, 500, { ok: false, error: error.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/artifacts/save') {
    try {
      const body = await readJsonBody(req);
      const title = String(body.title || 'Knowledge Forge Agent Output').trim();
      const content = String(body.content || '').trim();
      if (!content) return sendJson(res, 400, { ok: false, error: 'Missing content' });
      const writeResult = await writeInboxArtifact(title, content, {
        capability: 'computer-agent',
        action: body.action || 'manual-save',
        engine: body.engine || 'unknown',
        sourceTitle: body.sourceTitle,
        sourceAgentPack: body.sourceAgentPack,
        sourceAgentPacks: body.sourceAgentPacks,
        command: body.command,
        savedByUser: true,
      });
      return sendJson(res, 200, { ok: true, title, ...writeResult, recentInbox: await listInbox(20) });
    } catch (error) {
      return sendJson(res, 400, { ok: false, error: error.message });
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/local-forge/actions') {
    return sendJson(res, 200, { ok: true, actions: getLocalForgeActions() });
  }
  if (req.method === 'POST' && url.pathname === '/api/local-forge/generate') {
    return handleLocalForgeGenerate(req, res);
  }
  if (req.method === 'POST' && url.pathname === '/api/pdf/export') {
    return handlePdfExport(req, res);
  }
  if (req.method === 'POST' && url.pathname === '/api/agent/run') {
    try {
      const body = await readJsonBody(req);
      if (!body.packDir) return sendJson(res, 400, { ok: false, error: 'Missing packDir' });
      const result = await runComputerAgentOnPack({
        packDir: body.packDir,
        engine: body.engine || 'claude',
        outputType: body.outputType || 'final-exam-review',
        customPrompt: body.customPrompt,
        taskPrompt: body.taskPrompt,
      });
      return sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        ok: false,
        error: error.message,
        stderr: error.stderr,
        stdout: error.stdout,
        hint: 'Make sure Claude Code or Codex is installed and configured on this computer.',
      });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/agent/open-terminal') {
    try {
      const body = await readJsonBody(req);
      const result = await openExternalAgentTerminal({
        packDir: body.packDir,
        packDirs: Array.isArray(body.packDirs) ? body.packDirs : [],
        engine: body.engine || 'claude',
        mode: body.mode || 'separate',
      });
      return sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, { ok: false, error: error.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/agent/run-batch') {
    try {
      const body = await readJsonBody(req);
      if (!Array.isArray(body.packDirs) || !body.packDirs.length) return sendJson(res, 400, { ok: false, error: 'Missing packDirs' });
      const result = await runComputerAgentOnBatch({
        packDirs: body.packDirs,
        engine: body.engine || 'claude',
        outputType: body.outputType || 'final-exam-review',
        customPrompt: body.customPrompt,
        taskPrompt: body.taskPrompt,
      });
      return sendJson(res, 200, { ok: true, ...result });
    } catch (error) {
      return sendJson(res, error.statusCode || 500, {
        ok: false,
        error: error.message,
        stderr: error.stderr,
        stdout: error.stdout,
        hint: 'Make sure Claude Code or Codex is installed and configured on this computer.',
      });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/notebooklm/action') {
    return sendJson(res, 503, { ok: false, error: 'NotebookLM Bridge 正在测试中，即将上线。当前发布版暂不开放。' });
  }
  if (req.method === 'GET' && url.pathname === '/api/notebooklm/status') {
    return sendJson(res, 200, {
      ok: true,
      installed: false,
      connected: false,
      status: 'testing',
      message: 'NotebookLM Bridge 正在测试中，即将上线。当前发布版暂不开放。',
      actions: [],
      safety: {
        unavailableInThisRelease: true,
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
