# SETUP.md — Knowledge Forge 安装与验证

Knowledge Forge 的目标是：在任何一台普通 Windows 电脑上，由用户或 Agent 快速完成安装、配置、启动和 smoke test。

如果用户电脑上 Agent/CLI 什么都没配置，先读：`docs/AGENT_TOOLS_AND_SKILLS.md`。

## 最短路径：双击启动

```text
start.bat
```

它会做这些事：

1. 检查 Node.js / npm。
2. 如果缺少 `node_modules`，自动执行 `npm install`。
3. 如果缺少 `.env.local`，自动创建并默认使用项目内 `vault-demo`。
4. 如果缺少 `knowledge-forge.config.json`，从模板创建。
5. 运行 doctor。
6. 打开 `http://localhost:4177`。

## Agent / PowerShell 推荐流程

```powershell
.\doctor.ps1
.\setup.ps1 -Full
.\configure.ps1 -Full
.\start.ps1
.\verify.ps1 -Smoke -StartServer
```

根目录脚本只是包装器；等价脚本也在：

```powershell
.\scripts\doctor.ps1
.\scripts\setup.ps1 -Full
.\scripts\configure.ps1 -Full
.\scripts\start.ps1
.\scripts\verify.ps1 -Smoke -StartServer
```

## Full Setup 会启用什么

- Local Forge：本地上传、解析、写入 inbox。
- Final Exam Review：生成 Agent 可读 source pack，用本机 Agent 做完整复习包。
- Obsidian Bridge：写入/打开 Obsidian vault。
- NotebookLM Bridge：可选增强；登录需要用户自己在 Chrome 完成。
- PDF Export：Pandoc + Chrome/Edge 导出真实 PDF。

## 必需依赖

- Node.js 20+
- npm
- `.env.local` 中的 `KF_VAULT_PATH`
- 一个可写的 `inbox/` 目录

## 推荐依赖

- Chrome 或 Edge：真实 PDF 导出需要。
- Pandoc：Markdown → HTML → PDF 渲染需要。
- Claude Code 或 Codex：正式 Agent 输出需要。
- Obsidian：推荐，但不是必须；没有 Obsidian 也能使用 Markdown 文件夹。

## 可选依赖

- Python 3.10+
- `notebooklm-py`
- Google NotebookLM 登录状态

NotebookLM 是可选增强，不是 v0.1 主链路。不要把 Google 密码、cookies、storage state 交给 Agent。

## 验证标准

运行：

```powershell
.\verify.ps1 -Smoke -StartServer
```

通过代表：

- `npm run check` 通过。
- doctor 必需项通过。
- `/api/health` 可访问。
- `/api/capabilities` 可访问。
- Markdown 文件可上传。
- Obsidian/Markdown inbox 中生成源笔记。
- `.knowledge-forge/agent-packs/` 中生成 Agent pack。
- 本地轻量 fallback 草稿可生成（它不是正式深度输出）。
- `.knowledge-forge/pdf/` 中生成真实 PDF。
- artifact registry 有记录。

可选 Agent 验证：

```powershell
.\verify.ps1 -AgentSmoke
```

通过代表本机 Agent CLI 可用于最小响应验证。注意：Forge 网页不再启动 OpenClaw；OpenClaw 后续应通过 MCP 反向调用 Forge。

可选 Codex CLI 验证：

```powershell
.\verify.ps1 -CodexSmoke
```

Codex smoke 确认本机 Codex CLI 可响应一个最小提示；当前 UI 主链路支持 Claude Code / Codex。

## 只想本地模式

```powershell
.\setup.ps1 -LocalForge
.\configure.ps1 -LocalForge
.\start.ps1
```

本地模式不需要 Google 登录，也不强制需要 Obsidian。

## 后续补能力

补 Obsidian：

```powershell
.\configure.ps1 -Obsidian -VaultPath "D:\Your\Obsidian\Vault"
```

补 NotebookLM：

```powershell
.\setup.ps1 -NotebookLM
.\configure.ps1 -NotebookLM
```

然后在普通 Chrome 中手动完成 Google 登录。


## 手动 / 脚本 Smoke 建议

1. 启动服务：`./verify.ps1 -Smoke -StartServer`（验证上传、inbox、agent-pack、轻量 fallback、PDF、artifact registry）。
2. 打开 `http://localhost:4177`，上传 `test-fixtures/verify-smoke.md` 或任一脱敏 fixture。
3. 在页面选择自定义/复习 prompt 或勾选“完整复习包”；确认页面提示资料已准备给 Agent 阅读。
4. 分别选择可用引擎生成：Claude Code / Codex。OpenClaw 不从网页启动；后续通过 MCP 调 Forge。
5. 勾选 PDF，确认 `.knowledge-forge/pdf/` 生成真实 `.pdf`，并在 artifacts 列表中能看到记录。
