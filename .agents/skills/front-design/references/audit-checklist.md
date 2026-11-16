# UI 验收自查清单(细则展开)

本文件展开 docs/dev/前端设计规范.md 的「验收自查清单」,供逐条取证。来源:AXY-8 登录页改造的真实验收项。

## 1. 错误态

- [ ] 字段级:错误出现时输入框有描边变化(Input 的 `aria-invalid` 内建样式),`aria-describedby` 指向错误文案节点;
- [ ] 页面级:顶部错误用 `Alert`(role="alert" 由组件内建),破坏性语义用 `variant="destructive"`;
- [ ] 校验汇总:多字段错误有汇总条(FormSummary 模式:warning token + `{count}` 插值);
- [ ] 错误文案全部来自 i18n,逐字对照 E 表/proposal 文案;
- [ ] 错误修正后即消失(受控错误状态,不留陈旧提示)。

## 2. 焦点与键盘

- [ ] Tab / Shift-Tab 顺序与视觉顺序一致;
- [ ] 每个可交互元素焦点环可见(shadcn 组件内建;自写元素补 `focus-visible:ring-*`);
- [ ] 表单可 Enter 提交;提交按钮 type="submit";
- [ ] 可点元素全部是 `Button` 或原生元素,无 div/span onClick。

## 3. 交互完整

- [ ] 提交中:按钮禁用 + 文案切换(pending 文案走 i18n),不可重复提交;
- [ ] 空态:列表/数据区为空时有明确空态呈现(占位文案,不是白屏);
- [ ] 加载态:有可感知的加载反馈(骨架屏/Spin,视场景);
- [ ] 破坏性操作:有确认或可撤销路径(视需求)。

## 4. i18n

- [ ] 组件内无硬编码用户可见文案(中文或英文);
- [ ] 新增键已加入 `src/locales/zh-CN/*.json`,ICU 插值(如 `{count}`)经 useTranslations 传入;
- [ ] `npm run test` 的组件测试覆盖文案断言(逐字)。

## 5. token 违例扫描

- [ ] `grep -rn "slate-\|gray-\|zinc-" src/modules src/app` 无命中;
- [ ] `grep -rn "red-[0-9]\|amber-\|green-[0-9]\|#[0-9a-fA-F]\{3,6\}" src/modules src/app` 无命中(上游 `src/components/ui/` 内建 dark: 类除外);
- [ ] 原生 checkbox 等 whitelist 场景的样式全部 token 类(`accent-primary`/`outline-destructive` 形态)。

## 6. 一致性

- [ ] 同一意图在同类表面用同一组件模式(错误横幅都是 Alert、切换都是 Tabs/Button link);
- [ ] 卡片统一 `rounded-*` + token 阴影,不出现混用;
- [ ] 字号层级符合现有样板:标题 text-2xl、正文 text-sm、辅助 text-xs + `text-muted-foreground`。
