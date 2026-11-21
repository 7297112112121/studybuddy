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
    // 文档站独立工具链（Docusaurus 自带 lint 约定与构建产物）:
    "website/**",
    // 开发服务器遗留空目录,不属于项目:
    "my-website/**",
  ]),
]);

export default eslintConfig;
