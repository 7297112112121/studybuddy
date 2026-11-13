import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * Vitest 启动包装：Windows + Git Bash 环境的盘符大小写规范化。
 *
 * 背景：npm/npx 在 Git Bash 下以小写盘符（d:\...）传递 cwd，而 Vite 内部用
 * realpathSync.native 把项目根规范成大写盘符（D:\...）。Node 按 URL 字符串
 * 缓存 ESM——file:///d:/x 与 file:///D:/x 是两个模块实例——于是 vitest 4.x
 * 的 worker 与被测测试文件会各自加载一份 @vitest/runner，collector 状态分裂，
 * 所有用例报 "No test suite found in file ..."（Windows 专有，linux/mac 无此问题）。
 *
 * 上游现状：vitest-dev/vitest#11872（open），修复 PR #11871 与 #10843 均已关闭
 * 未合并，截至 vitest 5.1.0 未修复。故在本入口先把 cwd 与 vitest CLI 入口统一
 * 为 OS 规范大小写（realpath）再拉起，CI（ubuntu）上行为与直接调用完全一致。
 *
 * 用法：`node scripts/run-vitest.mjs [vitest 参数...]`；
 * package.json 的 test / test:watch 均经此包装。
 */
const cwd = realpathSync.native(process.cwd());
process.chdir(cwd);

const require = createRequire(import.meta.url);
const vitestBin = path.join(
  path.dirname(require.resolve("vitest/package.json")),
  "vitest.mjs",
);
if (!existsSync(vitestBin)) {
  console.error(`run-vitest: 未找到 vitest CLI 入口：${vitestBin}`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [realpathSync.native(vitestBin), ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
