const health = document.getElementById('health');
const vaultPath = document.getElementById('vaultPath');
const homeView = document.getElementById('homeView');
const localView = document.getElementById('localView');
const notebookView = document.getElementById('notebookView');
const dropzone = document.getElementById('dropzone');
const input = document.getElementById('fileInput');
const pickBtn = document.getElementById('pickBtn');
const selectedFileName = document.getElementById('selectedFileName');
const result = document.getElementById('result');
const summary = document.getElementById('summary');
const artifacts = document.getElementById('artifacts');
const fields = document.getElementById('fields');
const inboxList = document.getElementById('inboxList');
const refreshInboxBtn = document.getElementById('refreshInboxBtn');
const openVaultBtn = document.getElementById('openVaultBtn');
const openVaultFromHomeBtn = document.getElementById('openVaultFromHomeBtn');
const selectedActions = document.getElementById('selectedActions');
const localActions = document.getElementById('localActions');
const runSelectedActionsBtn = document.getElementById('runSelectedActionsBtn');
const refreshNotebookLmBtn = document.getElementById('refreshNotebookLmBtn');
const connectNotebookLmBtn = document.getElementById('connectNotebookLmBtn');
const notebookLmStatus = document.getElementById('notebookLmStatus');
const notebookActions = document.getElementById('notebookActions');
const notebookLink = document.getElementById('notebookLink');
const writeNotebookDemoBtn = document.getElementById('writeNotebookDemoBtn');
const notebookActionResult = document.getElementById('notebookActionResult');
const capabilityCenter = document.getElementById('capabilityCenter');
const artifactRegistry = document.getElementById('artifactRegistry');
const refreshCapabilitiesBtn = document.getElementById('refreshCapabilitiesBtn');
const refreshArtifactsBtn = document.getElementById('refreshArtifactsBtn');
const agentPromptBox = document.getElementById('agentPromptBox');
const copyAgentPromptBtn = document.getElementById('copyAgentPromptBtn');
const notebookCaptureTitle = document.getElementById('notebookCaptureTitle');
const notebookOutputType = document.getElementById('notebookOutputType');
const notebookCaptureText = document.getElementById('notebookCaptureText');
const captureNotebookPasteBtn = document.getElementById('captureNotebookPasteBtn');

const actionLabels = {
  summary: 'Summary',
  'study-guide': 'Study Guide',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  pdf: 'PDF',
  'final-exam-review': 'Final Exam Review',
  'mind-map': 'Mind Map',
};

let latestVaultPath = '';
let currentNotePath = '';
let currentTitle = '';

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
}


function statusLabel(status) {
  return {
    ready: '可用',
    disabled: '未启用',
    needs_config: '待配置',
    needs_login: '待登录',
    needs_install: '待安装',
  }[status] || status || '未知';
}

function statusClass(status) {
  if (status === 'ready') return 'ready';
  if (status === 'disabled') return 'disabled';
  return 'warning';
}


async function loadAgentPrompt() {
  if (!agentPromptBox) return;
  try {
    const res = await fetch('/api/agent/quick-start');
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Agent prompt failed');
    agentPromptBox.textContent = data.prompt;
  } catch (error) {
    agentPromptBox.textContent = `Agent 启动提示词加载失败：${error.message}`;
  }
}

async function loadCapabilities() {
  if (!capabilityCenter) return;
  capabilityCenter.innerHTML = '<p class="muted-light">正在加载能力状态...</p>';
  try {
    const res = await fetch('/api/capabilities');
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Capabilities failed');
    capabilityCenter.innerHTML = data.capabilities.map((cap) => `
      <article class="capability-card ${statusClass(cap.status)}">
        <div class="capability-head">
          <strong>${escapeHtml(cap.label)}</strong>
          <span>${escapeHtml(statusLabel(cap.status))}</span>
        </div>
        <p>${escapeHtml(cap.description)}</p>
        ${cap.skillRepo ? `<small>Skill: ${escapeHtml(cap.skillRepo)}</small>` : ''}
        ${cap.details?.vaultPath ? `<small>Vault: ${escapeHtml(cap.details.vaultPath)}</small>` : ''}
        ${cap.details?.message ? `<small>${escapeHtml(cap.details.message)}</small>` : ''}
      </article>
    `).join('');
  } catch (error) {
    capabilityCenter.innerHTML = `<p class="muted-light">能力状态加载失败：${escapeHtml(error.message)}</p>`;
  }
}

