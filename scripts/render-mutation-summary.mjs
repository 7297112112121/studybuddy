import { appendFileSync, existsSync, readFileSync } from "node:fs";

/**
 * CI Job Summary 渲染：变异测试杀死率（ADR-0037）。
 *
 * 输入：reports/mutation/mutation.json（stryker json reporter 产物）。
 * 记分公式与 mutation-testing-metrics 对齐：mutationScore =
 * (killed + timeout) / (killed + timeout + survived + noCoverage)，
 * runtime/compile 错误与 ignored 不入分母。
 *
 * 写入 $GITHUB_STEP_SUMMARY（追加 Markdown）；本地无该环境变量时直接空跑。
 * 纯报告步骤：产物缺失时写占位提示而非抛错，不反转变异测试结论
 * （门禁由 stryker thresholds.break 决定，见 stryker.config.json）。
 */

const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (!summaryFile) {
  process.exit(0);
}

const REPORT_FILE = "reports/mutation/mutation.json";
const MAX_SURVIVORS_LISTED = 20;

if (!existsSync(REPORT_FILE)) {
  appendFileSync(
    summaryFile,
    "## 变异测试摘要（ADR-0037）\n\n> 变异报告产物缺失（reports/mutation/mutation.json）。\n",
  );
  process.exit(0);
}

const report = JSON.parse(readFileSync(REPORT_FILE, "utf8"));

// 与 mutation-testing-metrics calculateMetrics 同公式
const counts = { killed: 0, timeout: 0, survived: 0, nocoverage: 0 };
const survivors = [];
for (const [file, entry] of Object.entries(report.files ?? {})) {
  for (const mutant of entry.mutants ?? []) {
    // 报告 status 为首字母大写（Killed/Survived/…），归一小写后计数
    const status =
      typeof mutant.status === "string" ? mutant.status.toLowerCase() : "";
    if (status in counts) {
      counts[status] += 1;
    }
    if (status === "survived") {
      const loc = mutant.location?.start ?? {};
      survivors.push(
        `${file}:${loc.line ?? "?"} [${mutant.mutatorName}] ${JSON.stringify(mutant.replacement)}`,
      );
    }
  }
}

const detected = counts.killed + counts.timeout;
const valid = detected + counts.survived + counts.nocoverage;
const score = valid > 0 ? ((detected / valid) * 100).toFixed(2) : "n/a";
const covered = detected + counts.survived;
const coveredScore =
  covered > 0 ? ((detected / covered) * 100).toFixed(2) : "n/a";
const { thresholds } = report;

const lines = [
  "## 变异测试摘要（ADR-0037）",
  "",
  "| 指标 | 值 |",
  "| --- | --- |",
  `| 变异杀死率 | ${score}% |`,
  `| 覆盖代码杀死率 | ${coveredScore}% |`,
  `| 合格线 break | ${thresholds?.break ?? "n/a"} |`,
  "",
  "| 变异体 | killed | timeout | survived | no coverage |",
  "| --- | --- | --- | --- | --- |",
  `| 数量 | ${counts.killed} | ${counts.timeout} | ${counts.survived} | ${counts.nocoverage} |`,
  "",
];

if (survivors.length > 0) {
  lines.push(
    `**幸存变异体**（前 ${Math.min(survivors.length, MAX_SURVIVORS_LISTED)} 条 / 共 ${survivors.length}）：`,
    "",
  );
  for (const s of survivors.slice(0, MAX_SURVIVORS_LISTED)) {
    lines.push(`- \`${s}\``);
  }
  lines.push("");
}

appendFileSync(summaryFile, `${lines.join("\n")}\n`);
