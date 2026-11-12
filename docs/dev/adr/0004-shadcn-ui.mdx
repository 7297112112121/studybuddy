---
title: ADR-0004：组件基础采用 shadcn/ui
description: 基于 Radix UI 原语与 Tailwind 的 shadcn/ui，组件源码进仓库自由定制
---

# ADR-0004：组件基础采用 shadcn/ui

## 状态

已接受（Accepted）

## 日期

2026-11-12

## 背景

- 需要无障碍（a11y）可靠的交互基元（对话框、下拉、弹出层、表单控件），自研成本高。
- 产品强调情感化与个性化，界面需要深度定制；套用成型 UI 库的默认视觉会带来「通用后台感」。
- 无专职设计师，需要一套经过打磨的默认视觉作为起点。
- 技术前提：Tailwind CSS 4（ADR-0003）+ React 19。

## 决策

采用 shadcn/ui 作为组件基础：组件源码经 CLI 复制进仓库（底层是 Radix UI 无头原语 + Tailwind 样式），随业务自由修改；图标用 lucide-react。初始化时使用 Tailwind v4 兼容模式（组件 CSS 变量写入 `app/globals.css`）。组件不做整体升级，按需 diff 上游同步。

## 备选方案

### Ant Design 5
- 优点：组件覆盖面最全，国内资料最多。
- 缺点：CSS-in-JS 主题体系与 Tailwind 双轨并存；默认视觉与「情感化陪伴」产品气质不符；包体积与 RSC 兼容成本。
- 否决原因：定制成本高于从 shadcn/ui 改造的成本。

### MUI / Mantine
- 优点：成熟、组件全。
- 缺点：自带完整样式体系，与 Tailwind 冲突形成双主题系统；视觉同样偏通用后台。
- 否决原因：与「Tailwind 单一样式体系」（ADR-0003）冲突。

### 裸用 Radix UI + 自建样式
- 优点：依赖最薄，完全自主。
- 缺点：每个组件的视觉与交互细节都要从零打磨，团队没有设计带宽。
- 否决原因：shadcn/ui 本质就是这一方案的「预完成版」，直接采用成本更低。

## 后果

### 正面
- 组件代码归仓库所有：无黑盒升级风险，可任意改造贴合情感化设计。
- Radix 保证键盘导航与 a11y 基线。
- 与 Tailwind token 体系单一无冲突。

### 负面
- 组件是「我们的代码」，bug 与维护责任在团队自身；上游更新需手动同步。
- 复杂组件（图表、虚拟列表、富文本）不在其覆盖内，届时需另行选型（如 Recharts 按 shadcn charts 风格封装）。

### 风险
- CLI 复制进来的代码默认被视为「正确」，反而少被 review——约定：引入新组件的提交单独成 commit，便于后续 diff 定位。

## 相关决策

- [ADR-0003：Tailwind CSS 4](./tailwindcss-4)
- [ADR-0001：Next.js 16 全栈框架](./nextjs-fullstack-framework)
