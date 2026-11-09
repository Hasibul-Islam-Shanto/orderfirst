#!/usr/bin/env bash
# ==============================================================================
# OrderFirst Multi-Platform Docker Image Builder (macOS & Linux / Ubuntu)
# ==============================================================================
# Builds Docker images supporting both macOS (ARM64 / Intel) and Linux (Ubuntu x86_64 / ARM64).
#
# Usage:
#   ./build-images.sh [OPTIONS] [SERVICES...]
#
# Options:
#   --platform <platforms>  Target platforms (default: linux/amd64,linux/arm64)
#                           Use 'linux/amd64' for Ubuntu server deploy
#                           Use 'local' or 'linux/arm64' for native macOS
#   --registry <prefix>     Registry prefix (default: orderfirst)
#   --tag <tag>             Image tag (default: short git commit SHA or latest)
#   --push                  Push multi-arch images to registry
#   --load                  Load built image into local Docker daemon (single-arch only)
#
# Examples:
#   # 1. Build multi-arch images (both macOS and Linux Ubuntu) and push to registry:
#   ./deploy/scripts/build-images.sh --platform linux/amd64,linux/arm64 --push
#
#   # 2. Build for Ubuntu Linux deployment only and load locally for inspection:
#   ./deploy/scripts/build-images.sh --platform linux/amd64 --load
#
#   # 3. Build only auth and gateway natively on macOS:
#   ./deploy/scripts/build-images.sh --platform local auth gateway
# ==============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
ALL_SERVICES=("auth" "catalog" "booking" "orders" "notify" "gateway" "client")

PLATFORM="linux/amd64"
REGISTRY="${DOCKER_REGISTRY:-orderfirst}"
PUSH_FLAG=false
LOAD_FLAG=false
SERVICES=()

# Determine default tag from git commit if available
if git -C "${PROJECT_ROOT}" rev-parse --short HEAD >/dev/null 2>&1; then
  DEFAULT_TAG=$(git -C "${PROJECT_ROOT}" rev-parse --short HEAD)
else
  DEFAULT_TAG="latest"
fi
TAG="${DEFAULT_TAG}"

# Parse command line flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform)
      PLATFORM="$2"
      shift 2
      ;;
    --registry)
      REGISTRY="$2"
      shift 2
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    --push)
      PUSH_FLAG=true
      shift
      ;;
    --load)
      LOAD_FLAG=true
      shift
      ;;
    -h|--help)
      grep '^# ' "$0" | cut -c 3-
      exit 0
      ;;
    *)
      SERVICES+=("$1")
      shift
      ;;
  esac
done

# If no services passed, build all
if [ ${#SERVICES[@]} -eq 0 ]; then
  SERVICES=("${ALL_SERVICES[@]}")
fi

# Resolve 'local' platform keyword
if [ "${PLATFORM}" = "local" ]; then
  ARCH=$(uname -m)
  case "${ARCH}" in
    x86_64)  PLATFORM="linux/amd64" ;;
    arm64|aarch64) PLATFORM="linux/arm64" ;;
    *)       PLATFORM="linux/amd64" ;;
  esac
fi

# Multi-arch images cannot be loaded directly into standard Docker daemon; they must be pushed or built with a registry
if [[ "${PLATFORM}" == *","* ]] && [ "${LOAD_FLAG}" = "true" ]; then
  echo "[ERROR] Docker does not support --load with multiple platforms simultaneously."
  echo "        Specify a single platform (e.g., --platform linux/amd64 or --platform local) or use --push."
  exit 1
fi

echo "======================================================"
echo "OrderFirst Multi-Platform Docker Build"
echo "Target Platform(s): ${PLATFORM}"
echo "Registry Prefix:    ${REGISTRY}"
echo "Image Tag:          ${TAG}"
echo "Services to build:  ${SERVICES[*]}"
echo "Push to Registry:   ${PUSH_FLAG}"
echo "Load to Local:      ${LOAD_FLAG}"
echo "======================================================"

export DOCKER_BUILDKIT=1

