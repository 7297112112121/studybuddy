#!/usr/bin/env bash
# 服务器端部署脚本（ADR-0018 第二层）：由 Deploy 流水线经原生 ssh 调用，
# 也可手工执行——GitHub Actions 故障时的逃生通道（runbook，ADR-0018 风险缓解）。
#
# 用法：./scripts/deploy.sh <短SHA> <dev|test>
# 前提：当前目录为服务器上的仓库克隆（部署目录 /opt/studybuddy），
#       已 git checkout 到目标提交；docker 已登录 TCR（拉取凭证留在服务器本地）。
# 幂等：重复执行同一 tag 结果一致；失败即中止，旧容器继续运行。

set -euo pipefail

sha="${1:?用法: deploy.sh <短SHA> <dev|test>}"
env_name="${2:?用法: deploy.sh <短SHA> <dev|test>}"
if [ "$env_name" != dev ] && [ "$env_name" != test ]; then
  echo "环境名必须是 dev 或 test，收到：$env_name" >&2
  exit 1
fi

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

# 先拉镜像：拉取失败（网络 / 凭证失效 / 镜像不存在）时旧容器原样运行
compose pull app caddy

# --wait：等待所有 healthcheck 服务变 healthy 才返回；超时失败，旧容器不回滚（重放历史部署即回滚）
compose up -d --wait --wait-timeout 180

# 终验：经 caddy 公网入口探活（非容器内直连，验证「caddy → app」整条链路）
curl -fsS --max-time 10 "http://127.0.0.1:$http_port/" >/dev/null

echo "[$env_name] 部署完成：$image（http://<服务器IP>:$http_port/）"
