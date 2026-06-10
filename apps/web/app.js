const health = document.getElementById('health');
const vaultPath = document.getElementById('vaultPath');
const homeView = document.getElementById('homeView');
const localView = document.getElementById('localView');
const notebookView = document.getElementById('notebookView');
const dropzone = document.getElementById('dropzone');
const input = document.getElementById('fileInput');
const pickBtn = document.getElementById('pickBtn');
const selectedFileName = document.getElementById('selectedFileName');
const fileCards = document.getElementById('fileCards');
const reviewQueue = document.getElementById('reviewQueue');
const reviewDesk = document.getElementById('reviewDesk');
const reviewList = document.getElementById('reviewList');
const reviewEmpty = document.getElementById('reviewEmpty');
const reviewTitleInput = document.getElementById('reviewTitleInput');
const reviewMeta = document.getElementById('reviewMeta');
const reviewSignals = document.getElementById('reviewSignals');
const reviewSourcePreview = document.getElementById('reviewSourcePreview');
const reviewDraftPreview = document.getElementById('reviewDraftPreview');
const reviewEditor = document.getElementById('reviewEditor');
const approveReviewBtn = document.getElementById('approveReviewBtn');
const rejectReviewBtn = document.getElementById('rejectReviewBtn');
const refreshReviewBtn = document.getElementById('refreshReviewBtn');
const reviewModeBox = document.getElementById('reviewModeBox');
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
const runAgentBtn = document.getElementById('runAgentBtn');
const openTerminalBtn = document.getElementById('openTerminalBtn');
const agentEngineSelect = document.getElementById('agentEngineSelect');
const agentStatus = document.getElementById('agentStatus');
const agentTerminal = document.getElementById('agentTerminal');
const terminalTitle = document.getElementById('terminalTitle');
const terminalSubtitle = document.getElementById('terminalSubtitle');
const terminalLog = document.getElementById('terminalLog');
const clearTerminalBtn = document.getElementById('clearTerminalBtn');
const refreshNotebookLmBtn = document.getElementById('refreshNotebookLmBtn');
const connectNotebookLmBtn = document.getElementById('connectNotebookLmBtn');
const notebookLmStatus = document.getElementById('notebookLmStatus');
const notebookActions = document.getElementById('notebookActions');
const notebookLink = document.getElementById('notebookLink');
const writeNotebookDemoBtn = document.getElementById('writeNotebookDemoBtn');
const notebookActionResult = document.getElementById('notebookActionResult');
const capabilityCenter = document.getElementById('capabilityCenter');
const refreshCapabilitiesBtn = document.getElementById('refreshCapabilitiesBtn');
const agentPromptBox = document.getElementById('agentPromptBox');
const copyAgentPromptBtn = document.getElementById('copyAgentPromptBtn');
const notebookCaptureTitle = document.getElementById('notebookCaptureTitle');
const notebookOutputType = document.getElementById('notebookOutputType');
const notebookCaptureText = document.getElementById('notebookCaptureText');
const captureNotebookPasteBtn = document.getElementById('captureNotebookPasteBtn');

const taskPromptTextarea = document.getElementById('taskPromptTextarea');
const promptTemplateGrid = document.getElementById('promptTemplateGrid');
const taskPromptHint = document.getElementById('taskPromptHint');
const resetPromptBtn = document.getElementById('resetPromptBtn');
const exportPdfToggle = document.getElementById('exportPdfToggle');

const actionLabels = {
  summary: '速读摘要',
  'study-guide': '学习指南',
  quiz: '测验题',
  'exam-practice': '同类例题',
  flashcards: '闪卡',
  custom: '自定义任务',
  pdf: '导出 PDF',
  'final-exam-review': '完整复习包',
  'mind-map': '思维导图',
};

const taskPrompts = {
  summary: `请基于 source pack 生成一份「速读摘要」。

用途：让我在 5-8 分钟内判断这份资料讲什么、是否值得细读、有哪些关键结论。

请输出 Markdown，并包含：
1. 一句话总览
2. 5-8 条关键要点，每条引用 chunk id
3. 重要概念/人物/公式/流程速查
4. 资料中的证据、例子或数据
5. 我接下来最应该追问的 3 个问题

要求：只输出最终 Markdown；不要编造；不确定处写 NEEDS_SOURCE_REVIEW。若包含公式，使用标准 LaTeX：行内 $...$，独立公式 $$...$$。`,
  'study-guide': `请基于 source pack 生成一份「学习指南」。

用途：帮我从零开始系统学习这份资料，并知道先学什么、重点是什么、怎么复习。

请输出 Markdown，并包含：
1. 学习目标
2. 概念地图 / 知识结构
3. 建议学习顺序
4. P0/P1/P2 重点清单
5. 难点的费曼解释
6. 常见误解与易错点
7. 3 天或 7 天复习计划

要求：关键结论引用 chunk id；只输出最终 Markdown；不要编造。若包含公式，使用标准 LaTeX：行内 $...$，独立公式 $$...$$。`,
  quiz: `请基于 source pack 生成一套「测验题」。

用途：检查我是否真的理解资料，而不是只看过摘要。

请输出 Markdown，并包含：
1. 10 道选择题（含答案与解析）
2. 6 道简答题（含评分要点）
3. 3 道应用/综合题（含参考答案）
4. 按知识点标注每题考察内容
5. 最容易答错的陷阱提醒

要求：题目必须来自资料内容；解析引用 chunk id；只输出最终 Markdown。若包含公式，使用标准 LaTeX：行内 $...$，独立公式 $$...$$。`,
  'exam-practice': `请基于多个 source pack / 历年期末题生成「同类例题训练包」。

用途：我会一次性上传很多期末考试题、past papers、mock papers。你要先综合分析题型规律，再生成新的类似练习题，帮助我备考。

请输出 Markdown，并包含：
1. Past Paper Pattern Map：按题型/知识点/难度归纳历年题规律，并引用 source title + chunk id
2. 高频考点：P0/P1/P2 分级，不要只按章节复述，要按考试题型归纳
3. 命题套路：常见问法、条件变化、陷阱、评分点
4. 同类例题：至少 12 道新题，按 Easy / Medium / Hard 分组
5. 每道例题包含：题目、考察点、完整答案、步骤解析、易错提醒、对应来源依据
6. 最后给 3 套 30 分钟 mock mini paper

要求：不要复制原题；要生成“相似但不同”的新题；必须基于上传资料的题型规律；关键判断引用 source title + chunk id；不确定处写 NEEDS_SOURCE_REVIEW。若包含公式，使用标准 LaTeX：行内 $...$，独立公式 $$...$$。`,
  flashcards: `请基于 source pack 生成「闪卡」。

用途：把资料拆成可重复记忆和自测的问答卡片。

请输出 Markdown 表格，字段为：Front | Back | Tags | Source。

请包含：
1. 核心概念卡
2. 公式/流程/步骤卡
3. 对比辨析卡
4. 易错点卡
5. 至少 20 张；如果资料很短，可少于 20 张但不要凑数

要求：Back 简洁准确；Source 引用 chunk id；只输出最终 Markdown。若包含公式，使用标准 LaTeX：行内 $...$，独立公式 $$...$$。`,
  'final-exam-review': `请基于 source pack 生成「完整复习包」。

用途：把资料变成可以直接复习、考试前冲刺、写作或输出的完整材料。

请输出 Markdown，并包含：
1. Executive Summary：资料最重要的 8-12 个结论
2. Knowledge Map：知识地图/章节结构
3. P0/P1/P2 重点：必须掌握 / 需要理解 / 可扩展
4. Feynman Explanations：难点白话解释
5. Common Mistakes：常见误解、坑点、反例
6. Review Plan：可执行复习计划
7. Mock Questions：模拟题、答案、解析
8. Flashcards：可复制的问答闪卡
9. Needs Source Review：不确定或需要人工核对的地方

要求：关键论断引用 chunk id；只输出最终 Markdown；不要描述过程；不要编造。若包含公式，使用标准 LaTeX：行内 $...$，独立公式 $$...$$。`,
  custom: `请基于 source pack 完成下面的自定义任务：

【在这里写你想让 Agent 做什么】

输出要求：
- 使用 Markdown
- 关键论断引用 chunk id
- 不确定处写 NEEDS_SOURCE_REVIEW
- 只输出最终内容，不描述过程
- 若包含公式，使用标准 LaTeX：行内 $...$，独立公式 $$...$$`,
};


