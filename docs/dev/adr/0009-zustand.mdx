---
title: ADR-0009：客户端状态管理采用 zustand
description: zustand 管理会话内 UI 状态；服务端数据一律不进 zustand
---

# ADR-0009：客户端状态管理采用 zustand

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 客户端存在跨组件的会话内状态：AI 对话输入态与草稿、学习计时器、面板开合等高频交互状态。
- 服务端数据的来源已定（RSC 直取或 Server Actions + TanStack Query，见 ADR-0025；原为 tRPC + TanStack Query，随 ADR-0008 被取代而修订），客户端状态库不再承担服务端缓存职责——这决定了状态库只需管「UI 态」，规模有限。

## 决策

采用 zustand（v5）管理客户端会话内状态：按业务域拆分 store（切片模式）；选择器订阅 + shallow 比较作为性能纪律；跨页面持久偏好（主题等）用 URL 或 localStorage 而非 store。**服务端数据一律不写入 zustand。**

## 备选方案

### React Context
- 优点：零依赖。
- 缺点：任意值变化触发消费子树重渲染，拆分 Context 的颗粒度维护成本高。
- 否决原因：计时器、输入态等高频更新场景性能表现差。

### Redux Toolkit
- 优点：生态与调试工具成熟，协作约定强。
- 缺点：样板代码多，对本项目的状态规模过重。
- 否决原因：状态复杂度未达到需要 RTK 的层级。

### Jotai
- 优点：原子化模型优雅，与 React 19 配合好。
- 缺点：与 zustand 能力高度重叠，社区规模略小。
- 否决原因：二者择一即可，zustand 的生态与认知度更高。

## 后果

### 正面
- 极简 API、小体积、无 Provider 嵌套，组件树干净。
- 选择器订阅精确控制重渲染，适配计时器等高频场景。

### 负面
- 无强制约定，store 划分与持久化边界依赖团队纪律。
- devtools 时序调试需手动接入（redux-devtools 中间件）。

### 风险
- 「什么都能塞进 store」的蔓延：评审清单加入两条——服务端数据禁止入 zustand；持久偏好不入 store。

## 相关决策

- [ADR-0025：客户端数据层 TanStack Query + Server Actions](./client-data-layer)
