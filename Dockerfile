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
USER node
EXPOSE 3000
CMD ["node", "server.js"]
