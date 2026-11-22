# studybuddyui

studybuddy 的布局、组件与背景草稿工作区。

## 目录结构

```
studybuddyui/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
├── components/
│   └── <条目名>/
│       ├── prompt.md
│       └── <效果代码>
├── layouts/
│   └── <条目名>/
│       ├── prompt.md
│       └── <效果代码>
└── backgrounds/
    └── <条目名>/
        ├── prompt.md
        └── <效果代码>
```

## AI使用约束

- 对 AI 说:「参考布局 / 组件 / 背景」。
- 启动项目后,通过截图查看布局 / 组件 / 背景效果,禁止直接阅读代码。
- 看中某个 UI 时,阅读其 `prompt.md`,而不是代码。
- 仅当用户认为偏差大时,才允许阅读代码。

## 项目约束

- 不对任何模块公开接口。
- 禁止直接引用 `components/`、`layouts/` 与 `backgrounds/` 下的代码。
