---
title: ADR-0027：全局主题采用 calendar 深空主题（固定暗色）
description: 将 calendar 页局部深空品牌主题提升为全站默认主题——固定暗色 + 星点背景全站挂载，废除局部主题作用域
---

# ADR-0027：全局主题采用 calendar 深空主题（固定暗色）

## 状态

已接受（Accepted）

## 日期

2026-11-19

## 背景

- calendar 页在 AXY-22/23 期间以 `.calendar-theme` 页面局部作用域试验了深空品牌主题（`src/app/globals.css`：ink 深空底、aqua 主色、白 12% 边框、半透明卡面），当时用户显式豁免前端设计规范的颜色消费规则，并约定「试验转正需按色彩搭配记录『新页面用色指引』走 ADR 评估泛化」。
- 现状全站三套观感割裂：workbench 等页面为亮色 shadcn neutral token，auth 页为 `.aurora-theme` 局部暗色，calendar 页为 `.calendar-theme` 局部暗色。三者的语义 token 校准值高度重叠（`.aurora-theme` 与 `.calendar-theme` 仅 accent 一项有差异），页面级作用域已是纯胶水。
- 星点视差背景（`StarsBackground`）目前是 calendar 模块专属组件，挂在 `/calendar` 页面内。

## 决策

1. **将 `.calendar-theme` 的语义 token 校准值提升为 `:root` 全局默认**：全站固定暗色主题（ink 深空底 + aqua 主色），废除亮色默认；`globals.css` 中预留未启用的 `.dark` 块一并移除。将来若出现亮色模式或手动切换需求，再走新 ADR 评估（ADR-0003 的 `prefers-color-scheme` 条款届时一并重审）。
2. **星点视差背景全站挂载**：`StarsBackground` 从 `src/modules/calendar/components/` 上移至 `src/components/`（非 `ui/`，该目录保留给 shadcn 复制件），挂载于根布局，所有页面（含 auth）透出星点。
3. **删除 `.aurora-theme` 与 `.calendar-theme` 两个局部作用域**，auth 与 calendar 继承全局 token；auth 页保留其纱幕/光斑装饰元素（`aurora-veil`、光斑层、玻璃卡），仅去掉主题类名；calendar 页细滚动条样式随之全局化。
4. **`aurora-*` 色板 token 保留**，语义从「auth 页局部装饰色」升级为「全局品牌色板」；`--primary` / `--ring` 全局指向 `--aurora-aqua`，shadcn 组件全站自然继承品牌色。

## 备选方案

### 保持页面局部作用域，新页面逐页挂 theme 类
- 优点：不动存量亮色页面，改动面最小。
- 缺点：主题继续割裂；每页重复挂类/挂背景的胶水；与「语义 token 单源」的方向背道而驰。
- 否决原因：本次变更的动机正是消除割裂。

### 仅提升配色 token，星点背景仍留 calendar 页
- 优点：其他页面视觉扰动更小。
- 缺点：深空观感由「底色 + 星点」共同构成，只换底色得到的是普通暗色页，品牌识别度不完整。
- 否决原因：需求明确要求主题色与背景一并全局化。

### 引入亮/暗双主题 + 手动切换
- 优点：保留亮色模式存量视觉。
- 缺点：双主题 token 校准成本高，当前无产品需求支撑；`.dark` 块至今未校准。
- 否决原因：为不存在的需求付费；本决策后若需亮色再立新 ADR。

## 后果

### 正面
- 全站单一品牌观感，token 单源，删除两处页面级作用域胶水。
- shadcn 组件在所有页面继承 aqua 品牌色，无需按页覆盖。
- 色彩搭配记录的「作用域」豁免条款消失，前端设计规范的颜色消费规则恢复无豁免状态。

### 负面
- 全站无亮色模式：偏好亮色的用户无选择余地。
- 存量亮色页面（workbench 等）的直书浅色假设样式需逐处检查适配；auth 的 accent 由白 8% 洗色变为 aqua 15% 洗色（视觉有细微变化，需实机验证）。

### 风险
- 文档漂移：前端设计规范与 `src/app/globals.css` 的语义注释须随同一 PR 修订，否则「真源声明」失真（前端设计规范真源现居技能区 `.agents/skills/shared/前端设计规范.md`；色彩搭配记录已删除，主题依据收敛到 globals.css）。
- 星点为持续运行的 CSS 动画，全站挂载后低性能设备上每页都承担该开销（`prefers-reduced-motion` 已兜底停漂移，但静态星点渲染仍在）。

## 相关决策

- [ADR-0003：样式方案采用 Tailwind CSS 4](./tailwindcss-4)——本决策不改其「Tailwind 4 + `@theme inline` 单源」条款，仅改变默认主题观感与暗色策略现状（固定暗色，手动切换留待需求出现）。
- [ADR-0004：组件基础采用 shadcn/ui](./shadcn-ui)——全局 token 即 shadcn 语义 token，组件继承方式不变。
