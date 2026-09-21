#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Select proven Paramiko 2.12.0 virtualenv runtime for Python backend
if [ -x "/root/netvision/venv-paramiko-test/bin/python" ]; then
  export PYTHON_EXEC="/root/netvision/venv-paramiko-test/bin/python"
elif [ -x "$DIR/venv-paramiko-test/bin/python" ]; then
  export PYTHON_EXEC="$DIR/venv-paramiko-test/bin/python"
fi

# Ensure any orphaned/stale Python backend process is cleanly terminated
pkill -9 -f "backend/server.py" 2>/dev/null || true
fuser -k 5001/tcp 2>/dev/null || true
fuser -k 5002/tcp 2>/dev/null || true

if command -v systemctl &>/dev/null && systemctl list-unit-files 2>/dev/null | grep -q nettopology.service; then
  echo -e "\033[0;33mراه‌اندازی مجدد سرویس nettopology...\033[0m"
  sudo systemctl restart nettopology
  sudo systemctl status nettopology --no-pager
else
  "$DIR/stop.sh"
  sleep 1
  "$DIR/start.sh"
fi