const promptTemplates = [
  {
    id: 'past-paper-patterns',
    label: '历年题规律分析',
    task: 'exam-practice',
    desc: '多份 past papers → 题型规律 + 高频考点 + 同类新题',
    prompt: `请把我上传的多份 past papers / 期末题当作一个整体分析。

目标：找出考试命题规律，并生成相似但不同的新练习题。

请输出：
1. 题型地图：按题型、知识点、难度、分值/篇幅归纳
2. 高频考点：P0/P1/P2 分级，说明为什么高频
3. 命题套路：常见问法、条件变化、陷阱、评分点
4. 同类例题：至少 12 道新题，Easy/Medium/Hard 分组
5. 每道题包含：题目、考察点、完整答案、步骤解析、易错提醒、来源依据
6. 3 套 30 分钟 mini mock paper

要求：不要复制原题；必须引用 source title + chunk id；不确定处写 NEEDS_SOURCE_REVIEW；公式用标准 LaTeX。`,
  },
  {
    id: 'exam-cram',
    label: '考前速成包',
    task: 'final-exam-review',
    desc: '把资料压缩成考前一天可执行的复习材料',
    prompt: `请基于上传资料生成一份「考前速成包」。

假设我只剩 1 天复习，请输出：
1. 先学什么：最值得投入时间的 20% 内容
2. P0 必会清单：定义、公式、方法、题型
3. P1 理解清单：常见变形和判断方法
4. 易错点：最容易丢分的位置
5. 速记卡：可以临考前快速过一遍
6. 2 小时冲刺计划
7. 最后自测题与答案

要求：引用 chunk id；不要编造；不确定处写 NEEDS_SOURCE_REVIEW；公式用标准 LaTeX。`,
  },
  {
    id: 'feynman-teacher',
    label: '费曼讲解',
    task: 'study-guide',
    desc: '把难点讲成真正能听懂的话',
    prompt: `请用费曼学习法解释上传资料中的核心概念。

输出结构：
1. 一句话解释这个资料到底在讲什么
2. 核心概念列表：每个概念用高中生也能懂的话解释
3. 抽象概念 → 生活类比 / 工程类比
4. 容易误解的地方
5. 我可以如何用自己的话复述
6. 复述检查题：用来判断我是否真的懂了

要求：引用 chunk id；不要编造；公式用标准 LaTeX。`,
  },
  {
    id: 'formula-sheet',
    label: '公式速查表',
    task: 'custom',
    desc: '抽取公式、变量含义、适用条件和例题',
    prompt: `请从上传资料中提取所有重要公式，并生成「公式速查表」。

每个公式请包含：
1. 公式本体：使用标准 LaTeX，独立公式用 $$...$$
2. 变量含义与单位
3. 适用条件 / 不适用条件
4. 典型题型
5. 一个最小例题
6. 常见错误
7. 来源 chunk id

要求：不要把文字伪装成公式；看不清或不确定的公式写 NEEDS_SOURCE_REVIEW。`,
  },
  {
    id: 'mistake-book',
    label: '错题本生成',
    task: 'quiz',
    desc: '把资料变成易错点和针对性训练',
    prompt: `请基于上传资料生成一份「错题本 / 易错点训练」。

输出：
1. 易错点清单：为什么容易错
2. 错误示范：学生常见错误答案
3. 正确思路：一步一步纠正
4. 针对性练习题：每个易错点至少 2 道
5. 答案与评分点
6. 临考提醒

要求：题目必须基于资料；引用 chunk id；公式用标准 LaTeX。`,
  },
  {
    id: 'essay-outline',
    label: '论文/报告提纲',
    task: 'custom',
    desc: '从资料生成结构化写作大纲和论证素材',
    prompt: `请基于上传资料生成一份论文/报告写作提纲。

输出：
1. 可选标题 5 个
2. 核心论点
3. 章节结构
4. 每节要使用的证据/数据/概念
5. 可引用的原文观点，标注 chunk id
6. 反驳与局限性
7. 最终写作 checklist

要求：不要编造引用；所有关键事实标注 chunk id。`,
  },
  {
    id: 'anki-cards',
    label: 'Anki 闪卡',
    task: 'flashcards',
    desc: '生成可复制进记忆系统的问答卡',
    prompt: `请把上传资料转换成 Anki 风格闪卡。

输出 Markdown 表格：Front | Back | Tags | Source

要求：
1. 至少 30 张，资料少则不要硬凑
2. 包含概念卡、公式卡、比较卡、易错卡、应用卡
3. Front 要适合主动回忆，不要太长
4. Back 要准确、简洁、有必要时给例子
5. Source 引用 chunk id
6. 公式使用标准 LaTeX。`,
  },
  {
    id: 'teach-me-plan',
    label: '从零学习路线',
    task: 'study-guide',
    desc: '生成学习顺序、前置知识和每日计划',
    prompt: `请基于上传资料，为一个初学者生成学习路线。

输出：
1. 前置知识：我需要先懂什么
2. 学习顺序：从易到难
3. 每一阶段的目标
4. 难点预警
5. 每日学习计划：3 天 / 7 天两个版本
6. 每天的自测问题
7. 如果我卡住了，应该回看哪些 chunk

要求：引用 chunk id；不要编造。`,
  },
];

