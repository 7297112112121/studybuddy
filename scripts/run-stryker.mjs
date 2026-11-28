import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";

/**
 * Stryker 启动包装：与 run-vitest.mjs 同源的 Windows 盘符大小写规范化。
 *
 * Stryker 的 vitest-runner 在进程内经 Node API 驱动 Vitest，worker 与被测
 * 文件共享同一 cwd——npm 脚本在 Git Bash 下传小写盘符（d:\...）而 Vite 内部
 * 用 realpathSync.native 把项目根规范成大写（D:\...），Node 按 URL 字符串
 * 缓存 ESM，两份模块实例分裂（vitest-dev/vitest#11872，Windows 专有，
 * linux/mac 无此问题）。故在本入口先把 cwd 与 Stryker CLI 入口统一为 OS
 * 规范大小写（realpath）再拉起；CI（ubuntu）上行为与直接调用完全一致。
 *
 * 用法：`node scripts/run-stryker.mjs [stryker 参数...]`；
 * package.json 的 test:mutation 经此包装（ADR-0037）。
 */
const cwd = realpathSync.native(process.cwd());
process.chdir(cwd);

const strykerBin = path.join(
  cwd,
  "node_modules",
  "@stryker-mutator",
  "core",
  "bin",
  "stryker.js",
);
if (!existsSync(strykerBin)) {
  console.error(`run-stryker: 未找到 Stryker CLI 入口：${strykerBin}`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [realpathSync.native(strykerBin), ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
