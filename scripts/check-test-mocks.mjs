/**
 * vi.mock 目标存在性门禁(测试纪律)。
 *
 * 扫描 tests 下所有 *.test.ts / *.test.tsx 中 vi.mock("<target>", …) 的目标:凡 "@/…"
 * 别名目标或含 "/src/" 段的相对目标,校验其在 src/ 下真实存在
 * (.ts/.tsx/index.ts/index.tsx);裸模块名(如 next/navigation)不校验。
 * 目的:重构移动层间依赖后,mock 钉在已不存在或无人 import 的模块上时,
 * 在 lint 期即报错,而非等负断言静默通过或运行期超时。
 *
 * 用法:npm run lint(先于 eslint 执行);发现漂移以非零码退出。
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function walkTests(dir, acc) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      walkTests(full, acc);
    } else if (/\.test\.(ts|tsx)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

const testFiles = walkTests(path.join(root, "tests"), []);

/** 模块路径(.ts/.tsx)到实际文件的候选展开。 */
function candidates(base) {
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
}

const broken = [];
for (const file of testFiles) {
  const content = readFileSync(file, "utf8");
  const targets = [...content.matchAll(/vi\.mock\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
  for (const target of targets) {
    let base = null;
    if (target.startsWith("@/")) {
      base = path.join(root, "src", target.slice(2));
    } else if (target.startsWith(".") && target.includes("/src/")) {
      base = path.resolve(path.dirname(file), target);
    } else {
      continue; // 裸模块名不校验
    }
    if (!candidates(base).some((c) => existsSync(c) && statSync(c).isFile())) {
      broken.push({ file: path.relative(root, file), target });
    }
  }
}

if (broken.length > 0) {
  console.error("check-test-mocks:以下 vi.mock 目标在 src/ 下不存在:");
  for (const { file, target } of broken) {
    console.error(`  ${file}: "${target}"`);
  }
  process.exit(1);
}
