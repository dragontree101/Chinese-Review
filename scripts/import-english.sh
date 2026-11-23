#!/usr/bin/env bash
# 导入英语词库（submodule 数据 → e_words 表）
set -e
cd "$(dirname "$0")/.."
mkdir -p logs data
npm run import-english 2>&1 | tee -a logs/import-english.log
