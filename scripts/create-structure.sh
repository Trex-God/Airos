#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DIRECTORIES=(
  "frontend/app/dashboard"
  "frontend/app/login"
  "frontend/app/auth/error"
  "frontend/app/api/health"
  "frontend/app/api/run-task"
  "frontend/app/api/tasks"
  "frontend/app/api/memory"
  "frontend/app/api/agents"
  "frontend/app/api/billing/checkout"
  "frontend/app/api/billing/webhook"
  "frontend/app/api/clerk/webhook"
  "frontend/components"
  "frontend/lib"
  "frontend/types"
  "n8n-workflows"
  "infrastructure"
  "__tests__"
  "evidence"
  ".github/workflows"
)

for directory in "${DIRECTORIES[@]}"; do
  mkdir -p "$ROOT/$directory"
done

touch "$ROOT/n8n-workflows/.gitkeep"
touch "$ROOT/evidence/.gitkeep"

printf 'AI-ROS directory structure is present.\n'
