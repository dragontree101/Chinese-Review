# 文言文生词复习

帮助初中生学习和复习文言文实词与英语单词的本地 Web 应用。文言文部分基于 1333 条文言实词数据（覆盖 299 个字），英语部分基于 [KyleBing/english-vocabulary](https://github.com/KyleBing/english-vocabulary) 词库（初中 + 高中共 3927 词），提供多种规则的出题复习、多维度学习统计，以及数据在线编辑。

## 功能

### 文言文复习

### 复习
- **6 种出题规则**：随机、按年级（七/八/九年级/拓展）、按拼音首字母、按关键字、按频率（多义字优先）、错误率优先（薄弱点优先）
- **2 种题型**：选择题（四选一，干扰项优先取同字的其他含义）、填空题（输入含义，服务端智能判定，支持双向匹配）
- **答题卡**：显示字、多音字读音、例句（含出处）、相同含义的其他例句、白话翻译
- 作答后即时反馈；可点「不知道」单独统计；填空答错可点「判我对」修正

### 统计
- 正确率 / 错误率 / 不知道率 / 已复习进度
- 近 7 天作答趋势折线图
- 按字排行（最弱在前）、按年级、按出处三个维度

### 数据管理
- 1333 条词条的搜索与分页浏览
- **手动添加词条**：字与含义必填，读音/例句/出处/课文/年级/翻译选填；添加后立即参与出题与统计
- 行内编辑：含义、白话翻译、出处、课文、年级
- 「相同含义的句子」「频率」由数据实时推导，编辑后立即生效

### 英语单词复习（/english）
- **词库**：english-vocabulary submodule，初中 + 高中两库去重合并共 3927 词（重叠 1817 词取最低学段归「初中」）
- **4 种出题规则**：随机、按学段（初中/高中）、按首字母（A-Z）、错误率优先（薄弱点优先）
- **2 种题型**：选择题（英译中，四选一）、填空题（中译英拼写，只展示中文释义不展示单词，大小写不敏感、忽略首尾空白）
- 答题卡显示单词、英/美音标、学段；作答后展示释义与全部例句；填空答错可「判我对」
- **统计**：正确率 / 错误率 / 不知道率 / 已复习进度、错误单词排行（错误次数最多在前）、按学段、按首字母（最弱在前）、近 7 天趋势

## 技术栈

- Next.js 15.4（App Router）+ React 19.1 + TypeScript（strict）
- Tailwind CSS v4
- better-sqlite3（单文件数据库 `data/app.db`，WAL 模式）
- pinyin-pro（拼音首字母）、recharts（趋势图表）
- vitest（单元测试，43 个用例）

## 部署与启动

所有操作通过 `scripts/` 目录下的脚本完成（日志输出到 `logs/`）：

```bash
# 1. 首次部署：安装依赖 + 从 default.json 建库
bash scripts/setup.sh

# 2. 开发模式启动（后台运行，日志 logs/dev.log，端口 3888）
bash scripts/dev.sh
# 浏览器打开 http://localhost:3888

# 3. 生产模式启动（先构建再启动，日志 logs/start.log）
bash scripts/start.sh

# 4. 停止服务（dev / start 均可停）
bash scripts/stop.sh

# 5. 清空并重建数据库（重新导入 default.json 与 data/translations.json，含英语词库导入）
bash scripts/reset-db.sh

# 6. 单独导入英语词库（submodule → e_words 表）
bash scripts/import-english.sh

# 7. 运行单元测试
bash scripts/test.sh
```

> 依赖：Node.js ≥ 20（推荐 22）。
>
> 首次 clone 后需先初始化 submodule：`git submodule update --init third_party/english-vocabulary`（约 100MB，已配置浅克隆）。

## 数据说明

### 词条字段

| 字段 | 来源 | 说明 |
|------|------|------|
| char / meaning / sentence / familiarity | default.json | 字、含义、例句、原始熟悉度 |
| keyword | default.json | 原始 keyword，多音字读音标注（如 `辟(bì)`）与词形变体 |
| source | 导入时解析 | 从例句句末括号提取出处；「（成语）」记为成语；无出处留空 |
| translation | AI 初稿 | 例句白话翻译（1257 句，覆盖率 100%），可在页面人工修正 |
| lesson / grade | 导入时推断 | 初中篇目按统编教材映射七/八/九年级；其他篇目归「拓展」；无出处留空 |
| 相同含义的句子 | 实时推导 | 同字同含义的其他例句，不落库 |
| 频率 | 实时推导 | 该字的词条数量（多义字更高频） |

### 数据表

- `words` — 文言文词条（1333 条）
- `review_logs` — 文言文作答记录（一次作答一条；「判我对」就地更新原记录并打 `overridden` 标记，保证统计分母不膨胀）
- `e_words` — 英语词条（3927 条，meanings/sentences/phrases 存 JSON）
- `e_review_logs` — 英语作答记录（同 review_logs 语义）

### 已知数据问题

原始 `default.json` 存在个别疑似笔误（如「虽有暴」应为「虽有槁暴」、「参差菜」应为「参差荇菜」），系统按原样导入未做修改，可在「数据管理」页人工修正。

## 目录结构

```
scripts/            启停 / 测试 / 建库脚本（唯一运行入口）
src/app/            页面（文言文首页、复习、统计、数据管理；/english 英语板块）
src/app/api/        Route Handlers（words / quiz / review / stats + english/*）
src/components/     React 组件（english/ 子目录为英语板块组件）
src/lib/            核心逻辑（数据库、出题、判定、统计、拼音；english/ 子目录为英语逻辑）
src/lib/__tests__/  单元测试（含 src/lib/english/__tests__/）
src/scripts/        数据导入、翻译合并等一次性脚本
third_party/        english-vocabulary 词库 submodule
data/               app.db 数据库、translations.json 翻译初稿（git 忽略）
docs/               正式文档（验收记录等）
discuss/            设计文档与实现计划
logs/               运行日志（git 忽略）
```

## 文档

- 设计文档：[discuss/2026-11-22-文言文复习应用-design.md](discuss/2026-11-22-文言文复习应用-design.md)
- 实现计划：[discuss/2026-11-22-文言文复习应用-plan.md](discuss/2026-11-22-文言文复习应用-plan.md)
- 端到端验收记录：[docs/2026-11-22-端到端验收记录.md](docs/2026-11-22-端到端验收记录.md)
- 英语单词模块设计：[discuss/2026-11-23-英语单词复习-design.md](discuss/2026-11-23-英语单词复习-design.md)
- 英语单词模块实现计划：[discuss/2026-11-23-英语单词复习-plan.md](discuss/2026-11-23-英语单词复习-plan.md)
- 英语单词模块验收记录：[docs/2026-11-23-英语单词模块验收记录.md](docs/2026-11-23-英语单词模块验收记录.md)
