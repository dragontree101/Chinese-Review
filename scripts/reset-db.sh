#!/usr/bin/env bash
# 清空重建数据库
set -e
cd "$(dirname "$0")/.."
mkdir -p logs data
rm -f data/app.db data/app.db-wal data/app.db-shm
npm run import 2>&1 | tee -a logs/import.log
bash scripts/import-english.sh
