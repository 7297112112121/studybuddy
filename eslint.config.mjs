import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ─────────────────────────────────────────────────────────────────────────────
// 代码目录守护机制——依赖规则矩阵（裁判文档：docs/dev/代码目录.mdx「依赖规则」）
//
// 依赖方向：app → modules → agent → db(仅 schema) / lib
// 路径别名 @/* → ./src/*，no-restricted-imports 为纯字符串匹配，无需模块真实存在。
//
// 注意：Flat Config 中同一文件命中多个块时，规则按块顺序浅合并——后块对同一
// rule id 的赋值会整体覆盖前块（不深合并 paths/patterns）。因此下方每个块的
// no-restricted-imports 都必须是该目录层所需的完整配置。
// ─────────────────────────────────────────────────────────────────────────────

// 边界规则豁免清单：
// 规则自第一天生效、无历史违规，初始即为空。未来出现暂时无法修复的违规时，
// 把文件路径显式列入此处，边界规则降级为 warn（不阻断 lint，但保持可见）；
// 新增条目须在评审中说明理由，修复后即移除——禁止为绕过检查长期驻留。
const BOUNDARY_EXEMPT_FILES = [];

// modules 通用边界：禁反向依赖 app + 跨模块深路径。
const moduleBoundaryPatterns = [
  {
    group: ["@/app", "@/app/**"],
    message:
      "模块是被 app 组装的下一层，禁止反向依赖路由层（依赖方向 app → modules → agent → db/lib）；" +
      "跨模块写操作请上浮到 app 层的 action 中顺序编排各模块 service。",
  },
  {
    group: ["@/modules/*/**"],
    message:
      "跨模块只能 import 顶入口 @/modules/<m>（index.ts 导出的读接口），禁止深路径；" +
      "模块内部文件一律相对导入。",
  },
];

// 类型禁推断：禁 Awaited<ReturnType<…>>（src/db/** 天然豁免——本规则只出现在
// modules/components 两个块的 files 范围内）。
const noInferredServerTypeRule = ["error", {
  selector:
    "TSTypeReference[typeName.name='Awaited'] > TSTypeParameterInstantiation > TSTypeReference[typeName.name='ReturnType']",
  message:
    "禁止用 Awaited<ReturnType<…>> 推断服务端返回类型：推断结果会沿调用链扩散、掩盖契约变化；" +
    "请在服务端函数处显式声明返回类型后再引用。",
}];

