# 从零搭建 NotebookLM × Obsidian × Knowledge Forge 工作流

> 目标：不用配置 Agent，也能把资料上传、整理、写入 Obsidian，并逐步接入 NotebookLM 做资料问答和复习材料生成。

这份文档面向第一次使用的人。你只需要会安装软件、复制路径、运行简单命令。

---

## 你最终会得到什么

跑通后，你会有这样一条工作流：

```text
PDF / 网页 / 课件 / Excel / Markdown
→ Knowledge Forge 本地上传和预处理
→ 写入 Obsidian vault 的 inbox
→ NotebookLM 阅读资料并回答问题
→ 生成摘要 / 测验 / 闪卡 / 提纲
→ 再整理成 Obsidian Markdown 笔记
```

简单理解：

- **Knowledge Forge**：本地资料入口，把文件变成 Markdown 草稿。
- **Obsidian**：长期知识库，保存你真正要复用的笔记。
- **NotebookLM**：临时阅读室，用来读资料、问答、生成复习材料。
- **notebooklm-py**：让命令行能自动操作 NotebookLM。

---

## 一、准备软件

### 1. 安装 Node.js

Knowledge Forge 是 Node.js 项目。

建议安装 Node.js 20 或更高版本：

```text
https://nodejs.org/
```

安装后打开 PowerShell，检查：

```powershell
node -v
npm -v
```

能显示版本号即可。

---

### 2. 安装 Python

NotebookLM 自动化需要 Python。

建议 Python 3.10 或更高版本：

```text
https://www.python.org/downloads/
```

安装时建议勾选：

```text
Add Python to PATH
```

检查：

```powershell
python --version
```

---

### 3. 安装 Obsidian

下载：

```text
https://obsidian.md/download
```

安装后，新建一个 Vault，例如：

```text
D:\MyKnowledgeVault
```

如果你已经有 Obsidian vault，可以直接使用已有路径。

建议 vault 里至少有一个 inbox 文件夹：

```text
D:\MyKnowledgeVault\inbox
```

Knowledge Forge 会把新生成的 Markdown 草稿写进这里。

---

### 4. 准备 Google / NotebookLM

打开：

```text
https://notebooklm.google.com/
```

确认你能正常访问并登录 Google 账号。

> 注意：NotebookLM 和 notebooklm-py 涉及 Google 登录态。不要把 Cookie、验证码、storage_state.json 发给任何人，也不要提交到 GitHub。

---

## 二、下载 Knowledge Forge

打开 PowerShell，进入你想放项目的位置，例如：

```powershell
cd D:\Projects
```

克隆项目：

```powershell
git clone https://github.com/577206/knowledge-forge.git
cd knowledge-forge
```

如果你不会用 git，也可以在 GitHub 页面点 Download ZIP，解压后进入项目目录。

---

## 三、配置 Obsidian Vault 路径

复制配置文件：

```powershell
copy .env.example .env.local
notepad .env.local
```

把里面的路径改成你的 Obsidian vault 路径：

```text
KF_VAULT_PATH=D:\MyKnowledgeVault
```

例如你的 vault 在桌面：

```text
KF_VAULT_PATH=C:\Users\YourName\Desktop\MyKnowledgeVault
```

保存并关闭记事本。

---

## 四、启动 Knowledge Forge

### Windows 推荐方式

双击项目里的：

```text
start.bat
```

它会自动：

1. 检查依赖。
2. 第一次运行时安装依赖。
3. 读取 `.env.local`。
4. 启动本地服务。
5. 打开网页：

```text
http://localhost:4177
```

---

### 命令行方式

也可以手动运行：

```powershell
npm install
npm run dev
```

然后浏览器打开：

```text
http://localhost:4177
```

---

## 五、用 Knowledge Forge 上传资料

打开本地网页后，你会看到上传区域。

支持：

```text
.pdf
.md / .markdown
.txt
.xlsx / .xls
.csv
```

使用方式：

1. 把文件拖进页面。
2. 等待解析完成。
3. 查看“本次导入”。
4. 右侧会显示 Obsidian inbox 最近笔记。
5. 可以点：
   - `Obsidian`：打开对应笔记。
   - `文件夹`：打开文件位置。
   - `预览`：在网页里查看 Markdown。

生成的笔记会进入：

```text
<你的 vault>\inbox\
```

到这里，基础工作流已经跑通。

---

## 六、安装 notebooklm-py

如果你只想用 Knowledge Forge 上传资料，可以跳过这一节。

如果你想让 NotebookLM 帮你阅读资料、生成摘要/测验/闪卡，就继续。

在 Knowledge Forge 项目目录下运行：

```powershell
python -m venv .venv-notebooklm
.\.venv-notebooklm\Scripts\python.exe -m pip install -U pip
.\.venv-notebooklm\Scripts\python.exe -m pip install "notebooklm-py[browser]"
```

