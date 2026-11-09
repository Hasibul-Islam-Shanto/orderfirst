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

# Sanitize arguments: filter out literal "null", empty strings, or invalid tokens
SERVICES_TO_DEPLOY=""
for arg in "$@"; do
  if [ -n "${arg}" ] && [ "${arg}" != "null" ]; then
    SERVICES_TO_DEPLOY="${SERVICES_TO_DEPLOY} ${arg}"
  fi
done
SERVICES_TO_DEPLOY="$(echo "${SERVICES_TO_DEPLOY}" | xargs)"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/deploy/compose/docker-compose.${ENV_TARGET}.yml"
ENV_FILE="${PROJECT_ROOT}/.env.${ENV_TARGET}"

echo "======================================================"
echo "OrderFirst Zero-Downtime Deployment"
echo "Environment:        ${ENV_TARGET}"
echo "Compose File:       ${COMPOSE_FILE}"
echo "Services Requested: ${SERVICES_TO_DEPLOY:-all}"
echo "======================================================"

# Verify Compose File exists
if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "[ERROR] Docker compose file not found: ${COMPOSE_FILE}"
  exit 1
fi

# Ensure target env file exists (prevents docker compose stat errors)
if [ ! -f "${ENV_FILE}" ]; then
  if [ -f "${PROJECT_ROOT}/.env" ]; then
    echo "[INFO] Target env file ${ENV_FILE} not found. Copying from ${PROJECT_ROOT}/.env"
    cp "${PROJECT_ROOT}/.env" "${ENV_FILE}"
  elif [ -f "${PROJECT_ROOT}/.env.${ENV_TARGET}.example" ]; then
    echo "[INFO] Target env file ${ENV_FILE} not found. Initializing from template .env.${ENV_TARGET}.example"
    cp "${PROJECT_ROOT}/.env.${ENV_TARGET}.example" "${ENV_FILE}"
  else
    echo "[WARN] No .env or template found. Creating empty ${ENV_FILE} to satisfy docker compose"
    touch "${ENV_FILE}"
  fi
fi

ENV_ARG="--env-file ${ENV_FILE}"

# Check if base infra containers (postgres & rabbitmq) are currently running
INFRA_ONLINE=true
if ! docker compose -f "${COMPOSE_FILE}" ${ENV_ARG} ps --status running --services 2>/dev/null | grep -qE "^postgres$"; then
  INFRA_ONLINE=false
fi

# Step 1: Run database migrations if flagged OR if infrastructure was not running
if [ "${BUILD_DB_MIGRATE:-false}" = "true" ] || [ "${INFRA_ONLINE}" = "false" ]; then
  echo "[INFO] Starting core infrastructure (PostgreSQL & RabbitMQ)..."
  docker compose -f "${COMPOSE_FILE}" ${ENV_ARG} up -d postgres rabbitmq

  echo "[INFO] Waiting for PostgreSQL readiness..."
  MAX_DB_RETRIES=30
  DB_RETRIES=0
  DB_READY=false
  while [ "${DB_RETRIES}" -lt "${MAX_DB_RETRIES}" ]; do
    if docker compose -f "${COMPOSE_FILE}" ${ENV_ARG} exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
      DB_READY=true
      break
    fi
    sleep 2
    DB_RETRIES=$((DB_RETRIES + 1))
  done

  if [ "${DB_READY}" = "true" ]; then
    echo "[INFO] PostgreSQL is healthy. Running database schema migrations (db-migrate)..."
    docker compose -f "${COMPOSE_FILE}" ${ENV_ARG} run --rm db-migrate
    echo "[SUCCESS] Migrations deployed successfully."
  else
    echo "[WARN] PostgreSQL readiness probe timed out; attempting migration anyway..."
    docker compose -f "${COMPOSE_FILE}" ${ENV_ARG} run --rm db-migrate || true
  fi
fi

# Step 2: Deploy services (Selective rolling restart or full stack)
if [ "${INFRA_ONLINE}" = "false" ] || [ -z "${SERVICES_TO_DEPLOY}" ]; then
  echo "[INFO] Base infrastructure newly started or all services flagged. Deploying full stack..."
  docker compose -f "${COMPOSE_FILE}" ${ENV_ARG} up -d
else
  echo "[INFO] Performing selective zero-downtime restart for services: ${SERVICES_TO_DEPLOY}"
  # shellcheck disable=SC2086
  docker compose -f "${COMPOSE_FILE}" ${ENV_ARG} up -d --no-deps ${SERVICES_TO_DEPLOY}
fi

# Step 3: Healthcheck verification
echo "------------------------------------------------------"
echo "[INFO] Verifying API Gateway readiness..."
MAX_RETRIES=30
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

