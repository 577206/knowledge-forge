import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import matter from 'gray-matter';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { DEFAULT_VAULT_PATH } from './config.js';

const require = createRequire(import.meta.url);
const BOM = '\ufeff';

export function slugify(input) {
  return String(input || 'untitled')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'untitled';
}

export function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}

export async function ensureVaultDirs(vaultPath = DEFAULT_VAULT_PATH) {
  const dirs = ['inbox', 'sources', 'concepts', 'data', 'attachments', '.knowledge-forge'];
  await Promise.all(dirs.map((dir) => fs.mkdir(path.join(vaultPath, dir), { recursive: true })));
}

function stripMarkdownNoise(text) {
  return String(text || '')
    .replace(/^---[\s\S]*?---\s*/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[>#*_`~|\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  const clean = stripMarkdownNoise(text);
  const parts = clean.match(/[^。！？.!?\n]{18,220}[。！？.!?]?/g) || [];
  return parts.map((s) => s.trim()).filter(Boolean).slice(0, 80);
}

const STOPWORDS = new Set('the a an and or of to in for with on by from this that is are was were be as it its into about can will your you we our they their have has had not but if then than stage mvp current next'.split(' '));
const DOMAIN_TERMS = [
  ['rag', 'RAG'], ['llm', 'LLM'], ['ai', 'AI'], ['knowledge graph', 'Knowledge Graph'], ['obsidian', 'Obsidian'],
  ['第二大脑', '第二大脑'], ['知识库', '知识库'], ['双链', '双链'], ['概念', '概念'], ['学习系统', '学习系统'],
  ['工资', '工资'], ['薪酬', '薪酬'], ['考勤', '考勤'], ['药品', '药品'], ['库存', '库存'], ['批号', '批号'], ['有效期', '有效期'],
];

export function extractKeywords(text, limit = 12) {
  const source = String(text || '');
  const scores = new Map();
  for (const [needle, label] of DOMAIN_TERMS) {
    const count = (source.toLowerCase().match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    if (count) scores.set(label, (scores.get(label) || 0) + count * 4);
  }
  const words = stripMarkdownNoise(source).match(/[A-Za-z][A-Za-z0-9-]{2,}|[\u4e00-\u9fa5]{2,8}/g) || [];
  for (const raw of words) {
    const key = raw.toLowerCase();
    if (STOPWORDS.has(key) || /^\d+$/.test(key)) continue;
    const display = /[\u4e00-\u9fa5]/.test(raw) ? raw : raw.replace(/^\w/, (c) => c.toUpperCase());
    scores.set(display, (scores.get(display) || 0) + Math.min(raw.length, 8));
  }
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([keyword, score]) => ({ keyword, score }));
}

export function summarizeDocument(parsed) {
  const text = [parsed.title, parsed.markdown].join('\n');
  const sentences = splitSentences(text);
  const keywords = extractKeywords(text, 12);
  const keywordSet = new Set(keywords.slice(0, 8).map((k) => k.keyword.toLowerCase()));
  const ranked = sentences.map((sentence, index) => {
    const lower = sentence.toLowerCase();
    let score = Math.max(0, 10 - index);
    for (const keyword of keywordSet) if (lower.includes(keyword.toLowerCase())) score += 8;
    if (/重要|核心|关键|本质|总结|结论|therefore|important|key/i.test(sentence)) score += 5;
    return { sentence, score };
  }).sort((a, b) => b.score - a.score).slice(0, 3).map((item) => item.sentence);
  const outline = Array.from(String(parsed.markdown || '').matchAll(/^#{1,3}\s+(.+)$/gm)).map((m) => m[1].trim()).slice(0, 8);
  const tags = keywords.slice(0, 6).map((k) => k.keyword.replace(/\s+/g, '-'));
  return {
    mode: 'rules-v0',
    providerSlot: 'future: DeepSeek/local LLM summarizer (no key configured)',
    summary: ranked.length ? ranked : [stripMarkdownNoise(parsed.markdown).slice(0, 180) || '暂未提取到足够正文，已先生成待复核笔记。'],
    keywords: keywords.map((item) => item.keyword),
    candidateTags: tags,
    outline,
    stats: {
      characters: String(parsed.markdown || '').length,
      sentences: sentences.length,
      headings: outline.length,
    },
  };
}

export async function parseTextLike(file) {
  const content = await fs.readFile(file.path, 'utf8');
  const parsed = {
    kind: 'document',
    parser: 'text',
    title: path.parse(file.originalName).name,
    markdown: content,
    metadata: {
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
    },
  };
  parsed.analysis = summarizeDocument(parsed);
  return parsed;
}

function pdfPlaceholder(file, note = 'pdf parser placeholder') {
  const title = path.parse(file.originalName).name;
  const parsed = {
    kind: 'document',
    parser: 'pdf-placeholder',
    title,
    markdown: [
      `# ${title}`,
      '',
      '> PDF 已摄入。当前环境未能完成全文抽取时，会先记录文件元数据和 Obsidian 笔记壳；后续可接 marker / MinerU / PyMuPDF worker。',
      '',
      '## 待解析',
      '',
      '- [ ] 提取正文',
      '- [ ] 提取章节',
      '- [ ] 提取关键概念',
      '- [ ] 生成双链建议',
    ].join('\n'),
    metadata: {
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      note,
    },
  };
  parsed.analysis = summarizeDocument(parsed);
  return parsed;
}

export async function parsePdf(file) {
  const title = path.parse(file.originalName).name;
  try {
    const pdf2md = require('@opendocsg/pdf2md');
    const buffer = await fs.readFile(file.path);
    const markdown = await pdf2md(buffer);
    if (String(markdown || '').trim().length > 40) {
      const parsed = {
        kind: 'document',
        parser: 'pdf2md',
        title,
        markdown: String(markdown).trim(),
        metadata: {
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
          note: 'parsed by @opendocsg/pdf2md',
        },
      };
      parsed.analysis = summarizeDocument(parsed);
      return parsed;
    }
    return pdfPlaceholder(file, 'pdf2md returned empty text; likely scanned/image PDF');
  } catch (error) {
    return pdfPlaceholder(file, `pdf2md failed: ${error.message}`);
  }
}

function normalizeCell(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function inferFieldType(values, header = '') {
  const samples = values.map(normalizeCell).filter(Boolean).slice(0, 30);
  if (!samples.length) return 'empty';
  if (/工资|薪酬|薪资|奖金|扣款|社保|金额|价格|费用|收入|支出|单价|总价|余额|成本/.test(header)) return 'money';
  if (/日期|时间|有效期|生产日期|入库日|出库日/.test(header)) return 'date';
  const numberLike = samples.filter((v) => /^-?\d+(\.\d+)?$/.test(v.replace(/,/g, ''))).length;
  const dateLike = samples.filter((v) => !Number.isNaN(Date.parse(v)) && /\d/.test(v)).length;
  if (numberLike / samples.length > 0.8) return 'number';
  if (dateLike / samples.length > 0.7) return 'date';
  return 'text';
}

function guessBusinessType(headers) {
  const text = headers.join(' ');
  if (/工资|薪酬|薪资|奖金|扣款|社保|绩效|基础工资/.test(text)) return 'payroll';
  if (/考勤|上班|下班|迟到|早退|请假|出勤/.test(text)) return 'attendance';
  if (/药品|药名|入库|出库|库存|批号|有效期|供应商|规格|剂型/.test(text)) return 'medicine_inventory';
  if (/收入|支出|费用|收款|付款|医保|现金|发票/.test(text)) return 'finance';
  if (/客户|联系人|电话|地址|订单|销售/.test(text)) return 'crm_sales';
  return 'unknown_table';
}

export function inferTargetField(header, businessType = 'unknown_table') {
  const h = String(header || '').replace(/\s+/g, '').toLowerCase();
  const rules = [
    [/^(姓名|员工姓名|人员|名字|name|employee)$/i, 'person.name'],
    [/(员工编号|工号|employeeid|staffid)/i, 'person.employeeId'],
    [/(身份证|证件号|idcard)/i, 'person.idCard'],
    [/(部门|科室|department)/i, 'org.department'],
    [/(岗位|职位|职务|position|role)/i, 'org.position'],
    [/(手机号|手机|电话|联系方式|phone|mobile)/i, 'person.phone'],
    [/(基础工资|基本工资|底薪|base)/i, 'payroll.baseSalary'],
    [/(绩效|绩效工资|performance)/i, 'payroll.performancePay'],
    [/(奖金|津贴|补贴|bonus|allowance)/i, 'payroll.bonusOrAllowance'],
    [/(扣款|罚款|deduction)/i, 'payroll.deduction'],
    [/(社保|五险|social)/i, 'payroll.socialInsurance'],
    [/(公积金|housingfund)/i, 'payroll.housingFund'],
    [/(应发|应发工资|gross)/i, 'payroll.grossPay'],
    [/(实发|实发工资|net)/i, 'payroll.netPay'],
    [/(出勤天数|出勤|attendance|workdays)/i, 'attendance.days'],
    [/(缺勤|请假|leave|absent)/i, 'attendance.leaveDays'],
    [/(迟到|late)/i, 'attendance.lateCount'],
    [/(加班|overtime)/i, 'attendance.overtimeHours'],
    [/(药品名称|药名|品名|medicine|drug)/i, 'medicine.name'],
    [/(规格|spec)/i, 'medicine.specification'],
    [/(剂型|dosage)/i, 'medicine.dosageForm'],
    [/(批号|批次|batch)/i, 'inventory.batchNo'],
    [/(有效期|expiry|expire)/i, 'inventory.expiryDate'],
    [/(生产日期|manufacture)/i, 'inventory.manufactureDate'],
    [/(库存|结存|stock|quantity|数量)/i, 'inventory.quantity'],
    [/(入库|进货|采购|inbound)/i, 'inventory.inboundQuantity'],
    [/(出库|销售|领用|outbound)/i, 'inventory.outboundQuantity'],
    [/(供应商|供货商|supplier)/i, 'inventory.supplier'],
    [/(单价|价格|price)/i, 'finance.unitPrice'],
    [/(金额|总价|合计|amount|total)/i, 'finance.amount'],
    [/(日期|时间|date|time)/i, 'event.date'],
    [/(备注|说明|note|comment)/i, 'meta.note'],
  ];
  for (const [pattern, targetField] of rules) if (pattern.test(h)) return targetField;
  if (businessType === 'payroll' && /工资|薪/.test(h)) return 'payroll.unclassifiedPayField';
  if (businessType === 'medicine_inventory' && /药|库存|批/.test(h)) return 'medicine.unclassifiedInventoryField';
  return `raw.${slugify(header).replace(/\s+/g, '_')}`;
}

export function summarizeData(parsed) {
  const sheets = parsed.workbook?.sheets || [];
  const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0);
  const businessTypes = Array.from(new Set(sheets.map((sheet) => sheet.businessType)));
  const mappedFields = sheets.flatMap((sheet) => sheet.fields.map((field) => field.targetField));
  return {
    mode: 'rules-v0',
    providerSlot: 'future: DeepSeek/local LLM data profiler (no key configured)',
    summary: [
      `共识别 ${sheets.length} 个 sheet、${totalRows} 行数据。`,
      `业务类型候选：${businessTypes.join(' / ') || 'unknown_table'}。`,
      `已生成 ${mappedFields.length} 个字段映射预览，需人工确认后再触发工资/库存/财务计算。`,
    ],
    keywords: Array.from(new Set([...businessTypes, ...mappedFields.map((f) => f.split('.')[0])])).filter(Boolean).slice(0, 12),
    candidateTags: ['knowledge-forge', 'data-import', ...businessTypes].filter(Boolean),
    stats: { sheetCount: sheets.length, totalRows, fieldCount: mappedFields.length },
  };
}

export async function parseSpreadsheet(file) {
  const buffer = await fs.readFile(file.path);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', blankrows: false });
    const headerRowIndex = rows.findIndex((row) => row.filter((cell) => normalizeCell(cell)).length >= 2);
    const headers = headerRowIndex >= 0 ? rows[headerRowIndex].map(normalizeCell) : [];
    const dataRows = headerRowIndex >= 0 ? rows.slice(headerRowIndex + 1) : [];
    const businessType = guessBusinessType(headers);
    const fields = headers.map((header, colIndex) => ({
      sourceHeader: header || `Column ${colIndex + 1}`,
      targetField: inferTargetField(header || `Column ${colIndex + 1}`, businessType),
      index: colIndex,
      inferredType: inferFieldType(dataRows.map((row) => row[colIndex]), header),
      sampleValues: dataRows.map((row) => normalizeCell(row[colIndex])).filter(Boolean).slice(0, 5),
      confidence: inferTargetField(header || '', businessType).startsWith('raw.') ? 0.35 : 0.78,
    }));
    return {
      sheetName,
      headerRowIndex,
      rowCount: dataRows.length,
      columnCount: headers.length,
      businessType,
      headers,
      fields,
      previewRows: dataRows.slice(0, 10).map((row) => headers.reduce((acc, header, index) => {
        acc[header || `Column ${index + 1}`] = normalizeCell(row[index]);
        return acc;
      }, {})),
    };
  });

  const parsed = {
    kind: 'data',
    parser: 'xlsx',
    title: path.parse(file.originalName).name,
    workbook: {
      originalName: file.originalName,
      sheetCount: workbook.SheetNames.length,
      sheets,
    },
    metadata: {
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
    },
  };
  parsed.analysis = summarizeData(parsed);
  return parsed;
}

export async function parseDocx(file) {
  const title = path.parse(file.originalName).name;
  try {
    const result = await mammoth.convertToMarkdown({ path: file.path });
    const markdown = String(result.value || '').trim();
    const parsed = {
      kind: 'document',
      parser: 'mammoth-docx',
      title,
      markdown: markdown || `# ${title}\n\n> DOCX ingested, but no body text was extracted. Please check whether the file is empty or protected.`,
      metadata: {
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        warnings: result.messages?.map((message) => message.message).filter(Boolean) || [],
      },
    };
    parsed.analysis = summarizeDocument(parsed);
    return parsed;
  } catch (error) {
    const parsed = {
      kind: 'document',
      parser: 'docx-placeholder',
      title,
      markdown: `# ${title}\n\n> DOCX ingestion failed: ${error.message}\n\n- [ ] Check whether the file is encrypted or damaged\n- [ ] Try exporting it as PDF or Markdown and upload again`,
      metadata: { originalName: file.originalName, mimeType: file.mimeType, size: file.size, note: error.message },
    };
    parsed.analysis = summarizeDocument(parsed);
    return parsed;
  }
}

export async function parseUploadedFile(file) {
  const ext = path.extname(file.originalName).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') return parseSpreadsheet(file);
  if (ext === '.pdf') return parsePdf(file);
  if (ext === '.docx') return parseDocx(file);
  return parseTextLike(file);
}

function yamlList(items) {
  if (!items?.length) return '[]';
  return `\n${items.map((item) => `  - ${JSON.stringify(item)}`).join('\n')}`;
}

function tokenize(text) {
  return Array.from(new Set(String(text || '')
    .toLowerCase()
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .split(/\s+/)
    .flatMap((part) => {
      if (!part) return [];
      const chunks = [part];
      if (/[^\x00-\x7F]/.test(part)) {
        for (let i = 0; i < part.length - 1; i += 1) chunks.push(part.slice(i, i + 2));
      }
      return chunks;
    })
    .filter((part) => part.length >= 2)));
}

async function walkMarkdownFiles(dir, root = dir, out = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walkMarkdownFiles(full, root, out);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) out.push({ full, relative: path.relative(root, full) });
  }
  return out;
}

