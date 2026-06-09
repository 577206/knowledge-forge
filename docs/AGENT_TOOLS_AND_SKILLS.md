# AGENT_TOOLS_AND_SKILLS.md — Agent / Skills / Tools 依赖清单

> 目标：假设用户电脑上除了项目源码之外什么 Agent 都没配置，也能知道哪些工具必须装、哪些可选、哪些不要强求，以及 Agent 应该如何合理地运行 Knowledge Forge。

Knowledge Forge 的原则：

```text
解析归 Forge
思考归 Agent
沉淀归 Obsidian / Markdown vault
导出归 PDF exporter
```

当前 v0.1 稳定主链路：

```text
文件上传
→ Local Forge 解析
→ Obsidian/Markdown inbox 源笔记
→ agent-pack chunks
→ Claude Code 或 Codex 读取 chunks 生成正式输出
→ 可选 PDF 导出
```

OpenClaw 当前不再由 Forge 网页启动。正确方向是后续让 OpenClaw 通过 MCP 反向调用 Forge。

---

## 1. 最小可运行环境（必须）

这些是 Forge 本体运行必须项。

| 工具 | 用途 | 检查命令 | 自动处理策略 |
|---|---|---|---|
| Node.js 20+ | 运行 API/web server | `node -v` | 缺失时让用户安装 Node.js LTS/20+；系统级安装前需要用户确认 |
| npm | 安装 JS 依赖 | `npm -v` | 跟随 Node.js 安装 |
| npm dependencies | PDF/DOCX/Excel 解析库 | `npm install` / `npm run check` | Agent 可自动执行 `npm install` |
| `.env.local` | 配置 vault 路径 | 文件存在 | Agent 可从 `.env.example` 复制创建 |
| `KF_VAULT_PATH` | Markdown/Obsidian vault | `.
\scripts\doctor.ps1` | 未配置时使用 `vault-demo/` 或询问用户 vault 路径 |
| `inbox/` 目录 | 写入源笔记和生成结果 | 目录存在 | Agent 可自动创建 |

最小启动：

```powershell
.\setup.ps1 -LocalForge
.\configure.ps1 -LocalForge
.\start.ps1
```

最小验证：

```powershell
.\verify.ps1 -Smoke -StartServer
```

---

## 2. 推荐工具（完整体验）

这些不是 Forge 本体必须，但会显著改善体验。

| 工具 | 用途 | 检查命令 | 缺失时表现 |
|---|---|---|---|
| Chrome 或 Edge | PDF 导出时 headless print | doctor 自动检查常见路径 | 不能导出真实 PDF，只保留 Markdown |
| Pandoc | Markdown → HTML | `pandoc --version` | PDF 导出不可用 |
| Obsidian | 长期知识库 UI | 自动检查常见安装路径 | 仍可写 Markdown vault，但不能一键 Obsidian 打开 |
| Claude Code | 正式 Agent 生成，当前推荐默认 | `claude --version` | 可改用 Codex |
| Codex CLI | 正式 Agent 生成，稳定可选 | `codex --version` | 可改用 Claude Code |

完整安装：

```powershell
.\setup.ps1 -Full
.\configure.ps1 -Full
.\verify.ps1 -Smoke -StartServer
.\verify.ps1 -CodexSmoke
```

---

## 3. Agent 运行器支持状态

### Claude Code — 推荐默认

用途：

- 读取 agent-pack chunks
- 生成正式复习包/报告/自定义任务
- 适合长文档和复杂输出

Forge 调用方式：

```text
claude --bare --dangerously-skip-permissions --permission-mode bypassPermissions --add-dir <packDir> --print <prompt>
```

注意：

- 需要用户已完成 Claude Code 配置/登录。
- 不要把 `.env.local`、cookies、NotebookLM auth 等提交或上传。

### Codex CLI — 稳定可选

用途：

- 读取 agent-pack chunks
- 生成正式 Markdown 输出
- 支持自定义 prompt
- 已作为 Forge UI 可选 Agent

Forge 调用方式：

```text
codex exec --skip-git-repo-check -C <packDir> --sandbox read-only --output-last-message <tmpFile> -
```

Prompt 通过 stdin 传入，原因：

- Windows 命令行直接传长 prompt 会被截断或触发长度限制。
- stdin 更适合中文、多行、长 prompt。

验证：

```powershell
.\verify.ps1 -CodexSmoke
```

### OpenClaw — 不再由网页启动，后续走 MCP

不要从 Forge 网页运行：

```text
Forge web → openclaw agent --message <long prompt/chunks>
```

原因：

- Windows 命令行会出现 `spawn ENAMETOOLONG`。
- 新开 OpenClaw session 会重新加载上下文，容易超时。
- 当前聊天里的 OpenClaw 和 Forge 网页启动的 OpenClaw 不是同一个运行上下文。

正确方向：

```text
OpenClaw 当前会话 → Forge MCP Server → ingest / generate / export
```

也就是：OpenClaw 应该调用 Forge，而不是 Forge 再启动 OpenClaw。

---

## 4. NotebookLM Bridge 支持状态

NotebookLM 是可选增强，不是 v0.1 主链路。

| 工具 | 用途 | 检查 |
|---|---|---|
| Python 3.10+ | 创建本地 venv | `python --version` |
| `.venv-notebooklm` | 隔离 notebooklm-py | `Test-Path .venv-notebooklm` |
| notebooklm-py | NotebookLM 非官方桥接 | `.\.venv-notebooklm\Scripts\notebooklm.exe auth check --test --json` |
| Chrome | 用户手动登录 Google | 浏览器存在 |

安全原则：

- 不问 Google 密码。
- 不上传 cookies / `storage_state.json` / auth 文件。
- 优先手动模式：用户在 NotebookLM 页面生成内容，Forge 捕捉并写入 Obsidian。

