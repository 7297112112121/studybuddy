import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "website/**",
    "studybuddyui/**",
    // 测试与变异测试产物目录(ADR-0036/0037):覆盖率报告、变异报告、
    // stryker 沙箱临时副本,均为 gitignored 生成物,不参与 lint
    "coverage/**",
    "reports/**",
    ".stryker-tmp/**",
  ]),
  // 测试寻址纪律(单元测试纪律):tests 内引用 src 一律 @/ 别名,禁相对路径跨入 src。
  {
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^\\.{1,2}(/[^/]+)*/src/",
              message: "tests 内引用 src 一律使用 @/ 别名",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
