---
title: ADR-0037：变异测试采用 StrykerJS
description: @stryker-mutator/vitest-runner 变异测试；CI 独立 job；报告 Job Summary 内嵌零外发
---

# ADR-0037：变异测试采用 StrykerJS

## 状态

已接受（Accepted）

## 日期

2026-11-28

## 背景

- 单测覆盖率证明「代码被执行」，不证明「断言有裁判力」——断言恒真或缺失时覆盖率照绿，断言强度需变异测试独立度量。

## 决策

- 新增 devDependencies：`@stryker-mutator/core` + `@stryker-mutator/vitest-runner`，两包版本互钉（同版本号发布）。
- `stryker.config.json`：testRunner vitest；coverageAnalysis `perTest`；门禁经 thresholds.break 承载。
- 报告：clear-text 终端摘要 + json 渲染进 job summary，零第三方服务、数据不外发；HTML 报告仅本地临时、目录 gitignored 不归档。
- 本地入口 `npm run test:mutation`（经 scripts/run-stryker.mjs 盘符规范化包装，同 run-vitest.mjs）；CI 独立 job，不与单测 job 合并（变异运行以数量级慢于单测）。

## 备选方案

### 自研变异引擎
- 优点：零新依赖。
- 否决原因：AST 变异算子与增量调度工程量远超需求，重复造轮。

### 非 TS 生态变异工具
- 否决原因：与 vitest/TS 工具链不通，接入成本高于收益。

## 后果

### 正面
- 断言强度可度量：恒真断言、缺失断言在杀死率上显形，TDD 红绿循环质量有第二裁判。

### 负面
- 变异运行慢（每变异体跑一次相关用例），CI 时长增加，需独立 job 容忍。
- Stryker 大版本与 vitest 版本强耦合，升级需同步核对兼容矩阵。
- Windows 沙箱对 agent 工具目录（.claude/.codex 等）的锁定文件复制失败，经 ignorePatterns 收窄复制面规避。

### 风险
- 模块级代码的静态变异体测试成本占比过高时（本仓实测 14% 变异体占 76% 运行时长），运行时长可能再度成为负担。