let selectedTask = 'final-exam-review';

let latestVaultPath = '';
let currentNotePath = '';
let currentTitle = '';
let currentAgentPackDir = '';
let uploadedSources = [];
let stagingQueue = [];
let activeReviewId = '';
let pendingAgentOutputs = [];

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


async function detectCurrentAgent() {
  if (!agentStatus) return;
  try {
    const res = await fetch('/api/agent/current');
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Agent 检测失败');
    if (data.preferred && agentEngineSelect) agentEngineSelect.value = data.preferred;
    const available = Object.values(data.agents || {}).filter((agent) => agent.available).map((agent) => agent.label).join(' / ');
    agentStatus.className = 'agent-status idle';
    agentStatus.textContent = available ? `检测到本机 Agent：${available}` : '没有检测到本机 Agent。请先配置 Claude Code 或 Codex。';
  } catch (error) {
    agentStatus.className = 'agent-status error';
    agentStatus.textContent = `Agent 检测失败：${error.message}`;
  }
}

async function loadAgentPrompt() {
  if (!agentPromptBox) return;
  try {
    const res = await fetch('/api/agent/quick-start');
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Agent 提示词加载失败');
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
    if (!res.ok || !data.ok) throw new Error(data.error || '能力状态加载失败');
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

async function openObsidian(relativePath = '', method = 'protocol') {
  const res = await fetch('/api/obsidian/open', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: relativePath, method }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || '打开 Obsidian 失败');
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
    if (!res.ok || !data.ok) throw new Error(data.error || '健康检查失败');
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
  if (!res.ok || data.ok === false) throw new Error(data.error || data.message || `${action} 执行失败`);
  return data;
}

async function checkNotebookLmStatus() {
  notebookLmStatus.textContent = '正在检查 NotebookLM 连接...';
  notebookLmStatus.className = 'bridge-status muted';
  try {
    const res = await fetch('/api/notebooklm/status');
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'NotebookLM 状态检查失败');
    const label = data.connected ? '已连接' : data.installed ? '已安装，未登录' : '未安装';
    const next = data.connected
      ? 'NotebookLM Bridge 可用：建议在 NotebookLM 页面手动生成内容，再回到 Forge 捕捉并写入 Obsidian。'
      : data.installed
        ? 'notebooklm-py 已安装，但还没检测到可用登录态。点击「连接 Google NotebookLM」打开 Chrome 登录，完成后重新检查。'
        : 'NotebookLM 是可选增强。若需要它，请先运行 setup 脚本安装 notebooklm-py；本地 Forge 主流程不受影响。';
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
  return selectedTask ? [selectedTask, ...(exportPdfToggle?.checked ? ['pdf'] : [])] : [];
}

function getCurrentPrompt() {
  return taskPromptTextarea?.value.trim() || taskPrompts[selectedTask] || '';
}

function setSelectedTask(task, { resetPrompt = true } = {}) {
  selectedTask = taskPrompts[task] ? task : 'custom';
  localActions?.querySelectorAll('.task-card').forEach((card) => {
    const isSelected = card.dataset.task === selectedTask;
    card.classList.toggle('selected', isSelected);
    card.setAttribute('aria-pressed', String(isSelected));
  });
  if (resetPrompt && taskPromptTextarea) taskPromptTextarea.value = taskPrompts[selectedTask] || '';
  if (taskPromptHint) taskPromptHint.textContent = `已选择：${actionLabels[selectedTask] || selectedTask}。你可以直接改写，运行时会发送给后端 Agent。`;
  updateSelectedActions();
}

function renderPromptTemplates() {
  if (!promptTemplateGrid) return;
  promptTemplateGrid.innerHTML = promptTemplates.map((template) => `
    <button class="prompt-template-card" type="button" data-template-id="${escapeHtml(template.id)}">
      <strong>${escapeHtml(template.label)}</strong>
      <span>${escapeHtml(actionLabels[template.task] || template.task)}</span>
      <small>${escapeHtml(template.desc)}</small>
    </button>
  `).join('');
}

function applyPromptTemplate(id) {
  const template = promptTemplates.find((item) => item.id === id);
  if (!template) return;
  setSelectedTask(template.task, { resetPrompt: false });
  if (taskPromptTextarea) taskPromptTextarea.value = template.prompt;
  if (taskPromptHint) taskPromptHint.textContent = `已套用模板：${template.label}。你可以继续修改。`;
  updateSelectedActions();
}

function showTerminal(title = '执行日志', subtitle = '运行中') {
  if (!agentTerminal) return;
  agentTerminal.hidden = false;
  if (terminalTitle) terminalTitle.textContent = title;
  if (terminalSubtitle) terminalSubtitle.textContent = subtitle;
}

function setTerminalLog(lines = []) {
  if (!terminalLog) return;
  terminalLog.textContent = Array.isArray(lines) ? lines.join('\n') : String(lines || '');
}

function appendTerminalLog(line = '') {
  if (!terminalLog) return;
  terminalLog.textContent = `${terminalLog.textContent || ''}\n${line}`.trim();
  terminalLog.scrollTop = terminalLog.scrollHeight;
}

function fileIcon(name = '') {
  const ext = String(name).split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'PDF';
  if (['docx', 'doc'].includes(ext)) return 'DOC';
  if (['pptx', 'ppt'].includes(ext)) return 'PPT';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'XLS';
  if (['md', 'txt'].includes(ext)) return 'TXT';
  return 'FILE';
}

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function selectedReviewMode() {
  return document.querySelector('input[name="reviewMode"]:checked')?.value || 'separate';
}

function renderFileCards() {
  if (!fileCards) return;
  if (!uploadedSources.length) {
    fileCards.innerHTML = '<p class="muted">还没有源文件。</p>';
    if (reviewModeBox) reviewModeBox.hidden = true;
    return;
  }
  fileCards.innerHTML = uploadedSources.map((source, index) => `
    <article class="file-card ${source.status || 'ready'}">
      <div class="file-icon">${source.status === 'uploading' ? '<span class="mini-spinner"></span>' : fileIcon(source.name)}</div>
      <div class="file-main">
        <strong title="${escapeHtml(source.name)}">${escapeHtml(source.name)}</strong>
        <span>${escapeHtml(formatBytes(source.size))} · ${escapeHtml(source.statusLabel || '等待人工审查')}</span>
      </div>
      ${source.stagingId ? `<button type="button" data-review-source="${escapeHtml(source.stagingId)}">审查</button>` : `<button type="button" data-remove-source="${index}" aria-label="移除文件">移除</button>`}
    </article>
  `).join('');
  if (reviewModeBox) reviewModeBox.hidden = uploadedSources.filter((source) => source.agentPack?.packDir).length < 2;
}

function qualityScore(item = {}) {
  const confidence = Number(item.analysis?.confidence || 0) || (item.parser === 'pdf-placeholder' ? 35 : 62);
  const chunkBonus = Math.min(18, Number(item.agentPack?.chunkCount || 0) * 3);
  const conceptBonus = Math.min(12, Number(item.conceptCandidates?.length || 0) * 2);
  const parserPenalty = item.parser === 'pdf-placeholder' ? 22 : 0;
  return Math.max(18, Math.min(96, Math.round(confidence + chunkBonus + conceptBonus - parserPenalty)));
}

function riskLabel(score) {
  if (score >= 76) return { text: '建议入库', cls: 'good' };
  if (score >= 52) return { text: '需要快审', cls: 'warn' };
  return { text: '谨慎/可能垃圾', cls: 'bad' };
}

function renderReviewQueue() {
  if (!reviewList) return;
  if (reviewEmpty) reviewEmpty.textContent = stagingQueue.length ? `${stagingQueue.length} 份待审` : '暂无待审';
  if (!stagingQueue.length) {
    reviewList.innerHTML = '<p class="muted">暂无待审资料。上传后会先停在这里，不会直接污染 Obsidian。</p>';
    if (reviewDesk) reviewDesk.hidden = true;
    return;
  }
  reviewList.innerHTML = stagingQueue.map((item) => {
    const score = qualityScore(item);
    const risk = riskLabel(score);
    return `
      <button class="review-item ${activeReviewId === item.id ? 'active' : ''}" type="button" data-review-id="${escapeHtml(item.id)}">
        <span class="review-item-top"><strong>${escapeHtml(item.title || item.source || 'Untitled')}</strong><em class="risk-pill ${risk.cls}">${risk.text}</em></span>
        <span>${escapeHtml(item.source || item.kind || '')}</span>
        <small>Forge Score ${score} · ${escapeHtml(item.parser || 'parser')} · ${escapeHtml(formatTime(item.createdAt))}</small>
      </button>
    `;
  }).join('');
}

async function loadReviewQueue(itemsFromUpload) {
  try {
    if (Array.isArray(itemsFromUpload)) {
      stagingQueue = itemsFromUpload;
    } else {
      const res = await fetch('/api/staging?limit=30');
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || '待审队列加载失败');
      stagingQueue = data.items || [];
    }
    renderReviewQueue();
  } catch (error) {
    if (reviewList) reviewList.innerHTML = `<p class="muted">待审队列加载失败：${escapeHtml(error.message)}</p>`;
  }
}