async function loadArtifacts() {
  if (!artifactRegistry) return;
  try {
    const res = await fetch('/api/artifacts?limit=12');
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Artifacts failed');
    if (!data.artifacts.length) {
      artifactRegistry.innerHTML = '<p class="muted-light">还没有生成记录。</p>';
      return;
    }
    artifactRegistry.innerHTML = data.artifacts.map((item) => `
      <article class="registry-item">
        <div>
          <strong>${escapeHtml(item.title || item.action || 'Artifact')}</strong>
          <span>${escapeHtml(item.engine || 'unknown')}</span>
        </div>
        <small>${escapeHtml(item.capability || '')} · ${escapeHtml(formatTime(item.createdAt))}</small>
        <small>${escapeHtml(item.artifactPath || '')}</small>
        <div class="registry-actions">
          ${item.artifactPath ? `<button type="button" data-preview="${escapeHtml(item.artifactPath)}">预览</button>` : ''}
          ${item.artifactPath ? `<button type="button" data-open-obsidian="${escapeHtml(item.artifactPath)}">Obsidian</button>` : ''}
          ${item.artifactPath ? `<button type="button" data-copy-path="${escapeHtml(item.artifactPath)}">复制路径</button>` : ''}
        </div>
      </article>
    `).join('');
  } catch (error) {
    artifactRegistry.innerHTML = `<p class="muted-light">生成记录加载失败：${escapeHtml(error.message)}</p>`;
  }
}

async function openObsidian(relativePath = '', method = 'protocol') {
  const res = await fetch('/api/obsidian/open', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: relativePath, method }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Open Obsidian failed');
  return data;
}

function showView(name) {
  homeView.hidden = name !== 'home';
  localView.hidden = name !== 'local';
  notebookView.hidden = name !== 'notebook';
  if (name === 'local') refreshInbox();
  if (name === 'notebook') checkNotebookLmStatus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Health check failed');
    latestVaultPath = data.vaultPath;
    health.textContent = '服务在线';
    health.className = 'status-dot online';
    vaultPath.textContent = data.vaultPath;
  } catch (error) {
    health.textContent = `服务异常：${error.message}`;
    health.className = 'status-dot offline';
    vaultPath.textContent = 'Vault 未连接';
  }
}

async function notebookLmAction(action, body = {}) {
  const res = await fetch('/api/notebooklm/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || data.message || `${action} failed`);
  return data;
}

async function checkNotebookLmStatus() {
  notebookLmStatus.textContent = '正在检查 NotebookLM 连接...';
  notebookLmStatus.className = 'bridge-status muted';
  try {
    const res = await fetch('/api/notebooklm/status');
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'NotebookLM status check failed');
    const label = data.connected ? '已连接' : data.installed ? '需要登录' : '未安装';
    const next = data.connected
      ? 'NotebookLM Bridge 可用。可以继续生成示例 Digest，或在后端接入 create-notebook/add-source/ask。'
      : data.installed
        ? '点击「连接 Google NotebookLM」打开 Chrome 登录，完成后重新检查。'
        : '请先按 README 安装 notebooklm-py。';
    notebookLmStatus.className = `bridge-status ${data.connected ? 'connected' : data.installed ? 'warning' : 'error'}`;
    notebookLmStatus.innerHTML = `
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(data.message || '')}</span>
      <small>${escapeHtml(next)}</small>
    `;
  } catch (error) {
    notebookLmStatus.className = 'bridge-status error';
    notebookLmStatus.textContent = `检查失败：${error.message}`;
  }
}

function getCheckedValues(container) {
  return [...container.querySelectorAll('input:checked')].map((inputEl) => inputEl.value);
}

function getSelectedLocalActions() {
  return getCheckedValues(localActions);
}

function updateSelectedActions() {
  const actions = getSelectedLocalActions();
  selectedActions.textContent = actions.length ? actions.map((action) => actionLabels[action] || action).join(' / ') : '未选择输出动作';
  runSelectedActionsBtn.disabled = !currentNotePath || actions.length === 0;
}

