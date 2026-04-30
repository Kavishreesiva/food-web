#!/usr/bin/env sh
set -eu

PROJECT_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
APP_DIR="$PROJECT_ROOT/devops-panel"
ZIP_FILE="$PROJECT_ROOT/devops-project.zip"
STAGING_DIR="${TMPDIR:-/tmp}/devops-project-package"

if [ ! -d "$APP_DIR" ]; then
  echo "Error: expected Node.js app directory not found: $APP_DIR"
  exit 1
fi

if [ ! -f "$APP_DIR/server.js" ]; then
  echo "Error: missing $APP_DIR/server.js"
  exit 1
fi

if [ ! -f "$APP_DIR/package.json" ]; then
  echo "Error: missing $APP_DIR/package.json"
  exit 1
fi

if [ ! -d "$APP_DIR/public" ]; then
  echo "Error: missing $APP_DIR/public"
  exit 1
fi

if [ ! -f "$PROJECT_ROOT/deployment.yaml" ]; then
  echo "Error: missing $PROJECT_ROOT/deployment.yaml"
  exit 1
fi

if [ ! -f "$PROJECT_ROOT/service.yaml" ]; then
  echo "Error: missing $PROJECT_ROOT/service.yaml"
  exit 1
fi

rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

cp -R "$APP_DIR/." "$STAGING_DIR/"
cp "$PROJECT_ROOT/deployment.yaml" "$STAGING_DIR/deployment.yaml"
cp "$PROJECT_ROOT/service.yaml" "$STAGING_DIR/service.yaml"
cp "$PROJECT_ROOT/setup.sh" "$STAGING_DIR/setup.sh"

if [ -f "$PROJECT_ROOT/Dockerfile" ]; then
  cp "$PROJECT_ROOT/Dockerfile" "$STAGING_DIR/Dockerfile"
fi

if [ -f "$PROJECT_ROOT/README.md" ]; then
  cp "$PROJECT_ROOT/README.md" "$STAGING_DIR/README.md"
fi

if [ -f "$PROJECT_ROOT/analysis-template.yaml" ]; then
  cp "$PROJECT_ROOT/analysis-template.yaml" "$STAGING_DIR/analysis-template.yaml"
fi

if [ -f "$PROJECT_ROOT/rollout.yaml" ]; then
  cp "$PROJECT_ROOT/rollout.yaml" "$STAGING_DIR/rollout.yaml"
fi

if [ -d "$PROJECT_ROOT/argocd" ]; then
  cp -R "$PROJECT_ROOT/argocd" "$STAGING_DIR/argocd"
fi

rm -f "$ZIP_FILE"

cd "$STAGING_DIR"

# Creates a ZIP with the project files at archive root, with no extra parent folder.
zip -r "$ZIP_FILE" . -x "node_modules/*" ".git/*" "logs/*" "*.log" "devops-project.zip"

echo "Created: $ZIP_FILE"
echo
echo "Verify contents with:"
echo "  unzip -l devops-project.zip"
