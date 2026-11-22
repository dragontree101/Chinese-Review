#!/usr/bin/env bash
# 停止 dev / start 服务
cd "$(dirname "$0")/.."
for name in dev start; do
  pidfile="logs/$name.pid"
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      echo "$name (PID $pid) 已停止"
    else
      echo "$name 未在运行"
    fi
    rm -f "$pidfile"
  fi
done
