# syntax=docker/dockerfile:1
# 应用镜像（ADR-0016）：Next.js standalone 多阶段构建。
# 构建期不注入任何应用环境变量，运行时注入（单镜像多环境）；
# 运行时所需的机密只经服务器本地 .env 提供，从不进入镜像（ADR-0022）。

# ---- 阶段 1：依赖 ----
# .dockerignore 已排除 website/ 等工作区，npm ci 对缺失工作区自动跳过其依赖
# （已实测：lock 含 website 条目时删除目录后 npm ci 正常且不装其依赖），
# Docusaurus 依赖树不会进入构建层。
# --ignore-scripts：跳过根 package.json 的 prepare（git config core.hooksPath），
# 容器内无 git 也无需本地钩子。
FROM node:26.13-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --ignore-scripts

# ---- 阶段 2：构建 ----
FROM node:26.13-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 阶段 3：运行 ----
# standalone 产物不含 public 与 .next/static，需按官方 output 文档手工带入；
# server.js 通过 PORT / HOSTNAME 环境变量监听（已在下方默认 0.0.0.0:3000）
FROM node:26.13-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# 迁移执行件(compose 服务 migrate,scripts/db-migrate.mjs 说明):
# drizzle-orm / postgres 两包从构建层整包带入——standalone 追踪只含应用
# 实际导入的文件,不保证 migrator 子路径存在;两包均零运行时依赖,整包拷贝即自洽。
# 迁移 SQL 与执行脚本一并入镜像,部署期在服务器上按记账表增量应用。
COPY --from=build --chown=node:node /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build --chown=node:node /app/node_modules/postgres ./node_modules/postgres
COPY --from=build --chown=node:node /app/src/db/migrations ./src/db/migrations
COPY --chown=node:node scripts/db-migrate.mjs ./db-migrate.mjs
# 剥离 npm：纯构建期工具，运行时只需 node 二进制。其 vendored 依赖
# （undici 6.28.0 / brace-expansion 5.0.9，npm 11.20.0 自用副本）带 HIGH CVE
# 且上游 node:26.13 尚无修复版——剥离即消除，不走 .trivyignore 豁免（ADR-0021）
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
USER node
EXPOSE 3000
CMD ["node", "server.js"]
