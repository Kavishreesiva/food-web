#!/usr/bin/env sh
set -eu

PROJECT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

cd "$PROJECT_DIR"

if [ ! -f package.json ] || [ ! -f server.js ]; then
  echo "Error: package.json and server.js must be in the same directory as setup.sh."
  echo "Run this script from the extracted DevOps project ZIP."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Install Node.js 18 or newer, then run ./setup.sh again."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed. Install npm, then run ./setup.sh again."
  exit 1
fi

echo "Installing Node.js dependencies..."
npm install

echo "Starting DevOps backend..."
node server.js
