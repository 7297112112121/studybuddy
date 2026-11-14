#!/usr/bin/env bash
# 服务器端部署脚本（ADR-0018 第二层）：由 Deploy 流水线经原生 ssh 调用，
# 也可手工执行——GitHub Actions 故障时的逃生通道（runbook，ADR-0018 风险缓解）。
#
# 用法：./scripts/deploy.sh <短SHA> <dev|test>（自带 git fetch/checkout，
#       服务器直连 GitHub 的间歇抖动由内置重试吸收）
# 前提：当前目录为服务器上的仓库克隆（部署目录 /opt/studybuddy）；
#       docker 已登录 TCR（拉取凭证留在服务器本地）；
#       本地 .env 已提供 POSTGRES_PASSWORD / DATABASE_URL / REDIS_URL /
#       BETTER_AUTH_SECRET（ADR-0022：应用机密只存服务器本地）。
# 幂等：重复执行同一 tag 结果一致；失败即中止，旧容器继续运行。

set -euo pipefail

sha="${1:?用法: deploy.sh <短SHA> <dev|test>}"
env_name="${2:?用法: deploy.sh <短SHA> <dev|test>}"
if [ "$env_name" != dev ] && [ "$env_name" != test ]; then
  echo "环境名必须是 dev 或 test，收到：$env_name" >&2
  exit 1
fi

# git fetch 内置重试：服务器（国内）直连 github.com 存在间歇性 TLS 中断
# （GnuTLS -110），单次失败直接中止会让部署随机挂掉，退避重试吸收抖动
fetch_ok=0
for attempt in 1 2 3; do
  if git fetch origin; then
    fetch_ok=1
    break
  fi
  echo "[第 ${attempt} 次失败] git fetch 失败，$((attempt * 10)) 秒后重试" >&2
  sleep $((attempt * 10))
done
if [ "$fetch_ok" != 1 ]; then
  echo "git fetch 三次均失败——服务器到 GitHub 的连接持续不可用" >&2
  exit 1
fi
git checkout "$sha"

registry="ccr.ccs.tencentyun.com"
image="$registry/studybuddy/app:$sha"

# dev/test 共居一台服务器（ADR-0018）：不同 compose project + 不同端口区分
if [ "$env_name" = dev ]; then
  http_port=80
  https_port=443
else
  http_port=8080
  https_port=8443
fi

export APP_IMAGE="$image"
export HTTP_PORT="$http_port"
export HTTPS_PORT="$https_port"

compose() { docker compose -p "studybuddy-$env_name" "$@"; }

# 应用机密预检（ADR-0022）：.env 缺失时 compose 插值也会 fail-fast，
# 此处提前一步给出可读指引，避免半途而废
if ! grep -q '^POSTGRES_PASSWORD=.\+' .env 2>/dev/null; then
  echo "缺少本地 .env 或 POSTGRES_PASSWORD 为空——请在部署目录提供" >&2
  echo "POSTGRES_PASSWORD / DATABASE_URL / REDIS_URL / BETTER_AUTH_SECRET（ADR-0022）" >&2
  exit 1
fi

# 先拉镜像：拉取失败（网络 / 凭证失效 / 镜像不存在）时旧容器原样运行
compose pull app caddy postgres redis

# 数据库迁移（一次性容器，drizzle migrator 增量应用）：
# 失败即中止——schema 未就绪的 app 不该被拉起，旧容器继续运行
compose --profile tools run --rm migrate

# --wait：等待所有 healthcheck 服务变 healthy 才返回；超时失败，旧容器不回滚（重放历史部署即回滚）
compose up -d --wait --wait-timeout 180

# 终验：经 caddy 公网入口探活（非容器内直连，验证「caddy → app」整条链路）
curl -fsS --max-time 10 "http://127.0.0.1:$http_port/" >/dev/null

echo "[$env_name] 部署完成：$image（http://<服务器IP>:$http_port/）"
