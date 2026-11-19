---
title: 产品文档
description: 学习陪伴伙伴产品文档：用户故事与需求规范（proposal，含原型契约），编号即路径
sidebar_position: 10
---

# 产品文档

本目录沉淀产品侧的设计产出，按特性编号组织目录：**编号即路径**——`AXY-<N>` 对应 `docs/product/AXY-<N>-<slug>/`，内含用户故事 `story.md`（五大组成部分）与需求规范 `proposal.md`（含原型契约——原型的纯文本唯一接口）。**定位文档按编号走目录路径，勿按文件名盲搜**；本页索引仅是总览仪表盘。通用 DoD 见 [dod](./dod)。交互原型不入库，需要看效果时按契约现场生成一次性原型，看完即弃。流程见 [研发流程](../研发流程) 与 product-design、proposal-writing 技能。

## 用户故事总览

| 编号 | 状态 | 优先级 | 文档 | 依赖 | 批准日期 | 变更记录 |
| --- | --- | --- | --- | --- | --- | --- |
| AXY-8 | 已批准 | P0 | [登录注册](./AXY-8-auth/story) | 无 | 2026-11-16 | [CR-20261116-1](./AXY-8-auth/change-record) |
| AXY-22 | 已批准 | P0 | [个人日程日历](./AXY-22-study-calendar/story) | AXY-8 | 2026-11-17 | — |
| AXY-23 | 已批准 | P1 | [日程周视图](./AXY-23-week-view/story) | AXY-22 | 2026-11-19 | — |
| AXY-24 | 已批准 | P1 | [条目 AI 资料提案](./AXY-24-entry-ai-resource/story) | AXY-22 | 2026-11-19 | — |

状态、优先级、依赖与批准日期取自各故事文档头部，以原文为准。变更记录列登记 CR 编号——特性经 feature-supersede 技能推翻 / 取代 / 废弃时产出 `AXY-<N>-<slug>/change-record.md`（第五份工件）；「—」表示尚无。
