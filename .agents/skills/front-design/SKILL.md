---
name: front-design
description: 当需要创建或修改面向用户的界面(组件、页面、样式、交互)时使用——包括引入 shadcn 组件、编写 Tailwind 样式、修复 UI 视觉或错误态。输入为 tasks/design 等上游工件或直接 UI 修复请求;不适用于纯业务逻辑/数据层/服务端改动(那些不产生视觉面)。
---

# 前端设计落地(front-design)

UI 代码的门禁技能:凡写「看得见」的代码,先过本技能。目标不是限制审美,而是把视觉决策收敛到唯一真源——AI 自由发挥的样式是视觉漂移与低质量页面的第一来源。

## 真源与分工

- **[docs/dev/前端设计规范.md](../../../docs/dev/前端设计规范.md)** — 组件选型表、token 消费规则、裸 Tailwind 白名单、验收自查清单。本文的裁判依据。
- **`src/app/globals.css`** — token 值唯一真源。规范文档与技能文件里**零 token 值**,需要值去这里查。
- **`src/components/ui/`** — shadcn 组件源码(ADR-0004:Radix + lucide-react)。
- 本技能 — 落地门禁与步骤;交互行为(空/加载/错误态、按钮层级、反馈时机)的判定清单在规范文档验收节。

## 硬门禁(HARD-GATE)

- **未读 docs/dev/前端设计规范.md 不得写任何 UI 代码。**「只是改个小样式」也拦。
- **裸色值 = 违规**:hex / oklch 裸值、`slate-*`/`gray-*` 灰阶、`red-*`/`amber-*` 裸红黄,一律语义 token 类(`text-destructive`/`bg-muted`/…)。唯一例外见规范文档白名单。
- **选型表命中的场景禁止手写平行组件**;表外场景先 `npx shadcn@latest add <component>`(单独成 commit),再登记选型表,registry 确认没有才允许手写。
- 用户可见文案一律走 next-intl,组件内禁硬编码。

## 步骤

1. **查表**:对照规范文档「组件选型表」,确定每个 UI 场景用哪个组件、variant 是什么;
2. **补组件**:缺的先 `shadcn add`(单独 commit)+ 登记选型表;
3. **改造/新建**:按 token 消费规则写布局(布局/间距/字号允许自由 Tailwind),颜色圆角阴影一律语义类;
4. **自查**:逐条过规范文档「验收自查清单」(细则展开见 [references/audit-checklist.md](references/audit-checklist.md)),违例清零再交付;
5. **验证**:`npm run lint && npm run type-check && npm test && npm run build`;有行为变更的 UI(事件、状态)遵循 TDD 铁律先红后绿,纯视觉重构以现有测试保绿为底线。

## 与流程技能的关系

- 特性流程内:plan-writing 拆出的 UI 任务卡在实现时触发本技能;spec-review 的 UI 抽查以规范文档验收清单为准;
- 流程外:直接 UI 修复请求(如视觉缺陷反馈)也可触发本技能,交付标准不变。

## Common Rationalizations(对照表)

| 说法 | 裁定 |
| --- | --- |
| 「只是改个颜色,不用走规范」 | 拦。颜色是最容易漂移的决策,裸值一律 token 化 |
| 「这个小组件手写更快」 | 拦。手写平行组件 = 下一次漂移的起点;先查 registry |
| 「测试绿了就不用自查视觉」 | 拦。测试管行为,视觉质量靠验收清单,两者互补 |
| 「shadcn 组件不合需求,我改个平行版本」 | 先改 `src/components/ui/` 里的源码(CLI 复制进仓库本就为自由定制);仍不满足才允许新组件,并说明原因 |
| 「dark 模式我顺手加个类」 | 拦。主题策略见规范文档(ADR-0003:媒体查询,未校准不做手动切换) |
