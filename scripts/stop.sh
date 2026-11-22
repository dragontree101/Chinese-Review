#!/usr/bin/env bash
# 停止 dev / start 服务，并确保 3000 端口被释放
# （npm 包装进程被 kill 后，next-server 子进程可能存活占用端口）
cd "$(dirname "$0")/.."
for name in dev start; do
  pidfile="logs/$name.pid"
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      # 杀掉整个进程组（nohup 启动的包装进程与子进程）
      kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null
      echo "$name (PID $pid) 已停止"
    else
      echo "$name 未在运行"
    fi
    rm -f "$pidfile"
  fi
done

# 兜底：若 3888 端口仍被占用（残留的 next-server 子进程），强制释放
sleep 1
if command -v ss >/dev/null 2>&1; then
  port_pid=$(ss -tlnp 2>/dev/null | grep ':3888 ' | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
  if [ -n "$port_pid" ]; then
    kill -9 "$port_pid" 2>/dev/null
    echo "已强制释放 3888 端口 (PID $port_pid)"
    sleep 1
  fi
fi

# 最终确认
if ss -tlnp 2>/dev/null | grep -q ':3888 '; then
  echo "警告：3888 端口仍被占用，请手动检查: ss -tlnp | grep 3888"
else
  echo "3888 端口已释放"
fi