function renderList(items, empty = '暂无') {
  if (!items?.length) return `<p class="muted">${escapeHtml(empty)}</p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function renderMarkdownPreview(markdown = '') {
  const lines = String(markdown || '').split('\n').slice(0, 90);
  if (!lines.join('').trim()) return '<p class="muted">暂无 Markdown 预览。</p>';
  return `<div class="markdown-preview">${lines.map((line) => {
    if (/^###\s+/.test(line)) return `<h5>${escapeHtml(line.replace(/^###\s+/, ''))}</h5>`;
    if (/^##\s+/.test(line)) return `<h4>${escapeHtml(line.replace(/^##\s+/, ''))}</h4>`;
    if (/^#\s+/.test(line)) return `<h3>${escapeHtml(line.replace(/^#\s+/, ''))}</h3>`;
    if (/^[-*]\s+/.test(line)) return `<p class="bullet">• ${escapeHtml(line.replace(/^[-*]\s+/, ''))}</p>`;
    if (/^\d+\.\s+/.test(line)) return `<p class="bullet">${escapeHtml(line)}</p>`;
    if (!line.trim()) return '<br />';
    return `<p>${escapeHtml(line)}</p>`;
  }).join('')}</div>`;
}

function formatTime(iso) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

async function refreshInbox(notesFromUpload) {
  try {
    const notes = notesFromUpload || (await (await fetch('/api/vault/inbox?limit=12')).json()).notes || [];
    if (!notes.length) {
      inboxList.innerHTML = '<p class="muted">Inbox 里还没有笔记。</p>';
      return;
    }
    inboxList.innerHTML = notes.map((note) => `
      <article class="inbox-item">
        <strong>${escapeHtml(note.title)}</strong>
        <small>${escapeHtml(note.path)}</small>
        <span>${escapeHtml(formatTime(note.modifiedAt))} · ${Math.ceil(note.size / 1024)} KB</span>
        <div class="inbox-actions"><a href="${escapeHtml(note.obsidianUri)}">Obsidian</a><button data-preview="${escapeHtml(note.path)}" type="button">预览</button></div>
      </article>
    `).join('');
  } catch (error) {
    inboxList.innerHTML = `<p class="muted">Inbox 加载失败：${escapeHtml(error.message)}</p>`;
  }
}

async function openVaultPath(relativePath = '') {
  const res = await fetch('/api/vault/open', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: relativePath }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || 'Open vault failed');
}

async function previewNote(relativePath) {
  const res = await fetch(`/api/vault/note?path=${encodeURIComponent(relativePath)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Preview failed');
  currentNotePath = data.note.path;
  currentTitle = data.note.title;
  selectedFileName.textContent = `已选择 inbox 笔记：${data.note.title}`;
  showResult({ ok: true, kind: 'vault-note', title: data.note.title, noteRelativePath: data.note.path, obsidianUri: data.note.obsidianUri, noteContent: data.note.content, parsed: { markdown: data.note.content } });
  showView('local');
}

function showResult(data) {
  result.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  if (!data?.ok) {
    summary.textContent = typeof data === 'string' ? data : '等待上传...';
    fields.innerHTML = '';
    artifacts.innerHTML = '';
    return;
  }

  currentNotePath = data.noteRelativePath || currentNotePath;
  currentTitle = data.title || currentTitle;
  updateSelectedActions();

  const analysis = data.analysis || data.parsed?.analysis || {};
  summary.innerHTML = `
    <div class="success-box">
      <strong>${escapeHtml(data.title)}</strong>
      <p>${escapeHtml(data.noteRelativePath || data.notePath || '')}</p>
      <p class="muted">基础 inbox 笔记已就绪。下一步可生成：${escapeHtml(getSelectedLocalActions().map((action) => actionLabels[action] || action).join(' / ') || '无')}</p>
      ${data.obsidianUri ? `<a href="${escapeHtml(data.obsidianUri)}">在 Obsidian 打开</a>` : ''}
    </div>
    <section><h3>摘要</h3>${renderList(analysis.summary, '暂无摘要。')}</section>
    <section><h3>Markdown 预览</h3>${renderMarkdownPreview(data.parsed?.markdown || data.noteContent || '')}</section>
  `;

  if (data.kind === 'data') {
    const sheets = data.parsed?.workbook?.sheets || [];
    fields.innerHTML = `<section><h3>Excel 字段映射</h3>${sheets.map((sheet) => `<div class="sheet"><strong>${escapeHtml(sheet.sheetName)}</strong><p>${sheet.rowCount} 行 · ${sheet.columnCount} 列 · ${escapeHtml(sheet.businessType)}</p></div>`).join('')}</section>`;
  } else {
    fields.innerHTML = '';
  }
}

async function upload(file) {
  if (!file) return;
  selectedFileName.textContent = file.name;
  showResult(`正在锻造：${file.name} ...`);
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch('/api/ingest', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    showResult(data);
    await refreshInbox(data.recentInbox);
    await runSelectedLocalActions();
  } catch (error) {
    showResult(`失败：${error.message}`);
  }
}

async function generateLocalArtifact(action) {
  const res = await fetch('/api/local-forge/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, notePath: currentNotePath, writeToInbox: true }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || `${action} failed`);
  return data;
}

async function runSelectedLocalActions() {
  const actions = getSelectedLocalActions();
  if (!currentNotePath || !actions.length) return;

  runSelectedActionsBtn.disabled = true;
  runSelectedActionsBtn.textContent = '生成中...';
  artifacts.innerHTML = '<p class="muted">正在生成勾选动作...</p>';

  const outputs = [];
  for (const action of actions) {
    try {
      const data = await generateLocalArtifact(action);
      outputs.push({ ok: true, action, data });
    } catch (error) {
      outputs.push({ ok: false, action, error: error.message });
    }
  }

  artifacts.innerHTML = outputs.map((item) => {
    if (!item.ok) {
      return `<article class="artifact-item error"><strong>${escapeHtml(actionLabels[item.action] || item.action)}</strong><p>${escapeHtml(item.error)}</p></article>`;
    }
    return `
      <article class="artifact-item">
        <div><strong>${escapeHtml(actionLabels[item.action] || item.action)}</strong><small>${escapeHtml(item.data.artifactPath || '未写入文件')}</small></div>
        ${item.data.obsidianUri ? `<a href="${escapeHtml(item.data.obsidianUri)}">Obsidian</a>` : ''}
        ${item.data.artifactPath ? `<button class="copy-btn" type="button" data-copy-path="${escapeHtml(item.data.artifactPath)}">复制路径</button>` : ''}
        ${renderMarkdownPreview(item.data.content || '')}
      </article>
    `;
  }).join('');

  const latestInbox = outputs.find((item) => item.ok && item.data.recentInbox)?.data.recentInbox;
  if (latestInbox) await refreshInbox(latestInbox);
  await loadArtifacts();
  await loadCapabilities();
  runSelectedActionsBtn.textContent = '生成勾选动作';
  updateSelectedActions();
}

function selectedNotebookActionLabels() {
  return getCheckedValues(notebookActions).map((action) => actionLabels[action] || action);
}


document.addEventListener('click', async (event) => {
  const copyBtn = event.target.closest('.copy-btn[data-copy-path]');
  if (!copyBtn) return;
  await navigator.clipboard?.writeText(copyBtn.dataset.copyPath);
  copyBtn.textContent = '已复制';
});

for (const card of document.querySelectorAll('[data-route]')) {
  card.addEventListener('click', () => showView(card.dataset.route));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      showView(card.dataset.route);
    }
  });
}
for (const button of document.querySelectorAll('[data-back]')) {
  button.addEventListener('click', () => showView('home'));
}

pickBtn.addEventListener('click', () => input.click());
input.addEventListener('change', () => upload(input.files[0]));
refreshInboxBtn.addEventListener('click', () => refreshInbox());
openVaultBtn.addEventListener('click', () => openVaultPath('').catch((error) => showResult(`失败：${error.message}`)));
openVaultFromHomeBtn.addEventListener('click', () => openVaultPath('').catch((error) => { health.textContent = `打开失败：${error.message}`; health.className = 'status-dot offline'; }));
refreshNotebookLmBtn.addEventListener('click', () => checkNotebookLmStatus());
copyAgentPromptBtn?.addEventListener('click', async () => {
  await navigator.clipboard?.writeText(agentPromptBox.textContent || '');
  copyAgentPromptBtn.textContent = '已复制';
  setTimeout(() => { copyAgentPromptBtn.textContent = '复制提示词'; }, 1400);
});
refreshCapabilitiesBtn?.addEventListener('click', () => loadCapabilities());
refreshArtifactsBtn?.addEventListener('click', () => loadArtifacts());
connectNotebookLmBtn.addEventListener('click', async () => {
  notebookActionResult.textContent = '正在打开 NotebookLM 登录...';
  try {
    const data = await notebookLmAction('open-login');
    notebookActionResult.textContent = data.message || '已打开登录流程，完成后点击检查连接。';
  } catch (error) {
    notebookActionResult.textContent = `连接失败：${error.message}`;
  }
});

captureNotebookPasteBtn?.addEventListener('click', async () => {
  const content = notebookCaptureText.value.trim();
  if (!content) {
    notebookActionResult.textContent = '请先粘贴 NotebookLM 输出内容。';
    return;
  }
  captureNotebookPasteBtn.disabled = true;
  captureNotebookPasteBtn.textContent = '正在写入...';
  notebookActionResult.textContent = '正在捕捉 NotebookLM 输出并写入 Obsidian inbox...';
  try {
    const data = await notebookLmAction('capture-paste', {
      title: notebookCaptureTitle.value || `NotebookLM Capture - ${notebookOutputType.value}`,
      outputType: notebookOutputType.value,
      notebookLink: notebookLink.value,
      content,
    });
    notebookActionResult.innerHTML = `<strong>${escapeHtml(data.title)}</strong><p>${escapeHtml(data.artifactPath || '')}</p>${data.obsidianUri ? `<a href="${escapeHtml(data.obsidianUri)}">在 Obsidian 打开</a>` : ''}`;
    notebookCaptureText.value = '';
    await refreshInbox(data.recentInbox);
    await loadArtifacts();
    await loadCapabilities();
  } catch (error) {
    notebookActionResult.textContent = `捕捉失败：${error.message}`;
  } finally {
    captureNotebookPasteBtn.disabled = false;
    captureNotebookPasteBtn.textContent = '捕捉并写入 Obsidian';
  }
});

writeNotebookDemoBtn.addEventListener('click', async () => {
  const actions = selectedNotebookActionLabels();
  const title = `NotebookLM Demo Digest - ${actions.join(', ') || 'Summary'}`;
  notebookActionResult.textContent = '正在写入示例 Digest...';
  try {
    const data = await notebookLmAction('write-sample-digest', { title, notebookLink: notebookLink.value, requestedOutputs: actions });
    notebookActionResult.innerHTML = `<strong>${escapeHtml(data.title)}</strong><p>${escapeHtml(data.artifactPath || '')}</p>${data.obsidianUri ? `<a href="${escapeHtml(data.obsidianUri)}">在 Obsidian 打开</a>` : ''}`;
    await refreshInbox(data.recentInbox);
    await loadArtifacts();
    await loadCapabilities();
  } catch (error) {
    notebookActionResult.textContent = `写入失败：${error.message}`;
  }
});
localActions.addEventListener('change', updateSelectedActions);
runSelectedActionsBtn.addEventListener('click', () => runSelectedLocalActions());
inboxList.addEventListener('click', async (event) => {
  const previewBtn = event.target.closest('[data-preview]');
  if (previewBtn) {
    try {
      await previewNote(previewBtn.dataset.preview);
    } catch (error) {
      showResult(`失败：${error.message}`);
    }
  }
});


artifactRegistry?.addEventListener('click', async (event) => {
  const previewBtn = event.target.closest('[data-preview]');
  if (previewBtn) {
    try { await previewNote(previewBtn.dataset.preview); } catch (error) { showResult(`失败：${error.message}`); }
    return;
  }
  const obsidianBtn = event.target.closest('[data-open-obsidian]');
  if (obsidianBtn) {
    try { await openObsidian(obsidianBtn.dataset.openObsidian); } catch (error) { health.textContent = `Obsidian 打开失败：${error.message}`; health.className = 'status-dot offline'; }
    return;
  }
  const copyBtn = event.target.closest('[data-copy-path]');
  if (copyBtn) {
    await navigator.clipboard?.writeText(copyBtn.dataset.copyPath);
    copyBtn.textContent = '已复制';
  }
});

for (const eventName of ['dragenter', 'dragover']) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });
}
for (const eventName of ['dragleave', 'drop']) {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
  });
}
dropzone.addEventListener('drop', (event) => upload(event.dataTransfer.files[0]));

updateSelectedActions();
await checkHealth();
await refreshInbox();
await loadCapabilities();
await loadArtifacts();
await loadAgentPrompt();
