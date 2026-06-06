const health = document.getElementById('health');
const dropzone = document.getElementById('dropzone');
const input = document.getElementById('fileInput');
const pickBtn = document.getElementById('pickBtn');
const result = document.getElementById('result');
const summary = document.getElementById('summary');
const links = document.getElementById('links');
const fields = document.getElementById('fields');
const inboxList = document.getElementById('inboxList');
const inboxCount = document.getElementById('inboxCount');
const openObsidianBtn = document.getElementById('openObsidianBtn');
const openVaultBtn = document.getElementById('openVaultBtn');
const refreshInboxBtn = document.getElementById('refreshInboxBtn');
const refreshNotebookLmBtn = document.getElementById('refreshNotebookLmBtn');
const notebookLmStatus = document.getElementById('notebookLmStatus');

let latestVaultPath = '';

async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    latestVaultPath = data.vaultPath;
    health.textContent = `服务在线 · ${data.vaultPath}`;
  } catch (error) {
    health.textContent = `服务异常：${error.message}`;
  }
}

async function checkNotebookLmStatus() {
  if (!notebookLmStatus) return;
  notebookLmStatus.textContent = '正在检查 NotebookLM 连接...';
  try {
    const res = await fetch('/api/notebooklm/status');
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'NotebookLM status check failed');
    const label = data.connected ? '已连接' : data.installed ? '需要登录' : '未安装';
    const next = data.connected
      ? '可以在 Skill/Agent 工作流中选择摘要、测验、闪卡、报告/PDF 等输出。'
      : data.installed
        ? '请运行 .\\.venv-notebooklm\\Scripts\\notebooklm.exe login --browser chrome --fresh 后重新检查。'
        : '请按 README 安装 notebooklm-py。';
    notebookLmStatus.className = `bridge-status ${data.connected ? 'connected' : data.installed ? 'warning' : 'error'}`;
    notebookLmStatus.innerHTML = `
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(data.message || '')}</span>
      <small>${escapeHtml(next)}</small>
    `;
  } catch (error) {
    notebookLmStatus.className = 'bridge-status error';
    notebookLmStatus.textContent = `NotebookLM 检查失败：${error.message}`;
  }
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
}

