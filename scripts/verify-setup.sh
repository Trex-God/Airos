#!/usr/bin/env bash
# AI-ROS local setup verification
# Make executable: chmod +x scripts/verify-setup.sh

set -uo pipefail

FAILED=0

pass() { echo "PASS: $1"; }
fail() {
  echo "FAIL: $1"
  echo "  Fix: $2"
  FAILED=1
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

version_ge() {
  # Returns 0 if $1 >= $2 (semver-style, numeric segments)
  local ver1="$1" ver2="$2"
  if [[ "$(printf '%s\n%s\n' "$ver2" "$ver1" | sort -V | head -n1)" == "$ver2" ]]; then
    return 0
  fi
  return 1
}

normalize_version() {
  # Strip leading 'v' and take first line only
  echo "$1" | sed 's/^v//' | head -n1 | tr -d '[:space:]'
}

check_python3() {
  local min="3.11"
  if ! command_exists python3; then
    fail "python3 (>= ${min})" "Install Python 3.11+: https://www.python.org/downloads/ (macOS: brew install python@3.11)"
    return
  fi
  local raw ver
  raw="$(python3 --version 2>&1)"
  ver="$(normalize_version "${raw#Python }")"
  if version_ge "$ver" "$min"; then
    pass "python3 ${ver} (>= ${min})"
  else
    fail "python3 ${ver} (>= ${min} required)" "Upgrade Python: https://www.python.org/downloads/ (macOS: brew install python@3.11)"
  fi
}

check_node() {
  local min="20.0.0"
  if ! command_exists node; then
    fail "node (>= ${min})" "Install Node.js 20+: https://nodejs.org/ (macOS: brew install node@20; or: nvm install 20)"
    return
  fi
  local ver
  ver="$(normalize_version "$(node --version 2>&1)")"
  if version_ge "$ver" "$min"; then
    pass "node ${ver} (>= ${min})"
  else
    fail "node ${ver} (>= ${min} required)" "Upgrade Node.js: https://nodejs.org/ (or: nvm install 20 && nvm use 20)"
  fi
}

check_npm() {
  local min="10.0.0"
  if ! command_exists npm; then
    fail "npm (>= ${min})" "Install npm 10+ with Node.js 20+: https://nodejs.org/ (or: npm install -g npm@latest)"
    return
  fi
  local ver
  ver="$(normalize_version "$(npm --version 2>&1)")"
  if version_ge "$ver" "$min"; then
    pass "npm ${ver} (>= ${min})"
  else
    fail "npm ${ver} (>= ${min} required)" "Upgrade npm: npm install -g npm@latest"
  fi
}

check_docker() {
  if ! command_exists docker; then
    fail "docker (installed + daemon running)" "Install Docker: https://docs.docker.com/get-docker/"
    return
  fi

  local info_out server_version
  info_out="$(docker info 2>&1)" || true
  server_version="$(echo "$info_out" | grep -i 'Server Version' | head -n1 | sed 's/.*Server Version: *//')"

  if [[ -z "$server_version" ]]; then
    fail "docker daemon running" "Start Docker Desktop or the Docker service, then run: docker ps"
    return
  fi

  if ! docker ps >/dev/null 2>&1; then
    fail "docker ps" "Docker daemon not reachable. Start Docker Desktop or run: sudo systemctl start docker"
    return
  fi

  pass "docker (Server Version: ${server_version}, daemon running)"
}

check_git() {
  if ! command_exists git; then
    fail "git" "Install Git: https://git-scm.com/downloads (macOS: brew install git; Ubuntu: sudo apt install git)"
    return
  fi
  local ver
  ver="$(normalize_version "$(git --version 2>&1 | awk '{print $3}')")"
  pass "git ${ver}"
}

check_gcloud() {
  if ! command_exists gcloud; then
    fail "gcloud CLI" "Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install (macOS: brew install --cask google-cloud-sdk)"
    return
  fi
  local ver
  ver="$(gcloud version 2>/dev/null | head -n1 | awk '{print $4}' || echo "unknown")"
  pass "gcloud (${ver})"
}

check_gcloud_auth() {
  if ! command_exists gcloud; then
    fail "gcloud authenticated" "Install gcloud first: https://cloud.google.com/sdk/docs/install"
    return
  fi

  local active
  active="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n1)"

  if [[ -n "$active" ]]; then
    pass "gcloud authenticated (${active})"
  else
    fail "gcloud authenticated" "Run: gcloud auth login"
  fi
}

main() {
  echo "AI-ROS setup verification"
  echo "========================="
  echo ""

  check_python3
  check_node
  check_npm
  check_docker
  check_git
  check_gcloud
  check_gcloud_auth

  echo ""
  if [[ "$FAILED" -ne 0 ]]; then
    echo "One or more checks failed. Fix the issues above and re-run:"
    echo "  chmod +x scripts/verify-setup.sh && ./scripts/verify-setup.sh"
    exit 1
  fi

  echo "All checks passed."
  echo "Run anytime with: chmod +x scripts/verify-setup.sh && ./scripts/verify-setup.sh"
  exit 0
}

main "$@"