export async function indexVault(vaultPath = DEFAULT_VAULT_PATH, options = {}) {
  const { includeInbox = false } = options;
  const files = (await walkMarkdownFiles(vaultPath)).filter((file) => {
    const normalized = file.relative.replaceAll('\\', '/');
    if (!includeInbox && normalized.startsWith('inbox/')) return false;
    return true;
  });
  const notes = [];
  for (const file of files) {
    let raw = '';
    try { raw = await fs.readFile(file.full, 'utf8'); } catch { continue; }
    const normalized = raw.replace(/^\ufeff/, '');
    let parsed;
    try { parsed = matter(normalized); } catch { parsed = { data: {}, content: normalized }; }
    const title = parsed.data.title || path.parse(file.relative).name;
    const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags : [];
    const wikilinks = Array.from(parsed.content.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)).map((m) => m[1]);
    notes.push({
      title: String(title),
      path: file.relative.replaceAll('\\', '/'),
      type: parsed.data.type || 'note',
      status: parsed.data.status || '',
      tags,
      wikilinks,
      tokens: tokenize([title, tags.join(' '), file.relative, parsed.content.slice(0, 1000)].join(' ')),
    });
  }
  return notes;
}

export async function buildVaultGraph(vaultPath = DEFAULT_VAULT_PATH, options = {}) {
  const { includeInbox = true } = options;
  const notes = await indexVault(vaultPath, { includeInbox });

  // Build lookup by title and by basename so wikilinks resolve robustly.
  const byTitle = new Map();
  for (const note of notes) {
    const base = note.path.split('/').pop().replace(/\.md$/i, '');
    if (!byTitle.has(note.title)) byTitle.set(note.title, note);
    if (!byTitle.has(base)) byTitle.set(base, note);
  }

  const nodes = notes.map((note) => {
    const topFolder = note.path.includes('/') ? note.path.split('/')[0] : 'root';
    return {
      id: note.path,
      label: note.title,
      group: topFolder,
      type: note.type || 'note',
      status: note.status || '',
      tags: note.tags || [],
      inbox: note.path.startsWith('inbox/'),
      degree: 0,
    };
  });
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const edgeSet = new Set();
  const edges = [];
  for (const note of notes) {
    for (const link of note.wikilinks || []) {
      const target = byTitle.get(link) || byTitle.get(String(link).trim());
      if (!target || target.path === note.path) continue;
      const key = `${note.path}\u0000${target.path}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ source: note.path, target: target.path });
      const a = nodeById.get(note.path);
      const b = nodeById.get(target.path);
      if (a) a.degree += 1;
      if (b) b.degree += 1;
    }
  }

  const groups = Array.from(new Set(nodes.map((n) => n.group))).sort();
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    groups,
    nodes,
    edges,
  };
}

export async function matchVaultTopics(parsed, vaultPath = DEFAULT_VAULT_PATH, limit = 8) {
  const notes = await indexVault(vaultPath, { includeInbox: false });
  const sourceText = parsed.kind === 'data'
    ? [parsed.title, parsed.analysis?.keywords?.join(' '), parsed.workbook?.sheets?.map((sheet) => [sheet.sheetName, sheet.businessType, sheet.headers.join(' ')].join(' ')).join(' ')].join(' ')
    : [parsed.title, parsed.analysis?.keywords?.join(' '), parsed.markdown].join(' ');
  const sourceTokens = new Set(tokenize(sourceText));
  const scored = notes.map((note) => {
    let score = 0;
    for (const token of note.tokens) if (sourceTokens.has(token)) score += 1;
    const titleHit = sourceText.toLowerCase().includes(note.title.toLowerCase()) ? 5 : 0;
    const tagHit = note.tags.filter((tag) => sourceText.toLowerCase().includes(String(tag).toLowerCase())).length * 2;
    return { ...note, score: score + titleHit + tagHit };
  }).filter((note) => note.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ tokens, ...note }) => note);
  return scored;
}

function formatLinkCandidates(candidates) {
  if (!candidates?.length) return '- 待匹配';
  return candidates.map((candidate) => `- [[${candidate.title}]] — ${candidate.path}，score=${candidate.score}`).join('\n');
}

export function extractConceptCandidates(parsed, limit = 12) {
  const text = parsed.kind === 'data'
    ? [parsed.title, parsed.analysis?.keywords?.join(' '), parsed.workbook?.sheets?.map((sheet) => [sheet.sheetName, sheet.businessType, sheet.headers.join(' '), sheet.fields.map((f) => f.targetField).join(' ')].join(' ')).join(' ')].join('\n')
    : [parsed.title, parsed.analysis?.keywords?.join(' '), parsed.markdown].join('\n');
  const candidates = new Map();
  const displayNames = new Map();
  const patterns = [
    /\b([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,3})\b/g,
    /\b([A-Za-z]+(?:\s+Engineering|\s+OS|\s+System|\s+Learning|\s+RAG))\b/gi,
    /([\u4e00-\u9fa5]{2,12}(?:工程|系统|知识库|第二大脑|工资|药品|库存|考勤|进出货|上下文|摘要|标签|双链|概念))/g,
  ];
  for (const keyword of parsed.analysis?.keywords || []) {
    const key = String(keyword).toLowerCase();
    candidates.set(key, (candidates.get(key) || 0) + 2);
    displayNames.set(key, String(keyword));
  }
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const value = String(match[1]).trim().replace(/\s+/g, ' ');
      if (value.length < 2 || /^this|that|with|from$/i.test(value)) continue;
      const key = value.toLowerCase();
      candidates.set(key, (candidates.get(key) || 0) + 1);
      if (!displayNames.has(key) || /[A-Z]/.test(value)) displayNames.set(key, value);
    }
  }
  return Array.from(candidates.entries())
    .sort((a, b) => b[1] - a[1] || displayNames.get(a[0]).localeCompare(displayNames.get(b[0])))
    .slice(0, limit)
    .map(([key, score]) => ({ name: displayNames.get(key), score }));
}

function formatConceptCandidates(candidates) {
  if (!candidates?.length) return '- 待生成';
  return candidates.map((candidate) => `- [[${candidate.name}]] — candidate_score=${candidate.score}`).join('\n');
}

function formatAnalysis(analysis) {
  return [
    ...(analysis?.summary || []).map((line) => `- ${line}`),
    '',
    `- 关键词：${(analysis?.keywords || []).join('、') || '待提取'}`,
    `- 候选标签：${(analysis?.candidateTags || []).map((tag) => `#${tag}`).join(' ') || '待生成'}`,
    `- 生成模式：${analysis?.mode || 'rules-v0'}；${analysis?.providerSlot || 'LLM slot reserved'}`,
  ].join('\n');
}

export function generateDocumentNote(parsed, linkCandidates = [], conceptCandidates = []) {
  const title = parsed.title || 'Untitled';
  const sourceName = parsed.metadata?.originalName || title;
  const body = parsed.markdown || '';
  return `${BOM}---
title: ${JSON.stringify(title)}
type: source-note
status: inbox
reviewed: false
created: ${todayStamp()}
updated: ${todayStamp()}
tags:${yamlList(['knowledge-forge', 'inbox', ...(parsed.analysis?.candidateTags || []).slice(0, 4)])}
source: ${JSON.stringify(sourceName)}
parser: ${JSON.stringify(parsed.parser)}
confidence: ${parsed.parser === 'pdf-placeholder' ? 0.35 : 0.62}
---

# ${title}

## 规则摘要

${formatAnalysis(parsed.analysis)}

## Markdown 大纲

${parsed.analysis?.outline?.length ? parsed.analysis.outline.map((item) => `- ${item}`).join('\n') : '- 待提取'}

## 关键概念候选

${formatConceptCandidates(conceptCandidates)}

## 双链候选

${formatLinkCandidates(linkCandidates)}

## 原始内容

${body}
`;
}

export function generateDataNote(parsed, linkCandidates = [], conceptCandidates = []) {
  const title = parsed.title || 'Untitled Data';
  const sheets = parsed.workbook.sheets;
  const sheetSections = sheets.map((sheet) => {
    const fields = sheet.fields.map((field) => `| ${field.index + 1} | ${field.sourceHeader} | ${field.targetField} | ${field.inferredType} | ${field.confidence} | ${field.sampleValues.join(' / ')} |`).join('\n');
    const previewHeaders = sheet.headers.slice(0, 8);
    const previewTable = previewHeaders.length ? [
      `| ${previewHeaders.join(' | ')} |`,
      `| ${previewHeaders.map(() => '---').join(' | ')} |`,
      ...sheet.previewRows.slice(0, 5).map((row) => `| ${previewHeaders.map((h) => String(row[h] ?? '').replace(/\|/g, '/')).join(' | ')} |`),
    ].join('\n') : '暂无预览';
    return `## Sheet: ${sheet.sheetName}

- 业务类型猜测：\`${sheet.businessType}\`
- 表头行：${sheet.headerRowIndex + 1}
- 数据行数：${sheet.rowCount}
- 列数：${sheet.columnCount}

| # | 原始表头 | 目标字段 | 推断类型 | 置信度 | 样例值 |
|---|---|---|---|---|---|
${fields || '| - | - | - | - | - | - |'}

### 数据预览

${previewTable}

### 导入提醒

- [ ] 确认业务类型是否正确
- [ ] 确认字段映射
- [ ] 检查异常值
- [ ] 决定是否触发工资/库存/财务计算
`;
  }).join('\n\n');

  return `${BOM}---
title: ${JSON.stringify(title)}
type: data-import
status: inbox
reviewed: false
created: ${todayStamp()}
updated: ${todayStamp()}
tags:${yamlList(['knowledge-forge', 'excel', 'data-import', ...(parsed.analysis?.candidateTags || []).slice(0, 4)])}
source: ${JSON.stringify(parsed.metadata.originalName)}
parser: ${JSON.stringify(parsed.parser)}
confidence: 0.72
---

# ${title}

## 数据摄入摘要

${formatAnalysis(parsed.analysis)}

- 文件名：${parsed.metadata.originalName}
- Sheet 数：${parsed.workbook.sheetCount}
- 生成时间：${nowIso()}

## 关键字段/概念候选

${formatConceptCandidates(conceptCandidates)}

## 相关知识库候选

${formatLinkCandidates(linkCandidates)}

${sheetSections}
`;
}

