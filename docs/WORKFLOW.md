# Knowledge Forge 工作流搭建流程

这份文档写给第一次打开项目的人：你不需要理解全部源码，只要跟着流程走，就能把自己的文件送进 Obsidian / Markdown 知识库。

## 1. 你将搭建出什么

最终效果：

```text
本地浏览器页面
  ↓ 上传文件
Knowledge Forge 本地服务
  ↓ 解析文件
生成 Markdown 笔记
  ↓ 写入
你的 Obsidian Vault / inbox
  ↓
网页右侧显示最近笔记，可预览、打开 Obsidian、打开文件夹
```

当前版本不做 Agent 自动归档。它的定位是“知识库直通车”：先把输入管道打通，让资料安全进入 inbox，后续再人工整理。

## 2. 前置条件

- Node.js 20+，推荐 22+ / 24+
- npm
- 一个本地 Obsidian vault，或任何 Markdown 文件夹
- Windows / macOS / Linux 均可运行，但“打开文件夹”功能当前主要按 Windows Explorer 设计

检查 Node：

```powershell
node -v
npm -v
```

## 3. 获取项目

```powershell
git clone https://github.com/577206/knowledge-forge.git
cd knowledge-forge
npm install
```

如果你是直接拿到 zip，也可以解压后进入目录运行：

```powershell
npm install
```

## 4. 配置 Vault 路径

Knowledge Forge 需要知道你的知识库在哪里。

推荐方式：启动前设置环境变量：

```powershell
$env:KF_VAULT_PATH="D:\Obsidian\MyVault"
npm run dev
```

如果不设置，默认路径是：

```text
E:\创作工坊\知识库\LLM-Wiki
```

你也可以修改源码：

```text
packages/ingestion-core/config.js
```

把：

```js
export const DEFAULT_VAULT_PATH = process.env.KF_VAULT_PATH || '...';
```

改成你的路径。

## 5. 启动服务

```powershell
npm run dev
```

看到类似输出：

```text
Knowledge Forge running at http://localhost:4177
Vault: D:\Obsidian\MyVault
```

然后打开：

```text
http://localhost:4177
```

## 6. 最小使用闭环

### Step 1：上传文件

在页面中拖入文件，或点击“选择文件并写入知识库”。

支持格式：

```text
.pdf / .md / .txt / .xlsx / .xls / .csv
```

### Step 2：查看本次导入

页面左侧会展示：

- 标题
- 写入路径
- Obsidian 打开按钮
- 摘要
- frontmatter
- Markdown 预览
- Excel 字段映射，如果上传的是表格

### Step 3：查看 Inbox

页面右侧会展示 vault 中最近的 `inbox/*.md`。

每条笔记有三个操作：

- `Obsidian`：用 Obsidian 协议打开笔记
- `文件夹`：打开本地文件位置
- `预览`：在网页中读取该 Markdown

### Step 4：在 Obsidian 里整理

所有新资料先进入：

```text
你的 Vault/inbox/
```

你可以在 Obsidian 中人工移动到正式目录，例如：

```text
wiki/AI学习系统/
concepts/
sources/
data/
```

## 7. Excel 工作流

上传 Excel 后，系统会做轻量字段识别：

```text
Excel workbook
  ↓
识别 sheet
  ↓
寻找表头行
  ↓
推断业务类型
  ↓
推断字段类型
  ↓
生成 sourceHeader -> targetField 映射
  ↓
写入 data-import Markdown 笔记
```

示例：工资表可能会映射为：

```text
姓名       -> person.name
部门       -> org.department
基础工资   -> payroll.baseSalary
出勤天数   -> attendance.days
绩效奖金   -> payroll.performancePay
扣款       -> payroll.deduction
应发工资   -> payroll.grossPay
```

当前版本只是预览和记录，不会自动计算工资，也不会写入数据库。

## 8. PDF 工作流

PDF 会先尝试通过 `@opendocsg/pdf2md` 转 Markdown。

```text
PDF
  ↓
pdf2md 尝试解析
  ├─ 成功：生成 Markdown 正文
  └─ 失败/扫描件：生成占位笔记和待解析 checklist
```

复杂版式、扫描件、图片型 PDF 可能无法直接抽取正文。后续可以接入：

- PyMuPDF
- marker
- MinerU
- OCR

## 9. Markdown / TXT 工作流

Markdown 和 TXT 是最稳定的路径：

```text
原始文本
  ↓
规则摘要 / 关键词
  ↓
概念候选 / 双链候选
  ↓
source-note Markdown
  ↓
inbox/
```

## 10. 技术工作流

### 开发检查

```powershell
npm run check
node --check apps\web\app.js
```

### Fixture 测试

```powershell
node test-fixtures\ingest-fixtures.mjs
```

这会把测试 Markdown 和测试 Excel 写入配置的 vault inbox。

### 查看服务健康

```powershell
Invoke-RestMethod http://localhost:4177/api/health
```

### 查看 inbox

```powershell
Invoke-RestMethod http://localhost:4177/api/vault/inbox?limit=5
```

## 11. 推荐使用习惯

### 每天资料处理

```text
1. 收集资料
2. 拖进 Knowledge Forge
3. 确认 inbox 里生成笔记
4. 在 Obsidian 中快速扫一遍
5. 有价值的移动到正式目录
6. 没价值的删掉或归档
```

### 不要一开始就自动归档

知识库结构是长期资产。自动归档看似省时间，但如果质量差，会制造更大的混乱。

建议先坚持：

```text
自动摄入 + 人工确认 + 手动归档
```

等你确认分类体系稳定后，再引入 Agent。

## 12. 后续升级路线

### Phase 1：编辑闭环

网页里直接编辑 Markdown，并保存回 vault。

### Phase 2：Preview / Confirm

从“上传即写入 inbox”改成：

```text
preview -> 用户确认 -> write
```

### Phase 3：检索增强

加入：

- BM25
- embedding
- rerank
- 推荐理由

### Phase 4：LLM 摘要与分类

加入 provider adapter：

- DeepSeek
- OpenAI-compatible local model
- Ollama / LM Studio

### Phase 5：Agent 整理员

让 Agent 输出整理计划：

```json
{
  "suggestedFolder": "wiki/AI学习系统/RAG",
  "newConcepts": ["RAG", "Context Engineering"],
  "links": ["AI 学习系统", "知识库"],
  "actions": ["create_note", "suggest_link", "suggest_folder"]
}
```

但仍然由人确认后再执行。

## 13. 故障排查

### 页面打不开

确认服务是否启动：

```powershell
npm run dev
```

确认端口：

```text
http://localhost:4177
```

### 页面按钮没反应

强制刷新：

```text
Ctrl + F5
```

### 写入位置不对

检查：

```powershell
Invoke-RestMethod http://localhost:4177/api/health
```

看返回的 `vaultPath` 是否是你的知识库。

### Obsidian 按钮打不开

确认：

- 本机安装了 Obsidian
- Obsidian 协议 `obsidian://` 被系统识别
- 目标文件确实在 vault 中

即使 Obsidian 按钮失败，也可以点“文件夹”打开本地路径。
