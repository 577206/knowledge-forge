# Knowledge Forge

> **Agent-first 的本地知识摄入与学习工作台。**  
> 融合 Obsidian 的长期知识库能力与 Google NotebookLM 的深度阅读能力，为 Claude Code / Cursor / Codex 等 AI Agent 时代打造一套可配置、可复核、可持续积累的学习工作流。

Knowledge Forge 的创作理念很简单：

> 让用户不再独自面对散乱资料、复杂配置和一次性 AI 对话，而是把学习系统交给自己的 Agent 协同搭建、运行和迭代。

你只需要把这个 GitHub 仓库链接发给你的 AI Agent：

```text
https://github.com/577206/knowledge-forge
```

然后告诉它：

```text
请帮我安装和配置 Knowledge Forge，先问我要启用哪些能力。
```

Agent 会引导你选择功能、安装依赖、生成配置、启动程序，并帮你排查问题。你可以按需启用本地资料整理、期末复习、Obsidian 联动、NotebookLM 联动等能力，逐步把散乱的 PDF、课件、论文、Excel 和 Markdown 资料，炼成可复习、可追溯、可沉淀的长期知识。

Knowledge Forge 适合但不限于：

- **期末复习备考**：课程资料摄入、考点整理、学习指南、闪卡、测验题、冲刺计划。
- **学术研究与论文阅读**：论文解析、NotebookLM 深度阅读、摘要消化、引用与概念沉淀。
- **报告与项目资料整理**：把网页、文档、表格和研究材料转成结构化 Markdown。
- **个人第二大脑构建**：与 Obsidian Vault 协同，把 AI 生成内容纳入长期知识库。
- **Agent 协同学习工作流**：让 Agent 成为配置员、整理员、复盘教练和知识库维护者。

目标不是再做一个“文件上传器”，而是帮助你快速成为 **AI 时代下更高效的学习者和知识工作者**。

## 推荐：全功能安装

Knowledge Forge 支持模块化启用，但我强烈推荐新用户直接选择 **Full Setup 全功能安装**。这也是作者自己的使用方式：

```text
Local Forge 本地摄入
+ Final Exam Review 期末复习工作流
+ Obsidian 长期知识库
+ NotebookLM 深度阅读
+ Agent 协同配置、排障与复盘
```

全功能安装的好处是：

- **资料进得来**：PDF、课件、Markdown、Excel 都能先进入本地工作台。
- **理解更深入**：NotebookLM 负责长文档、论文、课程资料的 source-grounded 阅读和问答。
- **知识留得住**：Obsidian 把结果沉淀进长期第二大脑，而不是散落在一次性聊天里。
- **复习更直接**：期末复习流程可以生成学习指南、闪卡、测验、冲刺计划和考点清单。
- **Agent 全程协同**：你的 Agent 不只是安装工具，还能帮你选择功能、生成配置、解释报错、复核笔记和持续迭代。

如果你暂时只想本地使用，也可以先启用 Local Forge；后续要加入 Obsidian、NotebookLM 或期末复习增强时，可以通过兼容的配置接口继续添加，不需要推倒重装。

给 Agent 的快速指令：

```text
请帮我安装和配置 Knowledge Forge。
推荐使用 Full Setup；如果我想简化，再问我要启用哪些能力。
请先阅读 AGENTS.md 和 `docs/AGENT_TOOLS_AND_SKILLS.md`，然后优先运行这些命令：

1. .\doctor.ps1
2. .\setup.ps1 -Full
3. .\configure.ps1 -Full
4. .\start.ps1
5. .\verify.ps1 -Smoke -StartServer

如果根目录脚本不可用，再使用 .\scripts\doctor.ps1 这类 scripts/ 下的等价脚本。
```

---

Knowledge Forge 想解决的是一个更真实的问题：

```text
资料很多 → AI 问完就散了 → 笔记没有长期结构 → 下次还是从零开始
```

Knowledge Forge 给你一条本地优先的第二大脑工作流：

