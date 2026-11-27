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
    // 开发服务器遗留空目录,不属于项目:
    "my-website/**",
  ]),
  // 测试寻址纪律(测试纪律):tests 内引用 src 一律 @/ 别名,禁相对路径跨入 src。
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
