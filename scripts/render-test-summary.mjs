import { appendFileSync, existsSync, readFileSync } from "node:fs";

/**
 * CI Job Summary 渲染：单测覆盖率 + 用例指标（ADR-0036）。
 *
 * 输入（均由带覆盖率的单测步骤产出）：
 * - coverage/coverage-summary.json：v8 provider json-summary reporter，四指标总表；
 * - coverage/unit-results.json：vitest json reporter --outputFile，用例计数与失败清单。
 *
 * 写入 $GITHUB_STEP_SUMMARY（追加 Markdown）；本地无该环境变量时直接空跑。
 * 纯报告步骤：产物缺失时写占位提示而非抛错，不反转测试结论。
 */

const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (!summaryFile) {
  process.exit(0);
}

const COVERAGE_FILE = "coverage/coverage-summary.json";
const RESULTS_FILE = "coverage/unit-results.json";
const MAX_FAILED_LISTED = 20;

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function formatPct(entry) {
  const pct = entry?.pct;
  return Number.isFinite(pct) ? `${pct.toFixed(2)}%` : "n/a";
}

const lines = ["## 单元测试摘要（ADR-0036）", ""];

if (existsSync(COVERAGE_FILE)) {
  const { total } = readJson(COVERAGE_FILE);
  lines.push(
    "| 覆盖率 | 语句 | 分支 | 函数 | 行 |",
    "| --- | --- | --- | --- | --- |",
    `| src/**（减白名单） | ${formatPct(total.statements)} | ${formatPct(total.branches)} | ${formatPct(total.functions)} | ${formatPct(total.lines)} |`,
    "",
  );
} else {
  lines.push("> 覆盖率产物缺失（coverage/coverage-summary.json）。", "");
}

if (existsSync(RESULTS_FILE)) {
  const results = readJson(RESULTS_FILE);
  lines.push(
    "| 用例 | 总数 | 通过 | 失败 | 跳过 |",
    "| --- | --- | --- | --- | --- |",
    `| 数量 | ${results.numTotalTests ?? "?"} | ${results.numPassedTests ?? "?"} | ${results.numFailedTests ?? "?"} | ${results.numPendingTests ?? "?"} |`,
    "",
  );

  const failed = (results.testResults ?? [])
    .flatMap((suite) => suite.assertionResults ?? [])
    .filter((test) => test.status === "failed")
    .map((test) => test.fullName);

  if (failed.length > 0) {
    lines.push(
      `**失败用例**（前 ${Math.min(failed.length, MAX_FAILED_LISTED)} 条 / 共 ${failed.length}）：`,
      "",
    );
    for (const name of failed.slice(0, MAX_FAILED_LISTED)) {
      lines.push(`- ${name}`);
    }
    lines.push("");
  }
} else {
  lines.push("> 用例结果产物缺失（coverage/unit-results.json）。", "");
}

appendFileSync(summaryFile, `${lines.join("\n")}\n`);
