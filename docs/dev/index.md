---
title: 技术文档
description: 学习陪伴伙伴技术文档
sidebar_position: 10
---

# 目录说明

- `adr/` — 架构决策记录（一决策一文档）；
- `代码目录.md` — 代码目录约定；
- `色彩搭配记录.md` — 主题色(品牌渐变色板)语义导读,token 值真源在 `src/app/globals.css`；
- `AXY-<N>-<slug>/` — 特性开发工件目录，每个特性一个，汇集开发落地阶段的产物（架构设计、实现计划、审查报告）：

```
docs/dev/AXY-<N>-<slug>/
├── design.md      # 架构设计（architecture-design 产出，落盘时建目录）
├── tasks.md       # 实现计划（plan-writing 产出）
└── review.md      # 审查报告（spec-review 产出）
```

上游用户故事与需求规范（proposal）在 `docs/product/`；编号 `AXY-<N>` 与 slug 沿用对应用户故事。
