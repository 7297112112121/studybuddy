---
title: ADR-0003：样式方案采用 Tailwind CSS 4
description: Tailwind CSS 4 原子类 + @theme inline 设计 token 作为唯一样式方案
---

# ADR-0003：样式方案采用 Tailwind CSS 4

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 「个性化、有情感」的产品定位要求界面高度可定制，主题一致性与亮/暗双模式是硬需求。
- 仓库已安装 tailwindcss 4.3.3，经 `next.config.ts` 的 `turbopack.rules` 以 `@tailwindcss/turbopack` 接入；**没有** `tailwind.config` 与 `postcss.config`，主题变量在 `app/globals.css` 的 `@theme inline` 中定义，暗色模式基于 `prefers-color-scheme`。
- Tailwind 4 是 CSS-first 配置（`@theme`），构建原生进入 Turbopack，无独立 PostCSS 管线。

## 决策

统一使用 Tailwind CSS 4 原子类 + `@theme inline` 设计 token 作为**唯一**样式方案；不引入 CSS Modules；主题变量集中定义在 `app/globals.css`，暗色模式以 `prefers-color-scheme` 为默认策略（需要手动切换时再评估 class 策略）。类名顺序由 prettier-plugin-tailwindcss 自动整理（见 ADR-0011）。

## 备选方案

### CSS Modules
- 优点：隔离明确、零新概念。
- 缺点：设计 token 靠手抄变量，跨组件一致性靠自律；与组件库生态不匹配。
- 否决原因：与组件库决策（ADR-0004）和现有基建冲突。

### styled-components / Emotion（CSS-in-JS）
- 优点：动态主题与组件内聚的表达力强。
- 缺点：运行时开销；在 RSC 与 React 19 生态中逐步边缘化（对 React 19 的支持长期滞后）。
- 否决原因：与服务端组件架构天然摩擦。

### vanilla-extract / Panda CSS
- 优点：零运行时 + 类型安全 token。
- 缺点：构建链集成与生态规模小于 Tailwind；shadcn/ui 等现成组件资产无法直接复用。
- 否决原因：生态收益低于切换成本。

## 后果

### 正面
- 单一样式心智，设计 token 集中管理；与 Turbopack 原生集成，构建快。
- 海量现成组件资产（shadcn/ui、社区模板）可直接消化。

### 负面
- 类名可读性依赖排序与命名纪律。
- v4 的 CSS-first 配置与社区大量 v3 资料不兼容，检索资料时必须核对版本。

### 风险
- 自由度带来样式蔓延：评审中约束「新增颜色/间距/圆角必须先进 `@theme` 变量」。

## 相关决策

- [ADR-0004：组件基础采用 shadcn/ui](./shadcn-ui)
- [ADR-0011：ESLint + Prettier](./eslint-prettier)