function renderList(items, empty = '暂无') {
  if (!items?.length) return `<p class="muted">${escapeHtml(empty)}</p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function parseFrontmatter(noteContent = '') {
  const clean = String(noteContent).replace(/^\ufeff/, '');
  const match = clean.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1].trim() : '';
}

function renderMarkdownPreview(markdown = '') {
  const lines = String(markdown || '').split('\n').slice(0, 120);
  if (!lines.join('').trim()) return '<p class="muted">暂无 Markdown 预览。</p>';
  const html = lines.map((line) => {
    if (/^###\s+/.test(line)) return `<h4>${escapeHtml(line.replace(/^###\s+/, ''))}</h4>`;
    if (/^##\s+/.test(line)) return `<h3>${escapeHtml(line.replace(/^##\s+/, ''))}</h3>`;
    if (/^#\s+/.test(line)) return `<h2>${escapeHtml(line.replace(/^#\s+/, ''))}</h2>`;
    if (/^- \[[ x]\]/i.test(line)) return `<p class="task">${escapeHtml(line)}</p>`;
    if (/^-\s+/.test(line)) return `<p class="bullet">• ${escapeHtml(line.replace(/^-\s+/, ''))}</p>`;
    if (/^>\s+/.test(line)) return `<blockquote>${escapeHtml(line.replace(/^>\s+/, ''))}</blockquote>`;
    if (!line.trim()) return '<br />';
    return `<p>${escapeHtml(line)}</p>`;
  }).join('');
  return `<div class="markdown-preview">${html}</div>`;
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
    const notes = notesFromUpload || (await (await fetch('/api/vault/inbox?limit=30')).json()).notes || [];
    inboxCount.textContent = `${notes.length} 条最近笔记`;
    if (!notes.length) {
      inboxList.innerHTML = '<p class="muted">Inbox 里还没有笔记。</p>';
      return;
    }
    inboxList.innerHTML = notes.map((note) => `
      <article class="inbox-item" data-path="${escapeHtml(note.path)}">
        <div>
          <strong>${escapeHtml(note.title)}</strong>
          <small>${escapeHtml(note.path)}</small>
          <span>${escapeHtml(formatTime(note.modifiedAt))} · ${Math.ceil(note.size / 1024)} KB</span>
        </div>
        <div class="inbox-actions">
          <a href="${escapeHtml(note.obsidianUri)}">Obsidian</a>
          <button data-open="${escapeHtml(note.path)}">文件夹</button>
          <button data-preview="${escapeHtml(note.path)}">预览</button>
        </div>
      </article>
    `).join('');
  } catch (error) {
    inboxCount.textContent = '加载失败';
    inboxList.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

async function openVaultPath(relativePath = '') {
  await fetch('/api/vault/open', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: relativePath }),
  });
}

async function openObsidianPath(relativePath = '') {
  const res = await fetch('/api/obsidian/open', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: relativePath }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Open Obsidian failed');
  return data;
}

async function previewNote(relativePath) {
  const res = await fetch(`/api/vault/note?path=${encodeURIComponent(relativePath)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Preview failed');
  show({
    ok: true,
    kind: 'vault-note',
    title: data.note.title,
    parser: 'markdown',
    notePath: `${latestVaultPath}\\${data.note.path.replaceAll('/', '\\')}`,
    noteRelativePath: data.note.path,
    obsidianUri: data.note.obsidianUri,
    noteContent: data.note.content,
    analysis: { summary: ['这是知识库中已有笔记的只读预览。'], keywords: ['vault-note'] },
    linkCandidates: [],
    conceptCandidates: [],
    parsed: { markdown: data.note.content },
  });
}

function renderPretty(data) {
  if (!data?.ok) {
    summary.textContent = typeof data === 'string' ? data : '等待上传...';
    links.innerHTML = '';
    fields.innerHTML = '';
    return;
  }

  const analysis = data.analysis || data.parsed?.analysis || {};
  const frontmatter = parseFrontmatter(data.noteContent);
  summary.innerHTML = `
    <div class="pill-row">
      <div class="pill">${escapeHtml(data.kind)}</div>
      <div class="pill secondary">${escapeHtml(data.parser)}</div>
    </div>
    <section class="review-section success-box">
      <h3>已连接知识库</h3>
      <p><strong>标题：</strong>${escapeHtml(data.title)}</p>
      <p><strong>路径：</strong><code>${escapeHtml(data.notePath || data.noteRelativePath)}</code></p>
      <div class="action-row">
        ${data.obsidianUri ? `<a class="primary-link" href="${escapeHtml(data.obsidianUri)}">在 Obsidian 打开</a>` : ''}
        ${data.noteRelativePath ? `<button data-open-current="${escapeHtml(data.noteRelativePath)}">打开所在文件夹</button>` : ''}
      </div>
    </section>
    <section class="review-section">
      <h3>摘要</h3>
      ${renderList(analysis.summary, '暂无摘要。')}
      <div class="tag-row">${(analysis.keywords || []).map((k) => `<span>${escapeHtml(k)}</span>`).join('')}</div>
    </section>
    <section class="review-section">
      <h3>Frontmatter</h3>
      <pre class="frontmatter">${escapeHtml(frontmatter || '未找到 frontmatter')}</pre>
    </section>
  `;

  const candidates = data.linkCandidates || [];
  const concepts = data.conceptCandidates || [];
  links.innerHTML = `
    <section class="review-section">
      <h3>概念 / 双链候选</h3>
      ${concepts.length ? `<div class="candidate-list">${concepts.map((item) => `
        <div class="candidate concept"><strong>[[${escapeHtml(item.name)}]]</strong><span>score=${escapeHtml(item.score)}</span></div>`).join('')}</div>` : '<p class="muted">暂无概念候选。</p>'}
      ${candidates.length ? `<div class="candidate-list link-list">${candidates.map((item) => `
        <div class="candidate"><strong>[[${escapeHtml(item.title)}]]</strong><span>score=${escapeHtml(item.score)}</span><small>${escapeHtml(item.path)}</small></div>`).join('')}</div>` : ''}
    </section>
  `;

  if (data.kind === 'data') {
    const sheets = data.parsed?.workbook?.sheets || [];
    fields.innerHTML = `<section class="review-section"><h3>Excel 字段映射与数据预览</h3>${sheets.map((sheet) => `
      <div class="sheet">
        <h4>${escapeHtml(sheet.sheetName)} · <span>${escapeHtml(sheet.businessType)}</span></h4>
        <p>${sheet.rowCount} 行 · ${sheet.columnCount} 列 · 表头行 ${sheet.headerRowIndex + 1}</p>
        <table>
          <thead><tr><th>#</th><th>原始表头</th><th>目标字段</th><th>类型</th><th>样例</th></tr></thead>
          <tbody>${sheet.fields.map((field) => `
            <tr><td>${field.index + 1}</td><td>${escapeHtml(field.sourceHeader)}</td><td><code>${escapeHtml(field.targetField)}</code></td><td>${escapeHtml(field.inferredType)}</td><td>${escapeHtml(field.sampleValues.join(' / '))}</td></tr>
          `).join('')}</tbody>
        </table>
      </div>
    `).join('')}</section>`;
  } else {
    fields.innerHTML = `<section class="review-section"><h3>Markdown 预览</h3>${renderMarkdownPreview(data.parsed?.markdown || data.noteContent || '')}</section>`;
  }
}

function show(data) {
  result.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  renderPretty(data);
}

async function upload(file) {
  if (!file) return;
  show(`正在写入知识库：${file.name} ...`);
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch('/api/ingest', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    show(data);
    await refreshInbox(data.recentInbox);
  } catch (error) {
    show(`失败：${error.message}`);
  }
}

pickBtn.addEventListener('click', () => input.click());
input.addEventListener('change', () => upload(input.files[0]));
openObsidianBtn.addEventListener('click', async () => {
  try {
    const originalText = openObsidianBtn.textContent;
    openObsidianBtn.disabled = true;
    openObsidianBtn.textContent = '正在打开 Obsidian...';
    await openObsidianPath('');
    openObsidianBtn.textContent = '已发送打开指令';
    setTimeout(() => { openObsidianBtn.textContent = originalText; openObsidianBtn.disabled = false; }, 1200);
  } catch (error) {
    openObsidianBtn.disabled = false;
    show(`失败：${error.message}`);
  }
});
openVaultBtn.addEventListener('click', () => openVaultPath(''));
refreshInboxBtn.addEventListener('click', () => refreshInbox());
if (refreshNotebookLmBtn) refreshNotebookLmBtn.addEventListener('click', () => checkNotebookLmStatus());

summary.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-open-current]');
  if (button) await openVaultPath(button.dataset.openCurrent);
});

inboxList.addEventListener('click', async (event) => {
  const openBtn = event.target.closest('[data-open]');
  const previewBtn = event.target.closest('[data-preview]');
  try {
    if (openBtn) await openVaultPath(openBtn.dataset.open);
    if (previewBtn) await previewNote(previewBtn.dataset.preview);
  } catch (error) {
    show(`失败：${error.message}`);
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

await checkHealth();
await checkNotebookLmStatus();
await refreshInbox();
