#!/usr/bin/env bash
# 生产模式：build + start（后台）
set -e
cd "$(dirname "$0")/.."
mkdir -p logs data
if [ -f logs/start.pid ] && kill -0 "$(cat logs/start.pid)" 2>/dev/null; then
  echo "生产服务已在运行 (PID $(cat logs/start.pid))"
  exit 0
fi
echo "[$(date '+%F %T')] build 开始" | tee -a logs/start.log
npm run build >> logs/start.log 2>&1
nohup npm run start >> logs/start.log 2>&1 &
echo $! > logs/start.pid
echo "生产服务已启动 (PID $(cat logs/start.pid))，日志: logs/start.log"
