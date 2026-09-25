#!/usr/bin/env bash
# Start the app with the venv interpreter, no activation required.
# Immune to the "wrong Python" / ModuleNotFoundError trap.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then
    echo "No virtualenv found. Creating one and installing dependencies..."
    python3 -m venv .venv
    .venv/bin/pip install --quiet --upgrade pip
    .venv/bin/pip install --quiet -r requirements.txt
fi

if [ ! -f .env ]; then
    echo "Note: .env is missing. Copy the template and add your Google OAuth client:"
    echo "    cp .env.example .env"
fi

exec .venv/bin/python main.py "$@"
