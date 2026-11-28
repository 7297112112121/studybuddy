---
title: ADR-0036：单元测试覆盖率采用 Vitest v8 provider
description: @vitest/coverage-v8 单测轨覆盖率；指标 Job Summary 内嵌零外发；本地 HTML 临时报告
---

# ADR-0036：单元测试覆盖率采用 Vitest v8 provider

## 状态

已接受（Accepted）

## 日期

2026-11-28

## 背景

- AI TDD 循环实现代码后需复跑单测并查看报告；此前只有终端 pass/fail 输出，无覆盖率与用例指标产物。
- CI（ADR-0018）PR 校验只呈现测试成败，提交代码的覆盖率、失败用例等核心指标不可见。
- 接口测试轨与 Playwright E2E（ADR-0017）不在本决策范围。

## 决策

- 新增 `@vitest/coverage-v8`，版本与 vitest 精确钉同（5.1.0）。
- 统计范围仅单测轨；分母 `src/**` 减白名单（`src/db/migrations/**`、`src/components/ui/**`（shadcn 复制件）、`**/*.d.ts`）。
- 本地：`npm run test:report` 开启覆盖率，终端 text 摘要 + `coverage/` 下 HTML 与 json-summary；目录 gitignored，不归档。
- CI：单测步骤带 `--coverage.reportOnFailure` 与 json 结果输出，渲染脚本将覆盖率四指标、用例通过/失败/跳过与失败清单写进 job summary；纯报告，不设阈值门禁，渲染故障不反转测试结论。
- 指标仅在 GitHub Job Summary 呈现，零第三方服务、数据不外发。

## 备选方案

### @vitest/coverage-istanbul
- 优点：源码插桩，指标更细，兼容更多外部工具。
- 缺点：运行更慢、依赖更重。
- 否决原因：v8 原生采集零配置，当前只需报告、不需插桩级兼容。

### 第三方覆盖率平台（Codecov 等）
- 优点：趋势面板、PR 评论、历史对比。
- 否决原因：覆盖率数据须上传外部服务，与顶层数据外发规则冲突；Job Summary 已满足可见性需求。

### 仅统计被测文件
- 优点：零白名单维护。
- 否决原因：分母不含未触达文件，分数虚高失真。

## 后果

### 正面
- TDD 循环复跑即得可视化报告；PR Summary 页直接可读核心指标，失败用例不必翻日志。

### 负面
- RSC/页面等 ADR-0012 划归 E2E 的代码计入单测分母，单测覆盖率数值系统性偏低，不能与全栈覆盖率混读。
- include 白名单随新增生成目录需要维护。

### 风险
- vitest 与 coverage provider 版本强耦合，升级 vitest 必须同步升级 `@vitest/coverage-v8`。
