---
name: layout-remove
description: 当开发者要求删除、移除、下线 studybuddy UI 草稿工作区(studybuddyui/)里的布局条目时使用——如「删掉 chat-page-layout」「把日程页那几个布局都删了」「这个布局不要了」;触发词包括删除布局、移除布局、清理布局。范围仅限 studybuddyui/(layouts/<条目> 目录与 src/App.tsx 注册),禁止删除 components/、backgrounds/、技能文件、docs、主项目任何文件;仅删除开发者明确指定的条目,未指定时列出现有条目供挑选,删除执行前必须经开发者确认。新建布局用 layout-wireframe / layout-blank,升级布局用 layout-upgrade。
---

# 删除布局草稿(layout-remove)

## 定位

输入为开发者指定的一个或多个布局条目名,输出为清理后的草稿工作区:条目目录与 `src/App.tsx` 注册一并移除,工作区保持可编译。本技能只做减法,是布局技能家族(`layout-wireframe` / `layout-blank` / `layout-upgrade`)的逆操作;四者的产物约定见 [layout-wireframe](../layout-wireframe/SKILL.md)。

## 硬门禁

1. **只删开发者指定的条目**:未点名时列出 `studybuddyui/layouts/` 下现有条目供挑选,禁止自行决定删哪个;点名模糊(匹配到多个条目)时列出全部候选请开发者确认。
2. **确认前不删任何东西**:删除是不可逆操作——把将删除的完整清单(条目目录及其全部文件、App.tsx 中的 import/`DraftKey`/`DRAFTS` 注册项)呈报开发者,明确确认后才执行。
3. **范围仅限 studybuddyui**:只允许删除 `studybuddyui/layouts/<条目名>/` 目录与 `studybuddyui/src/App.tsx` 中对应注册;禁止删除或修改 `components/`、`backgrounds/`、`.agents/skills/`、`docs/`、主项目 `src/` 的任何文件。
4. **删后必须编译自检**:删除完成后在 `studybuddyui/` 目录跑 `npx tsc --noEmit`,确保注册清理无残留;不通过则修复自身清理引出的问题,而非扩大删除范围。
5. **不做任何 git 操作**:删除只发生在工作区,提交/分支收尾归开发者或 branch-wrapup 流程。

## 流程(四步)

### 1. 指认条目

- 开发者点名 → 直接进入第 2 步;一次点名多个条目时全部纳入删除清单。
- 未点名或点名模糊 → 列出 `studybuddyui/layouts/` 下现有条目(条目名 + 中文标签,标签取自 App.tsx 的 `DRAFTS`),交开发者挑选。

### 2. 删除清单确认

向开发者呈报并确认,清单按条目逐项列出:

- 将删除的目录与其中全部文件(`code.tsx`、`prompt.md`、`result.png` 等);
- 将从 `src/App.tsx` 移除的注册项(import 语句、`DraftKey` 成员、`DRAFTS` 数组项);
- 保留不动的相邻内容(其余条目原样)。

开发者确认后才进入第 3 步;改主意或换条目时回到第 1 步。

### 3. 执行删除

- 删除条目目录(`studybuddyui/layouts/<条目名>/` 整目录)。
- 清理 `src/App.tsx`:移除对应 import、`DraftKey` 联合类型成员、`DRAFTS` 数组项;编辑后不留空行残骸或悬空逗号。
- 条目目录存在但 App.tsx 无注册项时,只删目录并在汇报中说明差异。

### 4. 编译自检与汇报

- 在 `studybuddyui/` 目录跑 `npx tsc --noEmit`,必须通过。
- 向开发者汇报:已删除的条目与文件数、App.tsx 清理位置、`layouts/` 下剩余条目清单。

## 常见合理化对照表

| 借口                                       | 裁决                                                     |
| ------------------------------------------ | -------------------------------------------------------- |
| 开发者说「清理一下」,自行挑没用的删        | 只删明确指定的条目,未点名就列清单请挑选(硬门禁 1)       |
| 就删一个文件,不用列清单确认了              | 确认前不删任何东西,清单含全部文件与注册项(硬门禁 2)     |
| 顺手把相似名字的其他条目一起删了            | 只删指定条目,模糊匹配列为候选请确认(硬门禁 1)           |
| 顺手修一下别的条目里「顺眼」的问题          | 范围仅限删除,不修改任何保留内容(硬门禁 3)               |
| tsc 报错就多删点疑似相关的东西              | 只修复自身清理引出的问题,不扩大删除范围(硬门禁 4)       |
| 删完顺手提交了                              | 不做任何 git 操作(硬门禁 5)                             |
