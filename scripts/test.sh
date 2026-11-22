#!/usr/bin/env bash
# 运行单元测试
set -e
cd "$(dirname "$0")/.."
mkdir -p logs
npm test "$@" 2>&1 | tee logs/test.log
