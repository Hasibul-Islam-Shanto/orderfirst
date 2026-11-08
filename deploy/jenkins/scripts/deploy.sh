#!/usr/bin/env bash
# ==============================================================================
# OrderFirst Zero-Downtime Rolling Deployment Script for Jenkins CI/CD
# ==============================================================================
# Updates only the modified microservice containers using Docker Compose.
# Untouched services, PostgreSQL, and RabbitMQ remain completely uninterrupted.
#
# Usage:
#   ./deploy.sh [dev|prod] [SERVICE_LIST...]
#
# Examples:
#   ./deploy.sh dev auth
#   ./deploy.sh prod auth orders gateway
#   ./deploy.sh prod              # deploys all if no services specified
# ==============================================================================

set -euo pipefail

ENV_TARGET="${1:-dev}"
shift || true

SERVICES_TO_DEPLOY="$*"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/deploy/compose/docker-compose.${ENV_TARGET}.yml"
ENV_FILE="${PROJECT_ROOT}/.env.${ENV_TARGET}"

echo "======================================================"
echo "OrderFirst Zero-Downtime Deployment"
echo "Environment: ${ENV_TARGET}"
echo "Compose File: ${COMPOSE_FILE}"
echo "======================================================"

# Verify Compose File exists
if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "[ERROR] Docker compose file not found: ${COMPOSE_FILE}"
  exit 1
fi

# Fallback env file if .env.<env> doesn't exist
if [ ! -f "${ENV_FILE}" ]; then
  if [ -f "${PROJECT_ROOT}/.env" ]; then
    echo "[WARN] Target env file ${ENV_FILE} not found. Falling back to ${PROJECT_ROOT}/.env"
    ENV_FILE="${PROJECT_ROOT}/.env"
  else
    echo "[WARN] No .env file found. Proceeding with Docker Compose environment defaults."
    ENV_FILE=""
  fi
fi

ENV_ARG=""
if [ -n "${ENV_FILE}" ]; then
  ENV_ARG="--env-file ${ENV_FILE}"
fi

# Step 1: Run database migrations if flagged
if [ "${BUILD_DB_MIGRATE:-false}" = "true" ]; then
  echo "[INFO] Database schema changes detected. Running db-migrate..."
  docker compose -f "${COMPOSE_FILE}" ${ENV_ARG} run --rm db-migrate
  echo "[SUCCESS] Migrations deployed successfully."
fi

# Step 2: Deploy changed services with --no-deps
if [ -n "${SERVICES_TO_DEPLOY}" ]; then
  echo "[INFO] Performing selective rolling restart for services: ${SERVICES_TO_DEPLOY}"
  # shellcheck disable=SC2086
  docker compose -f "${COMPOSE_FILE}" ${ENV_ARG} up -d --no-deps ${SERVICES_TO_DEPLOY}
else
  echo "[INFO] No specific services supplied. Deploying entire stack..."
  docker compose -f "${COMPOSE_FILE}" ${ENV_ARG} up -d
fi

# Step 3: Healthcheck verification
echo "------------------------------------------------------"
echo "[INFO] Verifying API Gateway readiness..."
MAX_RETRIES=15
RETRY_COUNT=0
HEALTHY=false

# Determine gateway port (defaults to 4000)
GATEWAY_URL="http://localhost:4000/health"

while [ "${RETRY_COUNT}" -lt "${MAX_RETRIES}" ]; do
  if curl -s -f "${GATEWAY_URL}" >/dev/null 2>&1; then
    HEALTHY=true
    break
  fi
  echo "Waiting for Gateway to report healthy... (attempt $((RETRY_COUNT + 1))/${MAX_RETRIES})"
  sleep 2
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ "${HEALTHY}" = "true" ]; then
  echo "======================================================"
  echo "✅ [SUCCESS] Deployment healthy! Services are online."
  echo "======================================================"
else
  echo "======================================================"
  echo "❌ [ERROR] Gateway health check failed after ${MAX_RETRIES} attempts."
  echo "Check container logs with: docker compose -f ${COMPOSE_FILE} logs --tail=50"
  echo "======================================================"
  exit 1
fi
