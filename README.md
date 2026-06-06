# Knowledge Forge

> Local-first second-brain workbench for Obsidian, NotebookLM and Markdown knowledge vaults.  
> 把散乱资料炼成可复用知识：上传、解析、复核、进入 Obsidian，并可选接入 NotebookLM 生成摘要、测验、闪卡、报告/PDF 等学习材料。

Knowledge Forge 不是又一个“文件上传器”。它想解决的是一个更真实的问题：

```text
资料很多 → AI 问完就散了 → 笔记没有长期结构 → 下次还是从零开始
```

Knowledge Forge 给你一条本地优先的第二大脑工作流：

```text
PDF / 网页 / 课件 / Excel / Markdown
→ Knowledge Forge 本地摄入与预处理
→ Obsidian / Markdown vault inbox
→ NotebookLM 可选阅读、问答、测验、闪卡、报告/PDF
→ Agent / 人类复核
→ 长期知识库
```

核心原则：

> AI 和规则系统负责提出结构化建议，长期知识结构必须由人确认。

---

## 为什么需要它

很多知识管理工具的问题不是“不够智能”，而是没有形成闭环：

- PDF 下载了，但没人整理。
- NotebookLM 问过了，但答案留在会话里。
- Obsidian 很强，但资料进入成本高。
- AI 能总结，但直接写进长期知识库很危险。
- Excel、课程资料、论文、网页、项目文档彼此割裂。

Knowledge Forge 的定位是：

```text
本地资料入口 + Obsidian inbox + NotebookLM Bridge + 可复核的知识生成工作台
```

---

## 核心能力

### 1. Local Ingestion：本地资料摄入

支持上传：

```text
.pdf
.md / .markdown
.txt
.xlsx / .xls
.csv
```

输出：

- Obsidian 友好的 Markdown 笔记
- frontmatter
- 摘要、关键词、候选标签
- 概念候选
- 双链候选
- Excel sheet / 字段 / 类型 / 样例值 / 目标字段映射
- manifest，方便未来审计和回滚

默认只写入：

```text
<your-vault>/inbox/
```

避免自动化污染长期知识结构。

---

### 2. Review Workspace：复核工作台

本地页面：

```text
http://localhost:4177
```

可以：

- 拖拽上传文件
- 查看本次导入结果
- 预览 Markdown
- 查看 Excel 字段映射
- 查看 Obsidian inbox 最近笔记
- 打开 Obsidian 笔记
- 打开 vault 文件夹
- 查看知识图谱 Graph View

---

### 3. NotebookLM Bridge：可选增强

NotebookLM Bridge 是可选能力，不影响基础上传功能。

连接 NotebookLM 后，可以把资料进一步生成：

- Summary Digest：摘要笔记
- Study Guide：学习讲义
- Quiz：测验题
- Flashcards：闪卡
- Mind Map：思维导图
- Report / PDF：报告或 PDF
- Audio Overview：音频概览

当前页面已经提供 NotebookLM 连接状态入口；完整生成动作会逐步接入。

> 注意：`notebooklm-py` 是非官方社区项目，使用 NotebookLM 的非公开接口。适合个人研究和学习自动化，不适合存储他人 Google 登录态或做未经授权的 SaaS。

---

## 5 分钟上手

### Windows：双击启动

```text
start.bat
```

第一次运行会引导你配置：

```text
.env.local
```

内容示例：

```text
KF_VAULT_PATH=D:\Your\Obsidian\Vault
```

然后打开：

```text
http://localhost:4177
```

把 PDF / Markdown / TXT / Excel / CSV 拖进去，生成的 Markdown 会进入：

```text
<your-vault>/inbox/
```

---

### 命令行启动

```powershell
git clone https://github.com/577206/knowledge-forge.git
cd knowledge-forge
copy .env.example .env.local
notepad .env.local
npm install
npm run dev
```

打开：

```text
http://localhost:4177
```

---

## 从零搭建完整第二大脑工作流

如果你是完全新用户，按这个顺序来：

### 1. 安装 Node.js

```text
https://nodejs.org/
```

检查：

```powershell
node -v
npm -v
```

### 2. 安装 Python

```text
https://www.python.org/downloads/
```

检查：

```powershell
python --version
```

### 3. 安装 Obsidian

```text
https://obsidian.md/download
```

新建一个 vault，例如：

```text
D:\MyKnowledgeVault
```

建议建立：

```text
D:\MyKnowledgeVault\inbox
```

### 4. 配置 Knowledge Forge

```powershell
copy .env.example .env.local
notepad .env.local
```

写入：

```text
KF_VAULT_PATH=D:\MyKnowledgeVault
```

### 5. 启动并上传资料

```powershell
npm install
npm run dev
```

打开：

```text
http://localhost:4177
```

拖入一个 `.md` / `.txt` / `.pdf` / Excel 文件。确认 inbox 里出现笔记。

到这里，基础工作流已跑通。

---

## 可选：配置 NotebookLM Bridge

如果你想让 NotebookLM 帮你阅读资料、生成摘要/测验/闪卡/报告，就继续。

### 1. 安装 notebooklm-py

