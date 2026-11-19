# 项目 SKILL / MCP 接入提示词

> 用途:在新环境克隆本仓库后,将下面整段提示词交给 AI,由其按当前操作系统建立工具目录接入并逐项检查。SKILL / prompt 真源在 `.agents/skills/`、`.agents/prompt/`,MCP 配置真源在 `.agents/mcp/.mcp.json`;工具目录与 `.mcp.json` 经 symlink 接入,仓库以 `core.symlinks=true` 按 120000 模式跟踪链接。

---

## 提示词正文

你负责为本仓库建立工具目录接入。开始时声明:「我正在按 SKILL/MCP 接入提示词执行,当前系统:<OS>。」不得改动 `.agents/` 下任何真源文件内容。

### 接入目标

| 链接                           | 类型     | 指向(相对链接所在目录)  | 必要性                  |
| ------------------------------ | -------- | ----------------------- | ----------------------- |
| `.claude/skills`               | 目录链接 | `../.agents/skills`     | 必建                    |
| `.claude/prompt`               | 目录链接 | `../.agents/prompt`     | 必建                    |
| `.mcp.json`(仓库根)            | 文件链接 | `.agents/mcp/.mcp.json` | 必建                    |
| `.codex/skills`、`.dsh/skills` | 目录链接 | `../.agents/skills`     | 已入库,损坏时按同法重建 |
| `.codex/prompt`、`.dsh/prompt` | 目录链接 | `../.agents/prompt`     | 可选,使用对应工具时再建 |

### 按操作系统执行

- **若 Windows**:先 `git config core.symlinks true`,并开启开发者模式(或以管理员运行终端);已存在的同名普通文件/目录先删除再建链接:
  - 目录链接:`cmd //c mklink /D .claude\skills ..\.agents\skills`(`.claude\prompt` 同理);
  - 文件链接:`cmd //c mklink .mcp.json .agents\mcp\.mcp.json`。
- **若 macOS**:`ln -s ../.agents/skills .claude/skills`(目录链接同理);文件链接 `ln -s .agents/mcp/.mcp.json .mcp.json`。
- **若 Linux**:同 macOS——`ln -s <目标> <链接>`,注意相对目标以链接所在目录为基准。

### 检查(任一系统完成后逐项执行)

1. 每条链接可解引用:`ls -lL <链接>` 不报错;`.mcp.json` 读出的是 JSON 而非链接路径文本——读到路径文本即 symlink 退化(未开开发者模式的 Windows checkout 典型症状),须删除重建;
2. Windows 下 `git config core.symlinks` 输出 true;`git ls-files -s` 中链接条目模式为 `120000`;
3. `claude mcp list` 全部 ✔ Connected 且无冲突告警;
4. MCP 配置仅在会话启动时读取、不热更新——链接就位后须重启会话,再以 `/mcp` 或实际调用工具确认。

### 边界

- 只建链接与检查,禁止复制文件内容替代 symlink——副本脱离真源,失去同步;
- 不修改 `.agents/` 真源;不产生待提交变更(链接均已入库,重建即还原)。
