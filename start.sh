#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

# Select proven Paramiko 2.12.0 virtualenv runtime for Python backend
if [ -x "/root/netvision/venv-paramiko-test/bin/python" ]; then
  export PYTHON_EXEC="/root/netvision/venv-paramiko-test/bin/python"
elif [ -x "$DIR/venv-paramiko-test/bin/python" ]; then
  export PYTHON_EXEC="$DIR/venv-paramiko-test/bin/python"
elif [ -x "/root/netvision/venv/bin/python" ]; then
  export PYTHON_EXEC="/root/netvision/venv/bin/python"
fi

if [ -f "$DIR/.env" ]; then
  set -a
  source "$DIR/.env" 2>/dev/null || true
  set +a
fi

if command -v systemctl &>/dev/null && systemctl list-unit-files 2>/dev/null | grep -q nettopology.service; then
  echo -e "\033[0;32mروشن کردن سرویس nettopology از طریق systemd...\033[0m"
  sudo systemctl start nettopology
  sudo systemctl status nettopology --no-pager
else
  echo -e "\033[0;36mاجرای پنل در حالت مستقیم Node...\033[0m"
  if [ -f "dist/server.cjs" ]; then
    node dist/server.cjs
  else
    npm run dev
  fi
fi