```powershell
python -m venv .venv-notebooklm
.\.venv-notebooklm\Scripts\python.exe -m pip install -U pip
.\.venv-notebooklm\Scripts\python.exe -m pip install "notebooklm-py[browser]"
```

检查：

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe --version
```

### 2. 登录 NotebookLM

推荐使用系统 Chrome：

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe login --browser chrome --fresh
```

登录完成后检查：

```powershell
.\check-notebooklm.bat
```

有效登录必须满足：

```json
{
  "status": "ok",
  "checks": {
    "token_fetch": true
  }
}
```

### 3. 在页面检查连接

启动 Knowledge Forge 后，首页会显示：

```text
NotebookLM Bridge
```

点击：

```text
检查连接
```

如果显示“已连接”，说明 NotebookLM Bridge 可以被 Skill / Agent 工作流调用。

---

## NotebookLM MVP 示例

创建测试 notebook：

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe create "Knowledge Forge Test" --json
```

添加公开网页：

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe source add -n <notebook_id> "https://en.wikipedia.org/wiki/Knowledge_management" --json
```

提问：

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe ask -n <notebook_id> "Summarize the core idea in 5 bullet points for an Obsidian note." --json
```

把结果整理成 Markdown，先放入：

```text
<your-vault>/inbox/
```

---

## 推荐 Vault 结构

```text
MyKnowledgeVault/
├─ inbox/                # 新资料和 AI 草稿先进这里
├─ 10_Schoolwork/        # 课程、作业、考试
├─ 20_Research/          # 论文、科研线索
├─ 30_Reading/           # 书、文章、网页
├─ 40_Projects/          # 项目资料、交付、复盘
├─ 50_Knowledge/         # 长期知识卡片
├─ 80_Assets/            # 图片、PDF、附件
├─ 90_Archive/           # 归档
└─ Templates/            # 模板
```

---

## 内置 Skills

项目内置两个 Skill：

```text
skills/knowledge-forge/SKILL.md
skills/notebooklm-obsidian-second-brain/SKILL.md
```

推荐使用一站式入口：

```text
skills/knowledge-forge/SKILL.md
```

它包含：

- Local Ingestion 模式
- NotebookLM Bridge 模式
- 输出动作选择：summary / quiz / flashcards / mind-map / report/PDF / audio
- Obsidian 写回规范
- 安全边界
- MVP 验收标准

---

## 安全模型

Knowledge Forge 默认坚持：

```text
local-first
inbox-first
human-review-first
```

不要公开或提交：

```text
.env
.env.local
.notebooklm/
storage_state.json
NOTEBOOKLM_AUTH_JSON
Google Cookie
真实私人课程资料
未授权论文 / 教材 / 内部文件
```

可以公开：

```text
Vault 文件夹结构
模板
脱敏示例笔记
使用方法
工作流总结
```

如果误传登录态或密钥，第一步不是只删文件，而是立刻撤销/轮换。

---

## 技术架构

```text
Browser UI
  ↓ multipart upload
Node HTTP API
  ↓
Ingestion Core
  ├─ Text / Markdown parser
  ├─ PDF parser / fallback
  └─ Spreadsheet parser
      ↓
Rules-based analyzer
  ├─ summary / keywords / tags
  ├─ concept candidates
  ├─ backlink candidates
  └─ Excel field mapping
      ↓
Markdown Note Generator
      ↓
Obsidian vault inbox
      ↓
Review Workspace / Graph View
      ↓ optional
NotebookLM Bridge
  ├─ source add
  ├─ ask
  ├─ quiz / flashcards / report / audio
  └─ write back to inbox
```

---

## 项目结构

```text
Knowledge-Forge/
  apps/
    api/server.js
    web/index.html
    web/app.js
    web/graph.js
    web/styles.css
  packages/
    ingestion-core/config.js
    ingestion-core/index.js
  docs/
    QUICKSTART.md
    SETUP_SECOND_BRAIN_WORKFLOW.md
    NOTEBOOKLM_OBSIDIAN_WORKFLOW.md
    NOTEBOOKLM_MVP_RUN_2026-06-06.md
  skills/
    knowledge-forge/SKILL.md
    notebooklm-obsidian-second-brain/SKILL.md
  test-fixtures/
  start.bat
  check-notebooklm.bat
  package.json
```

---

## 常用命令

```powershell
npm run dev      # 启动本地服务
npm run check    # Node 语法检查
npm test         # 测试图谱控制逻辑
```

NotebookLM 检查：

```powershell
.\check-notebooklm.bat
```

---

## Roadmap

### v0.1 Local Ingestion

- 文件上传
- Markdown 生成
- Obsidian inbox
- Review 页面
- Graph View

### v0.2 NotebookLM Bridge

- 连接状态检查
- notebook/source 管理
- 摘要、测验、闪卡、报告/PDF 输出选择
- 写回 Obsidian inbox

### v0.3 Review Queue

- 批量复核
- 接受/拒绝候选双链
- Promote from inbox
- 回滚 manifest

### v0.4 Skill Ecosystem

- OpenClaw / Claude Code Skill
- 学生学习工作流
- 科研工作流
- 企业知识库工作流

---

## License

MIT
