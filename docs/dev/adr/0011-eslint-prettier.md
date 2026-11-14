---
title: ADR-0011：代码规范采用 ESLint + Prettier
description: ESLint 9 flat config 管代码质量，Prettier 管格式化，二者职责分离
---

# ADR-0011：代码规范采用 ESLint + Prettier

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- Next.js 16 移除了 `next lint` 命令，`next build` 也不再内置 lint——lint 必须走 ESLint CLI 独立执行。仓库 `lint` 脚本已是 `"eslint"`（flat config）。
- `eslint-config-next`（含 core-web-vitals 与 TypeScript 规则）已就位。
- Tailwind 类名顺序、import 排序等格式问题不应消耗评审注意力。
- ESLint 官方已弃用格式类规则，格式化必须交给专用 formatter。

## 决策

ESLint 9 flat config（`eslint-config-next` + typescript-eslint）负责代码质量规则；Prettier 负责全部格式化（含 prettier-plugin-tailwindcss 类名排序），以 eslint-config-prettier 关闭 ESLint 中与格式重叠的规则。lint 与 format 作为独立的 CI 检查步骤执行。

## 备选方案

### Biome（一体化 lint + format）
- 优点：单工具、速度极快、配置简单。
- 缺点：无法直接等价迁移 eslint-config-next 的规则集（React/Next 专属规则仅有有限对标）；格式输出与 Prettier 生态存在细节差异。
- 否决原因：Next 项目的官方规则基线仍以 eslint-config-next 为准。作为未来合并工具链的观察项保留。

### oxlint
- 优点：极快，适合兜底扫描。
- 缺点：生态定位是 ESLint 的加速补充而非完整替代。
- 否决原因：当前规模下收益不足以引入双 lint 体系。

### 仅用 ESLint（含格式规则）
- 否决原因：ESLint 官方已弃用格式规则，此路线不可持续。

## 后果

### 正面
- 与 Next 官方规则基线一致，升级 Next 时规则同步跟随。
- 格式争议归零；Tailwind 类名排序自动化。

### 负面
- 两个工具两份配置，规则漂移需要 CI 兜底。
- Prettier 大版本升级偶发全量格式变动：锁定版本，格式变更独立成 commit。

### 风险
- 未装编辑器插件的贡献者产生格式噪音：以 lint-staged 或 CI 检查兜底（工程化细节后续补充 ADR）。

## 相关决策

- [ADR-0003：Tailwind CSS 4](./tailwindcss-4)
- [ADR-0012：Vitest](./vitest)