当前可靠模式：

```text
打开 NotebookLM
→ 用户自己登录/上传/生成
→ 粘贴结果到 Forge
→ Forge 写入 Obsidian inbox
```

---

## 5. 项目内置脚本

根目录 wrapper：

```powershell
.\doctor.ps1
.\setup.ps1
.\configure.ps1
.\start.ps1
.\verify.ps1
.\test-plan.ps1
```

实际脚本在：

```powershell
.\scripts\doctor.ps1
.\scripts\setup.ps1
.\scripts\configure.ps1
.\scripts\start.ps1
.\scripts\verify.ps1
.\scripts\test-plan.ps1
```

Agent 应优先使用根目录 wrapper；如果 wrapper 不存在，再使用 `scripts/` 下脚本。

### doctor

```powershell
.\doctor.ps1
```

检查：

- Node/npm
- dependencies
- `.env.local`
- vault/inbox
- Chrome/Edge
- Pandoc
- Claude Code
- Codex
- Obsidian
- Python/NotebookLM

### setup

```powershell
.\setup.ps1 -Full
```

可自动做：

- `npm install`
- 创建 `.env.local`
- 创建 `knowledge-forge.config.json`
- 可选创建 NotebookLM venv 并安装 Python 包

### configure

```powershell
.\configure.ps1 -Full -VaultPath "D:\Your\Vault"
```

写入：

- `.env.local`
- `knowledge-forge.config.json`
- 创建 vault/inbox

### verify

```powershell
.\verify.ps1 -Smoke -StartServer
.\verify.ps1 -CodexSmoke
```

验证主链路和 Codex CLI。

---

## 6. Skills / 外部项目

### final-exam-review-skill

参考仓库：

```text
https://github.com/577206/final-exam-review-skill
```

用途：

- 提供复习包结构参考
- SCAN → EXTRACT → FUSE → REVIEW → BUILD 思路
- Markdown/PDF/Mock exam/Flashcards 输出方向

当前 Forge 不要求用户先安装这个 skill。Forge 已内置类似 prompt 结构。未来可把它作为高级模板或导入 preset。

### Knowledge Forge 自带 skill

路径：

```text
skills/knowledge-forge/SKILL.md
```

用途：

- 给 OpenClaw/Claude 等 Agent 说明如何操作 Forge
- 高级用户可以把仓库作为 Agent skill 使用

但 v0.1 不依赖它；普通用户只需要 Web App + scripts。

---

## 7. 空白电脑推荐安装路线

### 路线 A：最小本地版

适合只想先上传资料、写 Markdown vault 的用户。

```powershell
npm install
.\configure.ps1 -LocalForge
.\start.ps1
.\verify.ps1 -Smoke -StartServer
```

需要：Node.js / npm。

不需要：Obsidian、Claude、Codex、NotebookLM。

### 路线 B：推荐学习版

适合学生/研究者。

```powershell
.\setup.ps1 -Full
.\configure.ps1 -Full
.\verify.ps1 -Smoke -StartServer
.\verify.ps1 -CodexSmoke
```

需要：

- Node/npm
- Pandoc
- Chrome/Edge
- Claude Code 或 Codex
- Obsidian 推荐

### 路线 C：Agent-first 完整版

适合把 Forge 作为本地知识加工引擎。

```text
Claude Code or Codex
+ Knowledge Forge Web App
+ Obsidian vault
+ Pandoc/Chrome PDF export
+ optional NotebookLM manual bridge
```

未来加入：Forge MCP Server。

---

## 8. Agent 自动化策略

Agent 在用户电脑上操作时应该遵守：

### 可以自动做

- 读取项目文档
- 运行 `doctor`
- 运行 `npm install`
- 创建 `.env.local`
- 创建 `knowledge-forge.config.json`
- 创建 `vault-demo/inbox`
- 运行 `verify`
- 安装 Python venv 内的包
- 写入项目文档/配置

### 需要用户确认

- 安装 Node.js / Chrome / Pandoc / Obsidian
- 系统级包管理器安装
- 修改系统 PATH
- 登录 Google / Claude / Codex
- 打开浏览器登录页面
- 删除/覆盖用户 vault 文件

### 禁止自动做

- 读取或上传 Google cookies
- 提交 `.env.local`
- 提交用户 vault 内容
- 把私人资料上传到外部服务
- 假装 local-rules 是高质量 AI 输出
- 从 Forge 网页启动 OpenClaw 处理长 chunks

---

## 9. 故障与降级

| 问题 | 处理 |
|---|---|
| 没有 Claude/Codex | 只能生成 local-rules fallback 草稿 |
| 没有 Pandoc/Chrome | 只输出 Markdown，不导出 PDF |
| 没有 Obsidian | 使用普通 Markdown vault 文件夹 |
| NotebookLM 未登录 | NotebookLM Bridge 显示 needs_login，不影响主链路 |
| OpenClaw 网页运行报 `ENAMETOOLONG` | 不从网页运行 OpenClaw；后续通过 MCP 调 Forge |
| PDF 抽取质量差 | 生成 placeholder/source note，提示用户换 OCR/导出版 PDF |

---

## 10. 未来 MCP Server 对应工具

Forge 做 MCP 后，应优先暴露：

```text
get_capabilities
ingest_document
run_custom_agent_task
export_review_pdf
open_artifact
```

然后再做：

```text
search_vault
create_obsidian_note
generate_flashcards
generate_quiz
list_recent_inbox
```

效果：

```text
Claude / Cursor / OpenClaw / Codex
→ 调 Forge MCP
→ Forge 解析、生成、导出、写入 vault
```

这样 OpenClaw 就不需要被 Forge 网页启动，而是当前 OpenClaw 会话直接调用 Forge 能力。