function normalizeForChunking(markdown = '') {
  return String(markdown || '')
    .replace(/^---[\n\r][\s\S]*?[\n\r]---\s*/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function chunkMarkdownForAgent(markdown = '', options = {}) {
  const maxChars = options.maxChars || 3800;
  const overlapChars = options.overlapChars || 350;
  const clean = normalizeForChunking(markdown);
  if (!clean) return [];
  const questionSections = clean.split(/(?=^(?:Question|Q)\s*\d+[\).:\s]|^第\s*\d+\s*[题問]|^\d+\s*[\.、)]\s+)/gim).map((part) => part.trim()).filter(Boolean);
  const headingSections = clean.split(/(?=^#{1,3}\s+)/gm).map((part) => part.trim()).filter(Boolean);
  const sections = questionSections.length > headingSections.length ? questionSections : headingSections;
  const questionMode = sections === questionSections && questionSections.length > 1;
  const chunks = [];
  let buffer = '';

  function pushBuffer() {
    const text = buffer.trim();
    if (!text) return;
    chunks.push({
      id: `chunk-${String(chunks.length + 1).padStart(3, '0')}`,
      text,
      chars: text.length,
      heading: (text.match(/^#{1,3}\s+(.+)$/m)?.[1] || text.match(/^((?:Question|Q)\s*\d+[^\n]*|第\s*\d+\s*[题問][^\n]*|\d+\s*[\.、)]\s+[^\n]*)/im)?.[1] || `Chunk ${chunks.length + 1}`).trim(),
    });
    buffer = text.slice(Math.max(0, text.length - overlapChars));
  }

  for (const section of (sections.length ? sections : [clean])) {
    if (questionMode && section.length <= maxChars) {
      if (buffer.trim()) pushBuffer();
      buffer = section;
      pushBuffer();
      buffer = '';
      continue;
    }
    if ((buffer + '\n\n' + section).length <= maxChars) {
      buffer = [buffer, section].filter(Boolean).join('\n\n');
      continue;
    }
    if (buffer.trim()) pushBuffer();
    if (section.length <= maxChars) {
      buffer = section;
      continue;
    }
    const paragraphs = section.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
    for (const paragraph of paragraphs) {
      if ((buffer + '\n\n' + paragraph).length > maxChars && buffer.trim()) pushBuffer();
      if (paragraph.length <= maxChars) {
        buffer = [buffer, paragraph].filter(Boolean).join('\n\n');
      } else {
        for (let i = 0; i < paragraph.length; i += maxChars - overlapChars) {
          const slice = paragraph.slice(i, i + maxChars);
          if (buffer.trim()) pushBuffer();
          buffer = slice;
        }
      }
    }
  }
  if (buffer.trim()) pushBuffer();
  return chunks.map((chunk, index) => ({ ...chunk, index: index + 1, total: chunks.length }));
}

function generateAgentInstruction(parsed, noteRelativePath, chunkPaths = []) {
  const title = parsed.title || 'Untitled';
  const actions = [
    'Read manifest.json and every chunks/*.md file first. Do not rely only on the short summary.',
    'Produce a final-exam-review style output: core summary, knowledge map, P0/P1/P2 exam points, Feynman explanations, common mistakes, mock questions, and flashcards.',
    'Ground important claims in chunk ids. If something is uncertain, mark it as NEEDS_SOURCE_REVIEW. Do not invent facts.',
    'If the source is Excel/CSV, explain fields, business type, and risks first. Do not invent payroll/finance/medicine formulas.',
    'Write the final result as Markdown so it can be saved to Obsidian or handed to OpenClaw / Claude Code / Cursor.',
  ];
  return [
    `# Agent Task - ${title}`,
    '',
    '> This Knowledge Forge agent pack is generated for agent-readable ingestion: files are parsed into Markdown chunks so an agent can read and synthesize them directly.',
    '',
    '## Source',
    `- Inbox note: ${noteRelativePath}`,
    `- Parser: ${parsed.parser}`,
    `- Kind: ${parsed.kind}`,
    '',
    '## Read order',
    '- 1. manifest.json',
    ...chunkPaths.map((chunkPath, index) => `- ${index + 2}. ${chunkPath}`),
    '',
    '## Required output',
    ...actions.map((item, index) => `${index + 1}. ${item}`),
    '',
    '## Final Exam Review Output Template',
    '',
    '```markdown',
    `# Final Exam Review Pack - ${title}`,
    '',
    '## 0. One-sentence overview',
    '## 1. Core summary',
    '## 2. Knowledge map / chapter structure',
    '## 3. P0/P1/P2 exam points',
    '## 4. Key concepts in Feynman style',
    '## 5. Formulas / definitions / methods / examples',
    '## 6. Common mistakes and counter-intuitive points',
    '## 7. Three-pass review plan',
    '## 8. Mock questions',
    '## 9. Flashcards',
    '## 10. Open questions / needs review',
    '```',
    '',
    '## Prompt for OpenClaw / Claude Code',
    '',
    '```text',
    `Read this Knowledge Forge agent pack from the current folder. Follow Required output. Use the chunks as source evidence, cite chunk ids, mark uncertainty as NEEDS_SOURCE_REVIEW, and do not invent facts.`,
    '```',
  ].join('\n');
}

export async function writeAgentPack(parsed, notePath, vaultPath = DEFAULT_VAULT_PATH) {
  const safeTitle = slugify(parsed.title);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const packDir = path.join(vaultPath, '.knowledge-forge', 'agent-packs', `${stamp}-${safeTitle}`);
  const chunksDir = path.join(packDir, 'chunks');
  await fs.mkdir(chunksDir, { recursive: true });

  const sourceMarkdown = parsed.kind === 'data'
    ? generateDataNote(parsed, [], [])
    : parsed.markdown || '';
  const chunks = chunkMarkdownForAgent(sourceMarkdown);
  if (!chunks.length) {
    chunks.push({
      id: 'chunk-001',
      index: 1,
      total: 1,
      heading: parsed.title || 'Fallback source metadata',
      chars: String(sourceMarkdown || '').length,
      text: [
        `# ${parsed.title || 'Untitled source'}`,
        '',
        '> Knowledge Forge could not extract enough body text from this file. The Agent should still review the metadata below and ask the user to provide a clearer/exported version if needed.',
        '',
        `- Original file: ${parsed.metadata?.originalName || 'unknown'}`,
        `- Parser: ${parsed.parser || 'unknown'}`,
        `- MIME type: ${parsed.metadata?.mimeType || 'unknown'}`,
        `- Size: ${parsed.metadata?.size || 0} bytes`,
        `- Note: ${parsed.metadata?.note || parsed.metadata?.warnings?.join('; ') || 'No additional parser note'}`,
      ].join('\n'),
    });
  }
  const chunkPaths = [];
  for (const chunk of chunks) {
    const fileName = `${chunk.id}.md`;
    const fullPath = path.join(chunksDir, fileName);
    const content = [
      `---`,
      `title: ${JSON.stringify(`${parsed.title} / ${chunk.id}`)}`,
      `type: agent-chunk`,
      `source: ${JSON.stringify(parsed.metadata?.originalName || parsed.title)}`,
      `chunk_id: ${chunk.id}`,
      `chunk_index: ${chunk.index}`,
      `chunk_total: ${chunk.total}`,
      `---`,
      '',
      `# ${parsed.title} / ${chunk.id}`,
      '',
      `> Heading: ${chunk.heading}`,
      '',
      chunk.text,
      '',
    ].join('\n');
    await fs.writeFile(fullPath, content, 'utf8');
    chunkPaths.push(`chunks/${fileName}`);
  }

  const noteRelativePath = path.relative(vaultPath, notePath).replaceAll('\\', '/');
  const instruction = generateAgentInstruction(parsed, noteRelativePath, chunkPaths);
  const instructionPath = path.join(packDir, 'AGENT_TASK.md');
  await fs.writeFile(instructionPath, instruction, 'utf8');

  const manifest = {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    type: 'agent-pack',
    title: parsed.title,
    kind: parsed.kind,
    parser: parsed.parser,
    source: parsed.metadata?.originalName,
    notePath: noteRelativePath,
    chunking: {
      strategy: 'markdown-heading-question-paragraph-chunks-v1',
      maxChars: 3800,
      overlapChars: 350,
      chunkCount: chunks.length,
      rationale: 'Agent-friendly chunking for OpenClaw / Claude Code: split by exam question markers or Markdown headings first, then paragraph/hard split when needed, with small overlap for context continuity.',
    },
    files: {
      instruction: 'AGENT_TASK.md',
      chunks: chunkPaths,
    },
    recommendedAgents: ['OpenClaw', 'Claude Code', 'Cursor', 'Codex'],
    recommendedOutput: 'final-exam-review-markdown',
    safety: {
      localFirst: true,
      autoAgentExecution: false,
      note: 'This version generates an agent-readable pack and prompt, but does not auto-launch external agents. Auto execution requires explicit user confirmation.',
    },
  };
  const manifestPath = path.join(packDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return {
    packDir,
    manifestPath,
    instructionPath,
    chunkCount: Math.max(chunks.length, 1),
    manifest,
    instruction,
  };
}

export async function writeToVault(parsed, vaultPath = DEFAULT_VAULT_PATH) {
  await ensureVaultDirs(vaultPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTitle = slugify(parsed.title);
  const noteName = `${todayStamp()} - ${safeTitle}.md`;
  const notePath = path.join(vaultPath, 'inbox', noteName);
  const linkCandidates = await matchVaultTopics(parsed, vaultPath);
  const conceptCandidates = extractConceptCandidates(parsed);
  const content = parsed.kind === 'data' ? generateDataNote(parsed, linkCandidates, conceptCandidates) : generateDocumentNote(parsed, linkCandidates, conceptCandidates);
  await fs.writeFile(notePath, content, 'utf8');

  const agentPack = await writeAgentPack(parsed, notePath, vaultPath);
  const manifest = {
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    kind: parsed.kind,
    parser: parsed.parser,
    title: parsed.title,
    notePath,
    source: parsed.metadata?.originalName,
    analysis: parsed.analysis,
    linkCandidates,
    conceptCandidates,
    agentPack: {
      packDir: agentPack.packDir,
      manifestPath: agentPack.manifestPath,
      instructionPath: agentPack.instructionPath,
      chunkCount: agentPack.chunkCount,
      recommendedAgents: agentPack.manifest.recommendedAgents,
    },
  };
  const manifestPath = path.join(vaultPath, '.knowledge-forge', `${stamp}-${safeTitle}.json`);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return { notePath, manifestPath, content, linkCandidates, conceptCandidates, agentPack };
}

export async function stageToVault(parsed, vaultPath = DEFAULT_VAULT_PATH) {
  await ensureVaultDirs(vaultPath);
  const stagingDir = path.join(vaultPath, '.knowledge-forge', 'staging');
  await fs.mkdir(stagingDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTitle = slugify(parsed.title);
  const stagingId = `${stamp}-${safeTitle}`;
  const draftPath = path.join(stagingDir, `${stagingId}.md`);
  const linkCandidates = await matchVaultTopics(parsed, vaultPath);
  const conceptCandidates = extractConceptCandidates(parsed);
  const content = parsed.kind === 'data' ? generateDataNote(parsed, linkCandidates, conceptCandidates) : generateDocumentNote(parsed, linkCandidates, conceptCandidates);
  await fs.writeFile(draftPath, content, 'utf8');

  const agentPack = await writeAgentPack(parsed, draftPath, vaultPath);
  const manifest = {
    id: stagingId,
    status: 'staged',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    kind: parsed.kind,
    parser: parsed.parser,
    title: parsed.title,
    draftPath,
    notePath: null,
    source: parsed.metadata?.originalName,
    analysis: parsed.analysis,
    linkCandidates,
    conceptCandidates,
    agentPack: {
      packDir: agentPack.packDir,
      manifestPath: agentPack.manifestPath,
      instructionPath: agentPack.instructionPath,
      chunkCount: agentPack.chunkCount,
      recommendedAgents: agentPack.manifest.recommendedAgents,
    },
  };
  const manifestPath = path.join(stagingDir, `${stagingId}.json`);
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return { stagingId, draftPath, manifestPath, content, linkCandidates, conceptCandidates, agentPack, manifest };
}

export async function stageFile(file, options = {}) {
  const parsed = await parseUploadedFile(file);
  const result = await stageToVault(parsed, options.vaultPath || DEFAULT_VAULT_PATH);
  return { parsed, ...result };
}

export async function approveStaged(stagingId, options = {}) {
  const vaultPath = options.vaultPath || DEFAULT_VAULT_PATH;
  const manifestPath = path.join(vaultPath, '.knowledge-forge', 'staging', `${stagingId}.json`);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  if (manifest.status === 'approved' && manifest.notePath) return { manifest, manifestPath, notePath: manifest.notePath };
  const content = typeof options.content === 'string' && options.content.trim() ? options.content : await fs.readFile(manifest.draftPath, 'utf8');
  const safeTitle = slugify(options.title || manifest.title || 'Knowledge Forge Note');
  const inboxDir = path.join(vaultPath, 'inbox');
  await fs.mkdir(inboxDir, { recursive: true });
  let notePath = path.join(inboxDir, `${todayStamp()} - ${safeTitle}.md`);
  let suffix = 2;
  while (await fs.stat(notePath).then(() => true).catch(() => false)) {
    notePath = path.join(inboxDir, `${todayStamp()} - ${safeTitle}-${suffix}.md`);
    suffix += 1;
  }
  await fs.writeFile(notePath, content, 'utf8');
  manifest.status = 'approved';
  manifest.updatedAt = nowIso();
  manifest.notePath = notePath;
  manifest.title = options.title || manifest.title;
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return { manifest, manifestPath, notePath, content };
}

export async function rejectStaged(stagingId, options = {}) {
  const vaultPath = options.vaultPath || DEFAULT_VAULT_PATH;
  const manifestPath = path.join(vaultPath, '.knowledge-forge', 'staging', `${stagingId}.json`);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  manifest.status = 'rejected';
  manifest.updatedAt = nowIso();
  manifest.rejectReason = options.reason || '';
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  return { manifest, manifestPath };
}

export async function ingestFile(file, options = {}) {
  const parsed = await parseUploadedFile(file);
  const result = await writeToVault(parsed, options.vaultPath || DEFAULT_VAULT_PATH);
  return { parsed, ...result };
}