# Verify Docker daemon is reachable by the current user
if ! docker info >/dev/null 2>&1; then
  echo "======================================================"
  echo "❌ [ERROR] Cannot connect to Docker daemon as user '$(whoami)'!"
  echo "Possible fixes on Ubuntu/EC2:"
  echo "  1. Add jenkins user to docker group:"
  echo "     sudo usermod -aG docker $(whoami)"
  echo "     sudo systemctl restart jenkins"
  echo "  2. Ensure docker service is running:"
  echo "     sudo systemctl status docker"
  echo "======================================================"
  exit 1
fi

# Check if docker buildx is installed
HAS_BUILDX=false
if docker buildx version >/dev/null 2>&1; then
  HAS_BUILDX=true
  echo "[INFO] Docker Buildx detected. Multi-platform build enabled for [${PLATFORM}]."
  
  # Ensure buildx builder exists and supports multi-arch
  BUILDER_NAME="orderfirst-multiarch"
  if ! docker buildx ls 2>/dev/null | grep -q "${BUILDER_NAME}"; then
    echo "[INFO] Creating Docker buildx builder: ${BUILDER_NAME}..."
    docker buildx create --name "${BUILDER_NAME}" --driver docker-container --bootstrap --use >/dev/null 2>&1 || true
  else
    docker buildx use "${BUILDER_NAME}" >/dev/null 2>&1 || true
  fi
else
  echo "[WARN] 'docker buildx' plugin is not installed on this system."
  echo "[INFO] Falling back to standard 'docker build' for native architecture ($(uname -m))."
fi

# Build action arguments for buildx
ACTION_ARGS=()
if [ "${PUSH_FLAG}" = "true" ]; then
  ACTION_ARGS+=("--push")
elif [ "${LOAD_FLAG}" = "true" ]; then
  ACTION_ARGS+=("--load")
fi

# Build each service
for SVC in "${SERVICES[@]}"; do
  echo "------------------------------------------------------"
  echo "[BUILDING] Service: ${SVC}..."
  
  if [ "${SVC}" = "client" ]; then
    CONTEXT_DIR="${PROJECT_ROOT}/client"
    DOCKERFILE="${PROJECT_ROOT}/client/Dockerfile"
    BUILD_ARGS=("--build-arg" "VITE_API_URL=${VITE_API_URL:-http://localhost:4000/api}")
  else
    CONTEXT_DIR="${PROJECT_ROOT}/services/${SVC}"
    DOCKERFILE="${PROJECT_ROOT}/services/${SVC}/Dockerfile"
    BUILD_ARGS=()
  fi

  if [ ! -f "${DOCKERFILE}" ]; then
    echo "[ERROR] Dockerfile not found at ${DOCKERFILE}"
    exit 1
  fi

  if [ "${HAS_BUILDX}" = "true" ]; then
    # shellcheck disable=SC2068
    docker buildx build \
      --platform "${PLATFORM}" \
      -t "${REGISTRY}/${SVC}:${TAG}" \
      -t "${REGISTRY}/${SVC}:latest" \
      -f "${DOCKERFILE}" \
      ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} \
      ${ACTION_ARGS[@]+"${ACTION_ARGS[@]}"} \
      "${CONTEXT_DIR}"
  else
    # Standard docker build fallback (native host architecture)
    # shellcheck disable=SC2068
    docker build \
      -t "${REGISTRY}/${SVC}:${TAG}" \
      -t "${REGISTRY}/${SVC}:latest" \
      -f "${DOCKERFILE}" \
      ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} \
      "${CONTEXT_DIR}"

    if [ "${PUSH_FLAG}" = "true" ]; then
      docker push "${REGISTRY}/${SVC}:${TAG}"
      docker push "${REGISTRY}/${SVC}:latest"
    fi
  fi

  echo "✅ [SUCCESS] Built ${SVC} (${REGISTRY}/${SVC}:${TAG})"
done

echo "======================================================"
echo "🎉 All selected images built successfully for ${PLATFORM}!"
echo "======================================================"

