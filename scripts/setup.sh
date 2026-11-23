#!/usr/bin/env bash
# 安装依赖 + 初始化数据库（含 submodule 初始化与英语词库导入）
set -e
cd "$(dirname "$0")/.."
mkdir -p logs data
echo "[$(date '+%F %T')] setup 开始" | tee -a logs/setup.log

# 英语词库 submodule 兜底（未初始化时英语板块词库为空）
if [ ! -d third_party/english-vocabulary/full_line_jsonl ]; then
  echo "[$(date '+%F %T')] 初始化词库 submodule..." | tee -a logs/setup.log
  git submodule update --init --depth 1 third_party/english-vocabulary \
    || echo "[警告] submodule 初始化失败，请手动执行: git submodule update --init third_party/english-vocabulary" \
    | tee -a logs/setup.log
fi

npm install >> logs/setup.log 2>&1
echo "[$(date '+%F %T')] 依赖安装完成" | tee -a logs/setup.log
npm run import 2>&1 | tee -a logs/setup.log
bash scripts/import-english.sh
echo "[$(date '+%F %T')] setup 完成" | tee -a logs/setup.log
