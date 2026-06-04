# Knowledge Forge

> 把散乱资料炼成可复用知识：一个面向 Obsidian / Markdown 知识库的本地资料摄入工作台。

Knowledge Forge 是一个本地优先的知识库直通车。它把 PDF、Markdown、TXT、Excel/CSV 等文件摄入后，解析为 Obsidian 友好的 Markdown 笔记，并写入指定 vault 的 `inbox/`。当前版本刻意不做完全自动归档和强 Agent 决策，而是先建立一个安全、可控、可上手的最小闭环：**上传 → 解析 → 写入 inbox → 页面预览 → 打开 Obsidian**。

## 创作意图

我想做的不是一个普通“文件上传器”，而是一个未来可以进化成个人知识操作系统的入口：

- 把 PDF、文章、笔记、表格这些散乱信息，统一送进 Markdown/Obsidian 知识库。
- 先进入 `inbox`，避免自动化流程污染正式知识结构。
- 对资料做最小程度的结构化：摘要、关键词、候选概念、候选双链、Excel 字段映射。
- 让使用者先能“看见、打开、复核、整理”，再逐步引入 Agent 自动归纳。

核心原则：

```text
AI/规则系统负责提出结构化建议，知识库最终结构由人确认。
```

这也是为什么当前版本没有直接做全自动归档。知识库是人的第二大脑，不能让自动化在没有复核的情况下随意改动长期结构。

## 当前能力

- 本地 Web 页面：`http://localhost:4177`
- 支持上传：`.pdf` / `.md` / `.txt` / `.xlsx` / `.xls` / `.csv`
- 写入 Obsidian vault 的 `inbox/`
- 页面右侧展示最近 inbox 笔记
- 支持在页面中预览 Markdown
- 支持通过 `obsidian://open` 打开笔记
- 支持打开本地 vault 文件夹 / 笔记所在位置
- 每次摄入生成 manifest，便于后续审计和回滚能力扩展
- Excel 自动识别：sheet、表头、行列数、业务类型、字段类型、样例值、目标字段映射
- PDF 优先尝试 `@opendocsg/pdf2md` 转 Markdown，失败则生成占位笔记

## 技术逻辑

### 总体链路

```text
浏览器前端
  ↓ multipart upload
Node HTTP API
  ↓ 保存临时上传文件
Ingestion Core
  ├─ Text/Markdown parser
  ├─ PDF parser/fallback
  └─ Spreadsheet parser
      ↓
规则版分析器
  ├─ 摘要/关键词/标签候选
  ├─ 概念候选
  ├─ 双链候选
  └─ Excel 字段映射
      ↓
Markdown Note Generator
      ↓
Obsidian Vault inbox/
      ↓
Web Review / Inbox Preview
```

### 模块说明

```text
apps/api/server.js
```

本地 HTTP 服务，负责：

- 静态前端页面
- 文件上传接口 `/api/ingest`
- vault 健康检查 `/api/health`
- inbox 列表 `/api/vault/inbox`
- 读取笔记 `/api/vault/note`
- 打开本地路径 `/api/vault/open`

```text
apps/web/
```

原生 HTML/CSS/JS 前端，负责：

- 拖拽/选择文件上传
- 展示本次导入结果
- 展示摘要、frontmatter、Markdown 预览
- 展示 Excel 字段映射
- 展示 vault inbox 最近笔记
- 打开 Obsidian / 文件夹 / 页面预览

```text
packages/ingestion-core/
```

摄入核心逻辑，负责：

- 根据扩展名选择 parser
- 文档摘要、关键词、候选标签
- 概念候选抽取
- vault 双链候选匹配
- Excel 表格字段识别和目标字段映射
- 生成 Obsidian 风格 Markdown
- 写入 vault 和 manifest

## 项目结构

```text
Knowledge-Forge/
  apps/
    api/
      server.js          # 本地 HTTP API + 静态文件服务
    web/
      index.html         # 前端页面
      app.js             # 前端交互逻辑
      styles.css         # 页面样式
  packages/
    ingestion-core/
      config.js          # vault 路径和支持格式
      index.js           # parser / analyzer / note generator
  docs/
    WORKFLOW.md          # 完整工作流搭建与使用流程
    2026-06-04-dev-log.md
  test-fixtures/
    karpathy-test.md
    payroll-test.xlsx
  package.json
  README.md
```

## 快速开始

### 1. 安装依赖

```powershell
git clone https://github.com/577206/knowledge-forge.git
cd knowledge-forge
npm install
```

### 2. 配置你的 Obsidian Vault 路径

默认 vault 路径是开发者本机路径：

```text
E:\创作工坊\知识库\LLM-Wiki
```

推荐通过环境变量覆盖：

```powershell
$env:KF_VAULT_PATH="D:\Your\Obsidian\Vault"
npm run dev
```

也可以直接修改：

```text
packages/ingestion-core/config.js
```

### 3. 启动服务

```powershell
npm run dev
```

打开：

```text
http://localhost:4177
```

### 4. 使用最小闭环

1. 把 PDF / Markdown / TXT / Excel 拖到页面中。
2. 等待处理完成。
3. 查看“本次导入”。
4. 在右侧“知识库 Inbox”看到新笔记。
5. 点击：
   - `Obsidian`：打开对应 Obsidian 笔记
   - `文件夹`：打开本地文件位置
   - `预览`：在网页内查看 Markdown

## 常用命令

```powershell
npm run dev      # 启动本地服务
npm run check    # Node 语法检查
```

测试 fixture：

```powershell
node test-fixtures\ingest-fixtures.mjs
```

## API 简表

### `GET /api/health`

查看服务和 vault 状态。

### `POST /api/ingest`

上传文件并写入 vault inbox。

### `GET /api/vault/inbox?limit=30`

读取最近 inbox 笔记。

### `GET /api/vault/note?path=inbox/xxx.md`

读取 vault 内某篇 Markdown 笔记。

### `POST /api/vault/open`

打开 vault 或 vault 内文件所在位置。

Body 示例：

```json
{
  "path": "inbox/2026-06-04 - example.md"
}
```

## 安全边界

当前版本默认只写入 vault 的 `inbox/`，不会自动移动到正式目录。

代码里也做了 vault path 限制：读取/打开笔记时只能访问配置的 vault 目录内部，避免路径穿越。

不会提交：

- `node_modules/`
- `.uploads/`
- 本地 vault 内容
- token / `.env`
- 运行时缓存

## 当前限制

- PDF 解析是轻量方案，复杂版式和扫描件可能只能生成占位笔记。
- 摘要和关键词是规则版，不是深度 LLM 理解。
- 双链候选是轻量 token 匹配，还不是 BM25/向量检索。
- 当前版本没有 Agent 自动归档。
- 当前版本没有完整 rollback UI，只有 manifest 基础。

## 未来路线

1. `preview -> confirm write` 两阶段导入。
2. Markdown 在线编辑并保存回 vault。
3. BM25 + embedding 双链推荐。
4. DeepSeek / 本地 LLM provider adapter。
5. Agent Orchestrator：自动提出整理计划，但由人确认。
6. Excel DataObject 正式化：工资、药品库存、流水、审计、回滚。

## License

MIT