```text
PDF / 网页 / 课件 / Excel / Markdown
→ Knowledge Forge 本地摄入与预处理
→ Obsidian / Markdown vault inbox
→ Agent 正式生成复习包/笔记/报告（Claude Code / Codex）
→ NotebookLM 可选深度阅读、问答和人工搬运输出
→ 本地轻量规则仅作为草稿 fallback
→ 人类复核
→ 长期知识库
```

核心原则：

> 正式学习产物优先由本机 Agent 基于完整 source pack 生成；NotebookLM 是可选的 source-grounded 深度阅读增强；本地轻量规则只作为离线 fallback 草稿。长期知识结构必须由人确认。

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

连接 NotebookLM 后，可以辅助资料深度阅读，并由用户或 Agent 把输出整理回 Knowledge Forge。当前正式输出主链路仍是 Agent；NotebookLM 自动生成能力按可用性逐步接入。可产出类型包括：

- Summary Digest：摘要笔记
- Study Guide：学习讲义
- Quiz：测验题
- Flashcards：闪卡
- Mind Map：思维导图
- Report / PDF：报告或 PDF
- Audio Overview：音频概览

当前页面已经提供 NotebookLM 连接状态入口和人工捕获/整理工作流；不要把它描述成已完全自动化的主链路。

> 注意：`notebooklm-py` 是非官方社区项目，使用 NotebookLM 的非公开接口。适合个人研究和学习自动化，不适合存储他人 Google 登录态或做未经授权的 SaaS。

---



> 新用户电脑可能没有任何 Agent/CLI 配置。完整依赖、Agent runner、Skills、Tools 和空白电脑安装路线见：`docs/AGENT_TOOLS_AND_SKILLS.md`。

## 5 分钟上手

### Windows：双击启动

```text
start.bat
```

第一次运行会自动检查 Node/npm、安装 npm 依赖、创建默认配置、运行 doctor，并打开：

```text
http://localhost:4177
```

如果你想让 Agent 或 PowerShell 完整验证这台电脑是否真的可用：

```powershell
.\doctor.ps1
.\setup.ps1 -Full
.\configure.ps1 -Full
.\start.ps1
.\verify.ps1 -Smoke -StartServer
```

通过标准：服务健康检查、上传、inbox 写入、Agent pack 生成、轻量 fallback 草稿、真实 PDF 导出、artifact registry 全部通过。Agent/Codex 调用另有可选 smoke。

Vault 配置在：

```text
.env.local
```

内容示例：

```text
KF_VAULT_PATH=D:\Your\Obsidian\Vault
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

如果你想让 NotebookLM 帮你做 source-grounded 阅读、问答，或手动生成摘要/测验/闪卡/报告并整理回 inbox，就继续。正式复习包/报告仍建议走本机 Agent。

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

- Forge MCP Server / Claude Code Skill / Codex workflow
- 学生学习工作流
- 科研工作流
- 企业知识库工作流

---

## License

MIT


---

## 诚实的生成链路说明

- **正式输出**：完整复习包、学习报告、可导出 PDF 的主体 Markdown，优先走本机 Agent（Claude Code / Codex）。Agent 会读取 `.knowledge-forge/agent-packs/` 中的 manifest、AGENT_TASK 和 chunks。
- **轻量规则**：`summary / study-guide / quiz / flashcards` 的本地规则产物只是 fallback 草稿，用于快速预览和无 Agent 环境下的最低可用结果，不等同于深度理解。
- **NotebookLM**：可选增强，适合 source-grounded 阅读和 Q&A；当前以用户登录、手动生成/捕获、Agent 整理回写为可靠路径，不要求也不保存 Google 密码/cookies。
- **Codex**：当前已作为主界面可选 Agent runner；通过 stdin 传入 Prompt，避免 Windows 长命令参数问题。
- **OpenClaw**：不再由 Forge 网页启动；后续应通过 Forge MCP Server 反向调用 `ingest_document / run_custom_agent_task / export_review_pdf`。
