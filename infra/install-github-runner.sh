#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/astraquest/Kitabu}"
RUNNER_USER="${RUNNER_USER:-samora}"
RUNNER_HOME="${RUNNER_HOME:-/home/${RUNNER_USER}/actions-runner}"
RUNNER_NAME="${RUNNER_NAME:-kitabu-prod-$(hostname -s)}"
RUNNER_LABELS="${RUNNER_LABELS:-kitabu-prod,linux,x64}"
RUNNER_VERSION="${RUNNER_VERSION:-2.328.0}"
LIVE_DIR="${LIVE_DIR:-/home/${RUNNER_USER}/deploy/kitabu-live}"

if [[ -z "${RUNNER_TOKEN:-}" ]]; then
  echo "RUNNER_TOKEN is required. Generate one with:"
  echo "  gh api -X POST repos/astraquest/Kitabu/actions/runners/registration-token --jq .token"
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run this script with sudo on the production host."
  exit 1
fi

apt-get update
apt-get install -y curl ca-certificates tar git rsync docker.io docker-compose-plugin

id "${RUNNER_USER}" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "${RUNNER_USER}"
usermod -aG docker "${RUNNER_USER}"

mkdir -p "${RUNNER_HOME}" "${LIVE_DIR}"
chown -R "${RUNNER_USER}:${RUNNER_USER}" "$(dirname "${RUNNER_HOME}")" "$(dirname "${LIVE_DIR}")"

if [[ ! -x "${RUNNER_HOME}/config.sh" ]]; then
  tmp_dir="$(mktemp -d)"
  curl -fsSL \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" \
    -o "${tmp_dir}/actions-runner.tar.gz"
  tar -xzf "${tmp_dir}/actions-runner.tar.gz" -C "${RUNNER_HOME}"
  rm -rf "${tmp_dir}"
  chown -R "${RUNNER_USER}:${RUNNER_USER}" "${RUNNER_HOME}"
fi

if [[ -f "${RUNNER_HOME}/.runner" ]]; then
  systemctl stop actions.runner.astraquest-Kitabu."${RUNNER_NAME}".service 2>/dev/null || true
  sudo -u "${RUNNER_USER}" bash -lc "cd '${RUNNER_HOME}' && ./config.sh remove --unattended --token '${RUNNER_TOKEN}'" || true
fi

sudo -u "${RUNNER_USER}" bash -lc "cd '${RUNNER_HOME}' && ./config.sh \
  --url '${REPO_URL}' \
  --token '${RUNNER_TOKEN}' \
  --name '${RUNNER_NAME}' \
  --labels '${RUNNER_LABELS}' \
  --work '_work' \
  --unattended \
  --replace"

cd "${RUNNER_HOME}"
./svc.sh install "${RUNNER_USER}"
./svc.sh start

systemctl status actions.runner.astraquest-Kitabu."${RUNNER_NAME}".service --no-pager
