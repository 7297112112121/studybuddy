---
name: architecture-design
description: 当 proposal 已获人工批准,需要产出架构设计(design)时使用。输入为状态为"已批准"的 proposal;proposal 未获批准时不得触发,也不得开始写任何产品代码。
---

# 架构设计（architecture-design）

## 概述

开发技能组第二步：把已批准的需求规范（proposal）转化为**架构设计（design）**——数据模型、契约、UI 结构、组件划分。design 是实现计划（plan-writing）的直接输入。

**开始时声明**：「我正在使用 architecture-design 技能为 <特性名> 做架构设计。」

## 硬门禁（HARD-GATE）

**design 未获人工批准，不得拆分任务、不得写任何产品代码。**（这是第二道批准门；第一道在 proposal。）

## 流程

### 1. 读 proposal 并盘点约束

读全文，摘出 Global Constraints 候选：性能指标、边界约束、豁免清单（豁免项**不进设计范围**，但要在设计的「与 ADR 的关系」中注明去向）。

### 2. 与既有 ADR、代码目录约定核对

本项目已有 25 个 ADR（docs/dev/adr/）与代码目录约定（docs/dev/代码目录）。设计中的每一项技术选择先查 ADR：

- 有对应 ADR 且一致——照做；
- 与 ADR 冲突或无 ADR 覆盖的新选型——**先走 ADR 流程，再回来做设计**，不得在 design 里静默偏离；
- 目录与分层安排遵循代码目录文档的约定，不得另起炉灶。

### 3. 产出设计

按 [templates/design.md](templates/design.md) 写入 `docs/dev/AXY-<N>-<slug>/design.mdx`（与 proposal 同目录，目录已由 proposal-writing 创建）。各节要求：

- **数据模型**：字段名、类型、约束、索引，精确到可直接建表/写 schema 的程度；
- **契约**：模块间调用、API、函数——**精确到签名级别**（名称、参数及类型、返回类型、错误情形）。契约是后续 plan 中 Interfaces 块的直接原料，签名不精确，任务拆分时就得回头猜；
- **UI 与组件**：组件树、状态归属（Server/Client、本地/全局）、与既有组件的复用关系；
- **错误与边界**：proposal 边界表中的每一项在此有对应的处理设计。

### 4. 自查并提请批准

- [ ] proposal 每条需求条目都能指出设计中承载它的部分
- [ ] 每个契约都是签名级精确，无「待定」字样（待定项进开放问题并说明不阻塞什么）
- [ ] 技术选择与 ADR 全部一致或已走 ADR 流程
- [ ] 目录安排符合代码目录约定
- [ ] 豁免项未混入设计范围，去向已注明

自查通过后提请人工批准，状态改为「已批准」。

## 合理化对照表

| 借口 | 现实 |
| --- | --- |
| 「这个选型 obviously 对，ADR 以后补」 | 无 ADR 的选型 = 下次重构时没人知道为什么。先 ADR 后设计，顺序不能反 |
| 「契约写个大概，实现时再细化」 | 契约不精确，plan 的 Interfaces 块就是空话，任务间靠猜对齐 |
| 「这个功能很小，架构设计可以跳过」 | 那它就不该有自己的 proposal。凡有 proposal 必有 design，规模小就写短 |

## 产出物

- `docs/dev/AXY-<N>-<slug>/design.mdx` — 架构设计（状态：草案 → 已批准）
