#!/usr/bin/env bash
# 安装依赖 + 初始化数据库
set -e
cd "$(dirname "$0")/.."
mkdir -p logs data
echo "[$(date '+%F %T')] setup 开始" | tee -a logs/setup.log
npm install >> logs/setup.log 2>&1
echo "[$(date '+%F %T')] 依赖安装完成" | tee -a logs/setup.log
npm run import 2>&1 | tee -a logs/setup.log
echo "[$(date '+%F %T')] setup 完成" | tee -a logs/setup.log