function extractOriginalSection(markdown = '') {
  return String(markdown || '').split(/\n## 原始内容\s*\n/).slice(1).join('\n## 原始内容\n').trim() || markdown;
}

async function openReviewItem(id) {
  const res = await fetch(`/api/staging/item?id=${encodeURIComponent(id)}`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || '打开待审资料失败');
  const item = data.item;
  activeReviewId = item.id;
  renderReviewQueue();
  if (reviewDesk) reviewDesk.hidden = false;
  if (reviewTitleInput) reviewTitleInput.value = item.title || '';
  const score = qualityScore(item);
  const risk = riskLabel(score);
  if (reviewMeta) reviewMeta.textContent = `${item.source || '未知来源'} · ${item.parser || 'parser'} · ${item.agentPack?.chunkCount || 0} 个阅读分块`;
  if (reviewSignals) {
    const concepts = (item.conceptCandidates || []).slice(0, 5).map((c) => c.name).filter(Boolean).join('、') || '待提取';
    const links = (item.linkCandidates || []).slice(0, 3).map((c) => c.path || c.title || c.name).filter(Boolean).join(' / ') || '暂无明显匹配';
    reviewSignals.innerHTML = `
      <div class="signal-card ${risk.cls}"><strong>Forge Score</strong><span>${score}</span><small>${risk.text}</small></div>
      <div class="signal-card"><strong>关键概念</strong><span>${escapeHtml(concepts)}</span><small>用于判断是否值得沉淀</small></div>
      <div class="signal-card"><strong>相似知识</strong><span>${escapeHtml(links)}</span><small>避免重复污染 vault</small></div>
    `;
  }
  const content = item.content || '';
  if (reviewSourcePreview) reviewSourcePreview.innerHTML = renderMarkdownPreview(extractOriginalSection(content).slice(0, 6000));
  if (reviewDraftPreview) reviewDraftPreview.innerHTML = renderMarkdownPreview(content.replace(/\n## 原始内容[\s\S]*$/i, '').slice(0, 8000));
  if (reviewEditor) reviewEditor.value = content;
}

async function approveActiveReview() {
  if (!activeReviewId) return;
  approveReviewBtn.disabled = true;
  approveReviewBtn.textContent = '写入中...';
  try {
    const res = await fetch('/api/staging/approve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: activeReviewId, title: reviewTitleInput?.value, content: reviewEditor?.value }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || '批准入库失败');
    activeReviewId = '';
    await loadReviewQueue(data.stagingQueue);
    await refreshInbox(data.recentInbox);
    showResult({ ok: true, title: reviewTitleInput?.value || '已批准入库', noteRelativePath: data.noteRelativePath, obsidianUri: data.obsidianUri, noteContent: reviewEditor?.value });
    summary.innerHTML = `<div class="success-box clean-success"><strong>已批准入库</strong><p>笔记现在才写入 Obsidian inbox。</p><button class="inline-link" type="button" data-open-obsidian="${escapeHtml(data.noteRelativePath)}">在 Obsidian 打开</button></div>`;
  } catch (error) {
    alert(error.message);
  } finally {
    approveReviewBtn.disabled = false;
    approveReviewBtn.textContent = '批准入库';
  }
}

async function rejectActiveReview() {
  if (!activeReviewId) return;
  const reason = window.prompt('为什么丢弃这份资料？', '低价值 / 重复 / 解析质量差') || '';
  rejectReviewBtn.disabled = true;
  try {
    const res = await fetch('/api/staging/reject', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: activeReviewId, reason }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || '拒绝失败');
    activeReviewId = '';
    if (reviewDesk) reviewDesk.hidden = true;
    await loadReviewQueue(data.stagingQueue);
  } catch (error) {
    alert(error.message);
  } finally {
    rejectReviewBtn.disabled = false;
  }
}

function updatePrimaryPack() {
  currentAgentPackDir = uploadedSources.find((source) => source.agentPack?.packDir)?.agentPack?.packDir || '';
}

function updateSelectedActions() {
  updatePrimaryPack();
  const ready = uploadedSources.some((source) => source.agentPack?.packDir);
  selectedActions.textContent = ready ? `已就绪：${getSelectedLocalActions().map((action) => actionLabels[action] || action).join('、') || '完整复习包'}` : '等待上传';
  if (runSelectedActionsBtn) runSelectedActionsBtn.disabled = !ready;
  if (runAgentBtn) runAgentBtn.disabled = !ready;
  if (openTerminalBtn) openTerminalBtn.disabled = !ready;
  if (agentStatus && ready) {
    agentStatus.className = 'agent-status idle';
    agentStatus.textContent = uploadedSources.length > 1
      ? `${uploadedSources.length} 个文件已就绪。选择单独生成或融合生成，然后运行 ${selectedAgentLabel()}。`
      : `1 个文件已就绪。点击运行 ${selectedAgentLabel()}。`;
  }
  if (agentStatus && !ready) {
    agentStatus.className = 'agent-status idle';
    agentStatus.textContent = '等待上传';
  }
}

function selectedAgentLabel() {
  const labels = {
    claude: 'Claude Code',
    openclaw: 'OpenClaw',
    codex: 'Codex CLI',
  };
  return labels[agentEngineSelect?.value] || 'Claude Code';
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
  if (!inboxList) return;
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
        <div class="inbox-actions"><button data-open-obsidian="${escapeHtml(note.path)}" type="button">Obsidian 打开</button><button data-promote-wiki="${escapeHtml(note.path)}" data-promote-title="${escapeHtml(note.title)}" type="button">晋升到 Wiki</button><button data-open-folder="${escapeHtml(note.path)}" type="button">文件夹</button><button data-preview="${escapeHtml(note.path)}" type="button">预览</button></div>
      </article>
    `).join('');
  } catch (error) {
    inboxList.innerHTML = `<p class="muted">Inbox 加载失败：${escapeHtml(error.message)}</p>`;
  }
}

async function openVaultPath(relativePath = '', mode = 'open') {
  const res = await fetch('/api/vault/open', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: relativePath, mode }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || '打开 Vault 失败');
  return data;
}

async function previewNote(relativePath) {
  const res = await fetch(`/api/vault/note?path=${encodeURIComponent(relativePath)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '预览失败');
  currentNotePath = data.note.path;
  currentTitle = data.note.title;
  selectedFileName.textContent = `已选择 inbox 笔记：${data.note.title}`;
  showResult({ ok: true, kind: 'vault-note', title: data.note.title, noteRelativePath: data.note.path, obsidianUri: data.note.obsidianUri, noteContent: data.note.content, parsed: { markdown: data.note.content } });
  showView('local');
}

async function promoteToWiki(relativePath, title = '') {
  const targetFolder = prompt('晋升到哪个 wiki 文件夹？', 'wiki/Forge');
  if (!targetFolder) return null;
  const res = await fetch('/api/vault/promote', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sourcePath: relativePath, targetFolder, title, mode: 'move' }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || '晋升失败');
  await refreshInbox(data.recentInbox);
  return data;
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
  currentAgentPackDir = data.agentPack?.packDir || currentAgentPackDir;
  updateSelectedActions();

  const readyText = currentAgentPackDir
    ? `已就绪。选择 ${selectedAgentLabel()}，然后点击运行。`
    : '已保存到本地知识库。';

  summary.innerHTML = `
    <div class="success-box clean-success">
      <strong>${escapeHtml(data.title)}</strong>
      <p>${escapeHtml(readyText)}</p>
      ${data.noteRelativePath ? `<button class="inline-link" type="button" data-open-obsidian="${escapeHtml(data.noteRelativePath)}">在 Obsidian 打开源笔记</button>` : ''}
    </div>
    ${currentAgentPackDir ? `<section class="agent-pack-box user-friendly-pack"><h3>资料已准备好</h3><p>本机 Agent 会读取分块资料，生成完整复习包。</p><small>已准备 ${escapeHtml(data.agentPack?.chunkCount || '')} 个阅读分块</small></section>` : ''}
  `;

  if (data.kind === 'data') {
    const sheets = data.parsed?.workbook?.sheets || [];
    fields.innerHTML = `<section><h3>Excel 字段映射</h3>${sheets.map((sheet) => `<div class="sheet"><strong>${escapeHtml(sheet.sheetName)}</strong><p>${sheet.rowCount} 行 · ${sheet.columnCount} 列 · ${escapeHtml(sheet.businessType)}</p></div>`).join('')}</section>`;
  } else {
    fields.innerHTML = '';
  }
}

async function uploadFiles(fileList) {
  const files = Array.from(fileList || []).filter(Boolean);
  if (!files.length) return;

  const startIndex = uploadedSources.length;
  uploadedSources.push(...files.map((file) => ({
    name: file.name,
    size: file.size,
    status: 'uploading',
    statusLabel: '上传中...',
  })));
  renderFileCards();
  selectedFileName.textContent = files.length === 1 ? files[0].name : `本次选择 ${files.length} 个文件，当前共 ${uploadedSources.length} 个源文件`;
  summary.innerHTML = '<p class="muted">正在解析资料并准备 Agent source packs；这些源文件不会自动写入 Obsidian inbox。</p>';
  artifacts.innerHTML = '';
  showTerminal('文件处理', `本次选择 ${files.length} 个文件`);
  setTerminalLog([
    `本次选择 ${files.length} 个文件，当前队列共 ${uploadedSources.length} 个。`,
    '步骤 1/3：上传文件...',
    '步骤 2/3：解析为 Markdown...',
    '步骤 3/3：准备 Agent 可阅读分块...',
  ]);

  const results = [];
  for (let i = 0; i < files.length; i += 1) {
    const sourceIndex = startIndex + i;
    const file = files[i];
    const form = new FormData();
    form.append('file', file);
    try {
      uploadedSources[sourceIndex].statusLabel = '上传并解析中...';
      renderFileCards();
      appendTerminalLog(`处理中：${file.name}`);
      const res = await fetch('/api/ingest', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');
      uploadedSources[sourceIndex] = {
        ...uploadedSources[sourceIndex],
        status: 'ready',
        statusLabel: data.staged ? '已准备 source pack' : '可运行 Agent',
        title: data.title,
        stagingId: data.stagingId,
        noteRelativePath: data.noteRelativePath,
        draftRelativePath: data.draftRelativePath,
        obsidianUri: data.obsidianUri,
        parser: data.parser,
        agentPack: data.agentPack,
      };
      results.push(data);
      appendTerminalLog(`已准备：${file.name} -> ${data.agentPack?.chunkCount || 0} 个阅读分块`);
      if (data.stagingQueue) await loadReviewQueue(data.stagingQueue);
      if (data.recentInbox) await refreshInbox(data.recentInbox);
    } catch (error) {
      uploadedSources[sourceIndex] = {
        ...uploadedSources[sourceIndex],
        status: 'error',
        statusLabel: error.message,
      };
      appendTerminalLog(`失败：${file.name} -> ${error.message}`);
    }
    renderFileCards();
  }

  const readyCount = uploadedSources.filter((source) => source.agentPack?.packDir).length;
  const weakPdfCount = uploadedSources.filter((source) => source.parser === 'pdf-placeholder').length;
  renderFileCards();
  updatePrimaryPack();
  updateSelectedActions();
  if (readyCount <= 0) {
    summary.innerHTML = '<div class="success-box"><strong>文件已上传，但 Agent 分块还没准备好</strong><p>请稍等或重新上传。如果 DOCX/PDF 抽取失败，可以先导出为 PDF/Markdown 再试。</p></div>';
    artifacts.innerHTML = '<p class="muted">还没有可供 Agent 阅读的 source pack。</p>';
    return;
  }
  summary.innerHTML = `
    <div class="success-box clean-success">
      <strong>${readyCount} 个源文件已准备好</strong>
      <p>${readyCount > 1 ? '建议使用「融合生成」，尤其适合多份期末题 / past papers / 课程 PDF。' : '选择任务后点击 Agent Runner 里的运行按钮。'}</p>
      ${weakPdfCount ? `<p class="warn-text">有 ${weakPdfCount} 个 PDF 未能抽取正文，可能是扫描版/图片版；这类文件会缺失题目内容，建议先 OCR 或导出为可复制文本 PDF。</p>` : ''}
    </div>
  `;
  appendTerminalLog(`已准备 ${readyCount} 个源文件给 Agent 阅读。`);
  artifacts.innerHTML = '<p class="muted">等待 Agent 生成结果。结果生成后，你可以选择是否保存到 Obsidian。</p>';
  const firstStaged = results.find((item) => item.stagingId)?.stagingId;
  if (firstStaged) openReviewItem(firstStaged).catch((error) => appendTerminalLog(`打开 source pack 预览失败：${error.message}`));
}

async function upload(file) {
  return uploadFiles(file ? [file] : []);
}

async function generateLocalArtifact(action) {
  const res = await fetch('/api/local-forge/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, notePath: currentNotePath, writeToInbox: true }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || `${action} 生成失败`);
  return data;
}

async function exportPdfFromMarkdown(title, markdown, sourcePath = '') {
  const res = await fetch('/api/pdf/export', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, markdown, sourcePath }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || 'PDF 导出失败');
  return data;
}


async function saveAgentOutput(index) {
  const output = pendingAgentOutputs[index];
  if (!output) return;
  const res = await fetch('/api/artifacts/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: output.title,
      content: output.content,
      action: selectedTask,
      engine: output.engine,
      sourceTitle: output.sourceTitle,
      sourceAgentPack: output.sourceAgentPack,
      sourceAgentPacks: output.sourceAgentPacks,
      command: output.command,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || '保存失败');
  output.saved = true;
  output.artifactPath = data.artifactPath;
  output.obsidianUri = data.obsidianUri;
  await refreshInbox(data.recentInbox);
  return data;
}

function renderAgentOutputs(outputs = []) {
  pendingAgentOutputs = outputs.filter((item) => item.kind !== 'pdf');
  artifacts.innerHTML = outputs.map((data) => {
    if (data.kind === 'pdf') {
      return `
        <article class="artifact-item ai-result-card pdf-result-card">
          <div><strong>${escapeHtml(data.title || 'PDF')}</strong><small>${escapeHtml(data.pdfRelativePath || '')}</small></div>
          <div class="artifact-actions-row">
            <button type="button" data-open-file="${escapeHtml(data.pdfRelativePath || '')}">打开 PDF</button>
            <button type="button" data-reveal-file="${escapeHtml(data.pdfRelativePath || '')}">打开所在文件夹</button>
            <button class="copy-btn" type="button" data-copy-path="${escapeHtml(data.pdfPath || data.pdfRelativePath || '')}">复制 PDF 路径</button>
          </div>
          <p class="muted">这是基于 Agent 输出导出的 PDF 文件。</p>
        </article>
      `;
    }
    const index = pendingAgentOutputs.indexOf(data);
    return `
      <article class="artifact-item ai-result-card pending-save-card">
        <div><strong>${escapeHtml(data.title || '生成结果')}</strong><small>${data.saved ? escapeHtml(data.artifactPath || '') : '尚未写入 Obsidian'}</small></div>
        <div class="artifact-actions-row">
          <button class="save-artifact-btn" type="button" data-save-output="${index}">${data.saved ? '已保存' : '保存到 Obsidian inbox'}</button>
          <button class="copy-btn" type="button" data-copy-text="${escapeHtml(data.content || '')}">复制内容</button>
          ${data.saved && data.artifactPath ? `<button type="button" data-open-obsidian="${escapeHtml(data.artifactPath)}">在 Obsidian 打开</button>` : ''}
        </div>
        <p class="muted">先预览。满意后再保存，这部分才是应该进入 Obsidian 的高质量内容。</p>
        ${renderMarkdownPreview(data.content || '')}
      </article>
    `;
  }).join('');
}

async function runSelectedLocalActions() {
  const readySources = uploadedSources.filter((source) => source.agentPack?.packDir);
  if (!readySources.length) return;
  const engine = agentEngineSelect?.value || 'claude';
  const label = selectedAgentLabel();
  const mode = readySources.length > 1 ? selectedReviewMode() : 'separate';
  const selected = getSelectedLocalActions();
  const actions = selected.length ? selected : ['final-exam-review'];
  const wantsPdf = actions.includes('pdf');
  const outputType = selectedTask === 'custom' ? 'custom' : selectedTask;
  const taskPrompt = taskPrompts[selectedTask] || '';
  const customPrompt = getCurrentPrompt();

  if (runSelectedActionsBtn) runSelectedActionsBtn.disabled = true;
  if (runAgentBtn) runAgentBtn.disabled = true;
  if (runAgentBtn) runAgentBtn.textContent = '';
  if (runAgentBtn) runAgentBtn.innerHTML = '<span class="mini-spinner inline-spinner"></span> 正在生成';
  if (runSelectedActionsBtn) runSelectedActionsBtn.textContent = '运行中...';
  if (agentStatus) {
    agentStatus.className = 'agent-status running';
    agentStatus.innerHTML = `<strong>${escapeHtml(label)}</strong> 正在生成：${escapeHtml(actions.map((action) => actionLabels[action] || action).join('、'))}`;
  }
  artifacts.innerHTML = `<p class="muted">正在处理 ${readySources.length} 个资料：${escapeHtml(actions.map((action) => actionLabels[action] || action).join('、'))}</p>`;
  showTerminal('执行日志', `${mode === 'fuse' ? '融合生成' : '单文件生成'} · ${readySources.length} 个资料`);
  setTerminalLog([
    `命令：${label} / ${mode === 'fuse' ? '融合生成' : '单独生成'}`,
    `任务：${actions.map((action) => actionLabels[action] || action).join('、')}`,
    `资料：${readySources.map((source) => source.name).join('，')}`,
    `Prompt：已发送 taskPrompt / customPrompt 给后端 Agent。`,
    wantsPdf ? 'PDF：会基于 Agent 输出导出。' : 'PDF：未选择导出。',
    '正式输出走 Agent；本地规则只作为低质量 fallback。',
  ]);

  try {
    const outputs = [];

    if (mode === 'fuse') {
      appendTerminalLog(`调用 ${label}：融合生成 ${actionLabels[selectedTask] || selectedTask}...`);
      const res = await fetch('/api/agent/run-batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          engine,
          packDirs: readySources.map((source) => source.agentPack.packDir),
          outputType,
          taskPrompt,
          customPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || 'Agent 批量生成失败');
      outputs.push({ ...data, kind: 'review' });
      appendTerminalLog(`Agent 已生成，等待你确认是否保存：${data.title}`);
      if (wantsPdf) {
        appendTerminalLog('正在基于 Agent 输出导出 PDF：Pandoc → Chrome 打印...');
        const pdf = await exportPdfFromMarkdown(data.title || actionLabels[selectedTask] || 'Agent 输出', data.content || '', data.artifactPath || '');
        outputs.push({ ...pdf, kind: 'pdf' });
        appendTerminalLog(`PDF 已生成：${pdf.pdfRelativePath}`);
      }
    } else {
      for (const source of readySources) {
        appendTerminalLog(`调用 ${label}：${source.name}`);
        const res = await fetch('/api/agent/run', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            engine,
            packDir: source.agentPack.packDir,
            outputType,
            taskPrompt,
            customPrompt,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) throw new Error(`${source.name}: ${data.error || 'Agent 生成失败'}`);
        outputs.push({ ...data, kind: 'review' });
        appendTerminalLog(`Agent 已生成，等待你确认是否保存：${data.title}`);
        if (wantsPdf) {
          appendTerminalLog(`正在基于 Agent 输出导出 PDF：${source.name}`);
          const pdf = await exportPdfFromMarkdown(data.title || source.name, data.content || '', data.artifactPath || '');
          outputs.push({ ...pdf, kind: 'pdf' });
          appendTerminalLog(`PDF 已生成：${pdf.pdfRelativePath}`);
        }
      }
    }

    if (agentStatus) {
      agentStatus.className = 'agent-status done';
      agentStatus.innerHTML = `<strong>生成完成</strong> 结果还没有写入 Obsidian。请先预览，再手动保存。`;
      appendTerminalLog('完成：Agent 输出已生成，等待人工确认保存。');
    }
    renderAgentOutputs(outputs);

  } catch (error) {
    if (agentStatus) {
      agentStatus.className = 'agent-status error';
      agentStatus.innerHTML = `<strong>生成失败</strong> ${escapeHtml(error.message)}`;
      appendTerminalLog(`错误：${error.message}`);
    }
    artifacts.innerHTML = `<article class="artifact-item error"><strong>生成失败</strong><p>${escapeHtml(error.message)}</p><p class="muted">如果是 Agent 报错，请确认 Claude Code / Codex 已安装并能运行。</p></article>`;
  } finally {
    if (runAgentBtn) runAgentBtn.textContent = '运行';
    if (runAgentBtn) runAgentBtn.innerHTML = '运行';
    if (runSelectedActionsBtn) runSelectedActionsBtn.textContent = '运行';
    updateSelectedActions();
  }
}

async function openExternalTerminal() {
  const readySources = uploadedSources.filter((source) => source.agentPack?.packDir);
  if (!readySources.length) return;
  const engine = agentEngineSelect?.value || 'claude';
  const mode = readySources.length > 1 ? selectedReviewMode() : 'separate';
  try {
    showTerminal('外部终端', `正在打开 ${selectedAgentLabel()}...`);
    appendTerminalLog(`正在打开外部终端：${selectedAgentLabel()}（${mode === 'fuse' ? '融合生成' : '单独生成'}）...`);
    const res = await fetch('/api/agent/open-terminal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        engine,
        mode,
        packDir: readySources[0].agentPack.packDir,
        packDirs: readySources.map((source) => source.agentPack.packDir),
      }),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || '打开终端失败');
    appendTerminalLog(`外部终端已打开：${data.title || selectedAgentLabel()}`);
    if (agentStatus) {
      agentStatus.className = 'agent-status running';
      agentStatus.textContent = `已为 ${selectedAgentLabel()} 打开外部终端。`;
    }
  } catch (error) {
    appendTerminalLog(`打开终端失败：${error.message}`);
    if (agentStatus) {
      agentStatus.className = 'agent-status error';
      agentStatus.textContent = `打开终端失败：${error.message}`;
    }
  }
}

function selectedNotebookActionLabels() {
  return getCheckedValues(notebookActions).map((action) => actionLabels[action] || action);
}



document.addEventListener('click', async (event) => {
  const openFileBtn = event.target.closest('[data-open-file]');
  const revealFileBtn = event.target.closest('[data-reveal-file]');
  if (!openFileBtn && !revealFileBtn) return;
  try {
    if (openFileBtn) {
      await openVaultPath(openFileBtn.dataset.openFile, 'open');
      health.textContent = '已请求系统打开文件';
    } else {
      await openVaultPath(revealFileBtn.dataset.revealFile, 'reveal');
      health.textContent = '已请求打开所在文件夹';
    }
    health.className = 'status-dot online';
  } catch (error) {
    health.textContent = `文件打开失败：${error.message}`;
    health.className = 'status-dot offline';
  }
});

document.addEventListener('click', async (event) => {
  const copyBtn = event.target.closest('.copy-btn[data-copy-path], .copy-btn[data-copy-text]');
  if (!copyBtn) return;
  await navigator.clipboard?.writeText(copyBtn.dataset.copyPath || copyBtn.dataset.copyText || '');
  copyBtn.textContent = '已复制';
});

document.addEventListener('click', async (event) => {
  const taskBtn = event.target.closest('.copy-agent-task-btn[data-agent-task]');
  if (!taskBtn) return;
  await navigator.clipboard?.writeText(taskBtn.dataset.agentTask);
  taskBtn.textContent = 'Agent 任务已复制';
});

document.addEventListener('click', async (event) => {
  const saveBtn = event.target.closest('[data-save-output]');
  if (!saveBtn) return;
  const index = Number(saveBtn.dataset.saveOutput);
  saveBtn.disabled = true;
  saveBtn.textContent = '保存中...';
  try {
    const data = await saveAgentOutput(index);
    appendTerminalLog(`已保存到 Obsidian：${data.artifactPath}`);
    renderAgentOutputs([...pendingAgentOutputs]);
  } catch (error) {
    saveBtn.disabled = false;
    saveBtn.textContent = '保存失败，重试';
    appendTerminalLog(`保存失败：${error.message}`);
  }
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

clearTerminalBtn?.addEventListener('click', () => setTerminalLog(''));
pickBtn.addEventListener('click', () => input.click());
input.addEventListener('change', () => uploadFiles(input.files));
refreshInboxBtn?.addEventListener('click', () => refreshInbox());
openVaultBtn.addEventListener('click', () => openVaultPath('').catch((error) => showResult(`失败：${error.message}`)));
openVaultFromHomeBtn.addEventListener('click', () => openVaultPath('').catch((error) => { health.textContent = `打开失败：${error.message}`; health.className = 'status-dot offline'; }));
refreshNotebookLmBtn.addEventListener('click', () => checkNotebookLmStatus());
copyAgentPromptBtn?.addEventListener('click', async () => {
  await navigator.clipboard?.writeText(agentPromptBox.textContent || '');
  copyAgentPromptBtn.textContent = '已复制';
  setTimeout(() => { copyAgentPromptBtn.textContent = '复制提示词'; }, 1400);
});
refreshCapabilitiesBtn?.addEventListener('click', () => loadCapabilities());

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
  const title = `NotebookLM 示例记录 - ${actions.join('、') || '摘要'}`;
  notebookActionResult.textContent = '正在写入示例记录...';
  try {
    const data = await notebookLmAction('write-sample-digest', { title, notebookLink: notebookLink.value, requestedOutputs: actions });
    notebookActionResult.innerHTML = `<strong>${escapeHtml(data.title)}</strong><p>${escapeHtml(data.artifactPath || '')}</p>${data.obsidianUri ? `<a href="${escapeHtml(data.obsidianUri)}">在 Obsidian 打开</a>` : ''}`;
    await refreshInbox(data.recentInbox);

    await loadCapabilities();
  } catch (error) {
    notebookActionResult.textContent = `写入失败：${error.message}`;
  }
});
localActions?.addEventListener('click', (event) => {
  const card = event.target.closest('.task-card');
  if (!card) return;
  setSelectedTask(card.dataset.task);
});
promptTemplateGrid?.addEventListener('click', (event) => {
  const card = event.target.closest('[data-template-id]');
  if (!card) return;
  applyPromptTemplate(card.dataset.templateId);
});
exportPdfToggle?.addEventListener('change', updateSelectedActions);
resetPromptBtn?.addEventListener('click', () => setSelectedTask(selectedTask));
runSelectedActionsBtn?.addEventListener('click', () => runSelectedLocalActions());
runAgentBtn?.addEventListener('click', () => runSelectedLocalActions());
openTerminalBtn?.addEventListener('click', () => openExternalTerminal());
agentEngineSelect?.addEventListener('change', () => { if (currentAgentPackDir && agentStatus) { agentStatus.className = 'agent-status idle'; agentStatus.textContent = `已选择 ${selectedAgentLabel()}，点击运行开始。`; } });
refreshReviewBtn?.addEventListener('click', () => loadReviewQueue());
approveReviewBtn?.addEventListener('click', () => approveActiveReview());
rejectReviewBtn?.addEventListener('click', () => rejectActiveReview());
reviewList?.addEventListener('click', async (event) => {
  const item = event.target.closest('[data-review-id]');
  if (!item) return;
  try { await openReviewItem(item.dataset.reviewId); } catch (error) { alert(error.message); }
});
fileCards?.addEventListener('click', async (event) => {
  const reviewBtn = event.target.closest('[data-review-source]');
  if (reviewBtn) {
    try { await openReviewItem(reviewBtn.dataset.reviewSource); } catch (error) { alert(error.message); }
    return;
  }
  const removeBtn = event.target.closest('[data-remove-source]');
  if (removeBtn) {
    uploadedSources.splice(Number(removeBtn.dataset.removeSource), 1);
    renderFileCards();
    updateSelectedActions();
  }
});
inboxList?.addEventListener('click', async (event) => {
  const obsidianBtn = event.target.closest('[data-open-obsidian]');
  if (obsidianBtn) {
    try {
      await openObsidian(obsidianBtn.dataset.openObsidian, 'protocol');
      health.textContent = '已请求 Obsidian 打开笔记';
      health.className = 'status-dot online';
    } catch (error) {
      health.textContent = `Obsidian 打开失败：${error.message}`;
      health.className = 'status-dot offline';
    }
    return;
  }
  const folderBtn = event.target.closest('[data-open-folder]');
  if (folderBtn) {
    try {
      await openObsidian(folderBtn.dataset.openFolder, 'folder');
    } catch (error) {
      health.textContent = `文件夹打开失败：${error.message}`;
      health.className = 'status-dot offline';
    }
    return;
  }
  const promoteBtn = event.target.closest('[data-promote-wiki]');
  if (promoteBtn) {
    promoteBtn.disabled = true;
    promoteBtn.textContent = '晋升中...';
    try {
      const data = await promoteToWiki(promoteBtn.dataset.promoteWiki, promoteBtn.dataset.promoteTitle || '');
      if (data) {
        health.textContent = `已晋升到 ${data.targetRelativePath}`;
        health.className = 'status-dot online';
        showResult({ ok: true, kind: 'promoted', title: data.targetRelativePath, noteRelativePath: data.targetRelativePath, obsidianUri: data.obsidianUri });
      } else {
        promoteBtn.disabled = false;
        promoteBtn.textContent = '晋升到 Wiki';
      }
    } catch (error) {
      promoteBtn.disabled = false;
      promoteBtn.textContent = '晋升失败，重试';
      health.textContent = `晋升失败：${error.message}`;
      health.className = 'status-dot offline';
    }
    return;
  }
  const previewBtn = event.target.closest('[data-preview]');
  if (previewBtn) {
    try {
      await previewNote(previewBtn.dataset.preview);
    } catch (error) {
      showResult(`失败：${error.message}`);
    }
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
dropzone.addEventListener('drop', (event) => uploadFiles(event.dataTransfer.files));

updateSelectedActions();
renderPromptTemplates();
setSelectedTask(selectedTask);
await checkHealth();
await refreshInbox();
await loadReviewQueue();
await loadCapabilities();

await loadAgentPrompt();
await detectCurrentAgent();
