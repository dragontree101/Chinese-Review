#!/usr/bin/env bash
# 开发模式启动（后台），PID 与日志写入 logs/
set -e
cd "$(dirname "$0")/.."
mkdir -p logs data
if [ -f logs/dev.pid ] && kill -0 "$(cat logs/dev.pid)" 2>/dev/null; then
  echo "dev 服务已在运行 (PID $(cat logs/dev.pid))"
  exit 0
fi
nohup npm run dev >> logs/dev.log 2>&1 &
echo $! > logs/dev.pid
echo "dev 已启动 (PID $(cat logs/dev.pid))，日志: logs/dev.log"
