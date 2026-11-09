#!/usr/bin/env bash
# ==============================================================================
# OrderFirst Monorepo Change Detection Script for Jenkins CI/CD
# ==============================================================================
# Analyzes git diff between commits to selectively determine which microservices
# have changed and need to be tested, built, and deployed.
#
# Usage:
#   ./detect-changes.sh [BASE_COMMIT] [TARGET_COMMIT]
#
# Examples:
#   ./detect-changes.sh HEAD~1 HEAD
#   ./detect-changes.sh origin/main HEAD
# ==============================================================================

set -euo pipefail

BASE_COMMIT="${1:-HEAD~1}"
TARGET_COMMIT="${2:-HEAD}"
ENV_OUTPUT_FILE="${CHANGE_ENV_FILE:-changes.env}"

echo "======================================================"
echo "OrderFirst Git Change Detection"
echo "Comparing: ${BASE_COMMIT} -> ${TARGET_COMMIT}"
echo "======================================================"

# Initialize all flags to false
BUILD_AUTH=false
BUILD_CATALOG=false
BUILD_BOOKING=false
BUILD_ORDERS=false
BUILD_NOTIFY=false
BUILD_GATEWAY=false
BUILD_CLIENT=false
BUILD_DB_MIGRATE=false
ANY_CHANGED=false

# Get list of changed files
CHANGED_FILES=""
if git rev-parse --verify "${BASE_COMMIT}" >/dev/null 2>&1 && git rev-parse --verify "${TARGET_COMMIT}" >/dev/null 2>&1; then
  CHANGED_FILES=$(git diff --name-only "${BASE_COMMIT}" "${TARGET_COMMIT}" 2>/dev/null || true)
else
  echo "[WARN] Could not resolve commit range ${BASE_COMMIT}..${TARGET_COMMIT}. Falling back to previous commit HEAD~1..HEAD"
  CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || true)
fi

# If force all flag is set or no git diff available, build everything
if [ "${FORCE_BUILD_ALL:-false}" = "true" ] || [ -z "${CHANGED_FILES}" ]; then
  echo "[INFO] Full build triggered (FORCE_BUILD_ALL=${FORCE_BUILD_ALL:-false} or initial commit)."
  BUILD_AUTH=true
  BUILD_CATALOG=true
  BUILD_BOOKING=true
  BUILD_ORDERS=true
  BUILD_NOTIFY=true
  BUILD_GATEWAY=true
  BUILD_CLIENT=true
  BUILD_DB_MIGRATE=true
  ANY_CHANGED=true
else
  echo "[INFO] Changed files detected:"
  echo "${CHANGED_FILES}" | sed 's/^/  - /'
  echo "------------------------------------------------------"

  # Check for global changes that require all services to rebuild
  if echo "${CHANGED_FILES}" | grep -qE '^(infra/|deploy/|package\.json$|package-lock\.json$|\.env)'; then
    echo "[INFO] Global infrastructure, root dependencies, deploy or compose files modified. Triggering all services."
    BUILD_AUTH=true
    BUILD_CATALOG=true
    BUILD_BOOKING=true
    BUILD_ORDERS=true
    BUILD_NOTIFY=true
    BUILD_GATEWAY=true
    BUILD_CLIENT=true
    BUILD_DB_MIGRATE=true
    ANY_CHANGED=true
  else
    # Check individual services
    if echo "${CHANGED_FILES}" | grep -qE '^services/auth/'; then
      BUILD_AUTH=true
      ANY_CHANGED=true
    fi

    if echo "${CHANGED_FILES}" | grep -qE '^services/catalog/'; then
      BUILD_CATALOG=true
      ANY_CHANGED=true
    fi

    if echo "${CHANGED_FILES}" | grep -qE '^services/booking/'; then
      BUILD_BOOKING=true
      ANY_CHANGED=true
    fi

    if echo "${CHANGED_FILES}" | grep -qE '^services/orders/'; then
      BUILD_ORDERS=true
      ANY_CHANGED=true
    fi

    if echo "${CHANGED_FILES}" | grep -qE '^services/notify/'; then
      BUILD_NOTIFY=true
      ANY_CHANGED=true
    fi

    if echo "${CHANGED_FILES}" | grep -qE '^services/gateway/'; then
      BUILD_GATEWAY=true
      ANY_CHANGED=true
    fi

    if echo "${CHANGED_FILES}" | grep -qE '^client/'; then
      BUILD_CLIENT=true
      ANY_CHANGED=true
    fi

    if echo "${CHANGED_FILES}" | grep -qE '(prisma/schema\.prisma|infra/postgres/)'; then
      BUILD_DB_MIGRATE=true
      ANY_CHANGED=true
    fi
  fi
fi

echo "======================================================"
echo "Detected Build Flags:"
echo "  BUILD_AUTH        = ${BUILD_AUTH}"
echo "  BUILD_CATALOG     = ${BUILD_CATALOG}"
echo "  BUILD_BOOKING     = ${BUILD_BOOKING}"
echo "  BUILD_ORDERS      = ${BUILD_ORDERS}"
echo "  BUILD_NOTIFY      = ${BUILD_NOTIFY}"
echo "  BUILD_GATEWAY     = ${BUILD_GATEWAY}"
echo "  BUILD_CLIENT      = ${BUILD_CLIENT}"
echo "  BUILD_DB_MIGRATE  = ${BUILD_DB_MIGRATE}"
echo "  ANY_CHANGED       = ${ANY_CHANGED}"
echo "======================================================"

# Write environment file for Jenkins Pipeline (readProperties / envVars)
cat <<EOF > "${ENV_OUTPUT_FILE}"
BUILD_AUTH=${BUILD_AUTH}
BUILD_CATALOG=${BUILD_CATALOG}
BUILD_BOOKING=${BUILD_BOOKING}
BUILD_ORDERS=${BUILD_ORDERS}
BUILD_NOTIFY=${BUILD_NOTIFY}
BUILD_GATEWAY=${BUILD_GATEWAY}
BUILD_CLIENT=${BUILD_CLIENT}
BUILD_DB_MIGRATE=${BUILD_DB_MIGRATE}
ANY_CHANGED=${ANY_CHANGED}
EOF

echo "[SUCCESS] Build flags exported to ${ENV_OUTPUT_FILE}"