检查：

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe --version
```

能看到版本号即可。

---

## 七、登录 NotebookLM

推荐使用系统 Chrome 登录：

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe login --browser chrome --fresh
```

它会打开 Google 登录窗口。

你需要自己完成登录。

登录成功后检查：

```powershell
.\check-notebooklm.bat
```

或者：

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe auth check --test --json
```

看到下面两个条件才算成功：

```json
{
  "status": "ok",
  "checks": {
    "token_fetch": true
  }
}
```

如果登录窗口没有弹出，可以看任务栏是否有 Chrome 窗口，标题一般类似：

```text
登录 - Google 账号 - Google Chrome
```

---

## 八、跑通 NotebookLM 最小测试

### 1. 创建 Notebook

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe create "Knowledge Forge Test" --json
```

复制返回里的 notebook id。

下面用 `<notebook_id>` 表示。

---

### 2. 添加一个公开网页资料

先用公开网页测试，不要一开始就上传私人文件。

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe source add -n <notebook_id> "https://en.wikipedia.org/wiki/Knowledge_management" --json
```

---

### 3. 提问

```powershell
.\.venv-notebooklm\Scripts\notebooklm.exe ask -n <notebook_id> "Summarize the core idea in 5 bullet points for an Obsidian note." --json
```

如果返回回答，说明 NotebookLM 自动化已经跑通。

---

## 九、把 NotebookLM 输出写回 Obsidian

最简单做法：

1. 把 NotebookLM 回答复制出来。
2. 在 vault 的 inbox 里新建 Markdown 文件。
3. 按下面模板整理。

模板：

```markdown
---
type: notebooklm-digest
status: draft
source_tool: notebooklm-py
created: 2026-06-06
review_required: true
---

# 主题名称

## Source scope

- NotebookLM notebook:
- Sources:

## Summary

- ...

## Key concepts

- [[概念1]]
- [[概念2]]

## Evidence to verify

- 哪些结论需要回源材料确认？

## Open questions

- 还有哪些不确定？

## Next actions

- [ ] 复核来源
- [ ] 拆成知识卡片
- [ ] 移动到正式目录
```

推荐先写到：

```text
<your-vault>\inbox\
```

确认无误后，再移动到课程、研究、阅读或项目目录。

---

## 十、推荐 Vault 结构

刚开始不用复杂。可以这样：

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

核心原则：

```text
AI 生成的内容先进入 inbox，人工复核后再沉淀。
```

---

## 十一、安全注意事项

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

如果误把 Cookie、token、登录态传到公开仓库，第一步不是只删文件，而是：

```text
立刻退出相关账号 / 轮换密钥 / 撤销登录态
```

---

## 十二、常见问题

### 1. Knowledge Forge 和 NotebookLM 是什么关系？

Knowledge Forge 是本地入口，负责上传、解析、写入 Obsidian inbox。

NotebookLM 是资料阅读工具，负责围绕资料问答、总结、生成学习材料。

两者可以独立使用，也可以组合。

---

### 2. 为什么不直接让 NotebookLM 当长期知识库？

因为长期知识最好是本地 Markdown：

- 可迁移
- 可搜索
- 可版本管理
- 可链接
- 不被单一平台锁死

NotebookLM 更适合临时阅读和资料问答。

---

### 3. 为什么所有东西先进入 inbox？

因为 AI 会犯错，也可能误解资料。

先进入 inbox，意味着：

```text
先复核，再沉淀。
```

这样不会污染长期知识库。

---

### 4. notebooklm-py 是官方的吗？

不是。

它是社区项目，使用 NotebookLM 的非公开接口。

优点是自动化能力强；风险是 Google 可能改接口，导致它临时失效。

所以不要把它用于高度敏感或生产关键场景。

---

## 十三、你第一次应该怎么用

建议不要一上来导入几百个文件。

第一次只做一个小测试：

1. 建一个空 Obsidian vault。
2. 配好 `.env.local`。
3. 启动 Knowledge Forge。
4. 上传一个 Markdown 或 PDF。
5. 确认 inbox 里出现笔记。
6. 登录 NotebookLM。
7. 创建一个测试 notebook。
8. 添加一个公开网页。
9. 问一个问题。
10. 把回答整理成一篇 inbox Markdown。

如果这 10 步都成功，你的第二大脑工作流就跑通了。

---

## 十四、下一步

跑通后，你可以开始做真实场景：

- 一门课的复习系统
- 一批论文的研究线索
- 一本书的观点卡片
- 一个项目的资料整理
- 一个比赛方案的知识库

记住一句话：

> NotebookLM 负责读资料，Knowledge Forge 负责进知识库，Obsidian 负责长期记忆，人负责最终判断。