// 枚举 src/modules 下的模块目录，为每个模块生成「禁自引用顶入口」块，
// 防止 barrel 循环（模块内部 import @/modules/<自己>）。
// 当前 src/modules 仅为含 .gitkeep 的空骨架，枚举结果为零块——机制先就位，
// 模块目录一旦落地即自动生效，无需改动本文件。
// 块内必须带上 moduleBoundaryPatterns 与 noInferredServerTypeRule 全集：
// 本块排在 modules 通用块之后，会整体覆盖后者对同 rule 的赋值。
const moduleDirPath = fileURLToPath(new URL("src/modules", import.meta.url));
const moduleDirs = fs
  .readdirSync(moduleDirPath, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const moduleSelfImportBlocks = moduleDirs.map((moduleName) => ({
  files: [`src/modules/${moduleName}/**/*.{ts,tsx}`],
  rules: {
    "no-restricted-imports": ["error", {
      paths: [
        {
          name: `@/modules/${moduleName}`,
          message:
            `模块内部禁止自引用顶入口 @/modules/${moduleName}（经 index.ts 转一圈会形成 barrel 循环）；` +
            "模块内部文件一律相对导入。",
        },
      ],
      patterns: moduleBoundaryPatterns,
    }],
    "no-restricted-syntax": noInferredServerTypeRule,
  },
}));

// 命中豁免清单的文件：边界规则整体降级为 warn。
// （这两个规则只在上面的边界块中出现，降级不会波及 Next.js 预设。）
const boundaryExemptBlocks =
  BOUNDARY_EXEMPT_FILES.length > 0
    ? [
        {
          files: BOUNDARY_EXEMPT_FILES,
          rules: {
            "no-restricted-imports": "warn",
            "no-restricted-syntax": "warn",
          },
        },
      ]
    : [];

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

  // ── agent 子系统：零业务知识 ──────────────────────────────────────────────
  {
    files: ["src/agent/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        // `@/db` 顶入口必须走 paths 精确匹配：gitignore 语义下，
        // group 里出现「禁目录本体」的 pattern 会让取反 `!` 全部失效
        //（父目录被排除后子路径不可再 re-include，ESLint 底层 ignore 包行为）。
        paths: [
          {
            name: "@/db",
            message:
              "agent 只可读 @/db/schema（全项目公共契约层）；" +
              "运行时 client 与数据访问属各模块 queries/service，请在业务层完成后以数据形式交给 agent。",
          },
        ],
        patterns: [
          {
            group: ["@/app", "@/app/**"],
            message:
              "agent 是能力子系统，零业务知识，禁止依赖路由层；" +
              "业务知识只经模块 tools.ts（api/chat/route.ts 组装时注册）或 persona/prompt 数据流入。",
          },
          {
            group: ["@/modules", "@/modules/**"],
            message:
              "agent 是能力子系统，零业务知识，禁止 import 业务模块；" +
              "业务只能经各模块 tools.ts 注入，或作为数据传入 prompts 构造函数。",
          },
          {
            group: ["@/components/**"],
            message:
              "agent 子系统不依赖 UI 组件；如需产出可展示结果，请返回结构化数据由模块/组件层渲染。",
          },
          {
            group: ["@/stores/**"],
            message:
              "agent 在服务端单执行位运行，禁止依赖客户端 zustand store；纯 UI 状态与 agent 无关。",
          },
          {
            group: ["@/locales/**"],
            message:
              "agent 不直接读 i18n 文案；需要语言适配时由调用方把文案作为数据传入。",
          },
          {
            // 取反走 gitignore 语义（ESLint 用 ignore 包匹配 group）：
            // 禁 @/db 下所有内容，白名单放行 @/db/schema 子树
            // （`!@/db/schema` 先放行目录本体，`!@/db/schema/**` 再放行其下文件）。
            // 新增 @/db 顶层入口（如 @/db/client 换名）时须同步此清单。
            group: ["@/db/**", "!@/db/schema", "!@/db/schema/**"],
            message:
              "agent 只可读 @/db/schema（全项目公共契约层）；" +
              "运行时 client 与数据访问属各模块 queries/service，请在业务层完成后以数据形式交给 agent。",
          },
        ],
      }],
    },
  },

  // ── 业务模块：禁反向依赖 app，跨模块只走顶入口 + 类型禁推断 ────────────────
  // 仅覆盖 src/modules 顶层散文件；各模块目录由下方 moduleSelfImportBlocks
  // （含本块全部规则 + 自引用禁令）整体接管。
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: moduleBoundaryPatterns,
      }],
      "no-restricted-syntax": noInferredServerTypeRule,
    },
  },

  // ── 公共层 components：可经顶入口取模块类型与数据，禁深路径 + 类型禁推断 ──
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/modules/*/**"],
            message:
              "公共层组件不得深入模块内部；请改用 @/modules/<m> 顶入口（index.ts）导出的类型与数据。",
          },
        ],
      }],
      "no-restricted-syntax": noInferredServerTypeRule,
    },
  },

  // ── 公共层 stores / locales：同样禁模块深路径 ─────────────────────────────
  {
    files: ["src/stores/**/*.{ts,tsx}", "src/locales/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/modules/*/**"],
            message:
              "公共层不得深入模块内部；请改用 @/modules/<m> 顶入口（index.ts）导出的类型与数据。",
          },
        ],
      }],
    },
  },

  // src/app/** 不设限：组装层可 import 一切。

  ...moduleSelfImportBlocks,
  ...boundaryExemptBlocks,
]);

export default eslintConfig;
