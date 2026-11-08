# Jenkins Monorepo CI/CD Pipeline Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement a centralized, change-aware Jenkins CI/CD pipeline in `deploy/jenkins/` with parallel test/build gates, Docker registry integration, and zero-downtime rolling deployment via Docker Compose.

**Architecture:** A single declarative Jenkinsfile orchestrates change detection through a lightweight shell script, runs parallel test/build matrices only for affected services, pushes tagged Docker images, and safely rolls out updates using `docker compose up -d --no-deps <changed-services>`.

**Tech Stack:** Jenkins Pipeline (Groovy), Bash shell scripts, Docker, Docker Compose, Node.js 22, Git.

---

### Task 1: Create Change Detection Script

**Files:**
- Create: `deploy/jenkins/scripts/detect-changes.sh`

**Step 1: Write the change detection script**
Create `deploy/jenkins/scripts/detect-changes.sh` to analyze git diffs between commits and export environment variables:
`BUILD_AUTH`, `BUILD_CATALOG`, `BUILD_BOOKING`, `BUILD_ORDERS`, `BUILD_NOTIFY`, `BUILD_GATEWAY`, `BUILD_CLIENT`, and `ANY_CHANGED`.

**Step 2: Make executable and verify with git diff**
Run: `chmod +x deploy/jenkins/scripts/detect-changes.sh && ./deploy/jenkins/scripts/detect-changes.sh HEAD~1 HEAD`
Expected: Output shows detected services and environment variables format (`KEY=VALUE`).

**Step 3: Commit**
```bash
git add deploy/jenkins/scripts/detect-changes.sh
git commit -m "feat(jenkins): add git diff change detection script"
```

---

### Task 2: Create Zero-Downtime Deployment Script

**Files:**
- Create: `deploy/jenkins/scripts/deploy.sh`

**Step 1: Write the deployment script**
Create `deploy/jenkins/scripts/deploy.sh` to take environment name (`dev` or `prod`), pull updated images, and execute:
`docker compose -f deploy/compose/docker-compose.<env>.yml --env-file .env.<env> up -d --no-deps <services>` followed by gateway health check.

**Step 2: Make executable and verify script syntax**
Run: `bash -n deploy/jenkins/scripts/deploy.sh`
Expected: Syntax check passes with exit code 0.

**Step 3: Commit**
```bash
git add deploy/jenkins/scripts/deploy.sh
git commit -m "feat(jenkins): add zero-downtime deployment script"
```

---

### Task 3: Create Centralized Jenkinsfile

**Files:**
- Create: `deploy/jenkins/Jenkinsfile`

**Step 1: Write the declarative Jenkins pipeline**
Implement `deploy/jenkins/Jenkinsfile` with:
- Parameters: `ENVIRONMENT` (`dev` or `prod`), `FORCE_BUILD_ALL` (`false` by default).
- Stage 1: Checkout & Change Detection (`detect-changes.sh`).
- Stage 2: Parallel Quality Gate (lint, typecheck, and test for changed services).
- Stage 3: Parallel Docker Build (build images tagged with short git commit and `:latest`).
- Stage 4: Docker Registry Push (authenticated via Jenkins credentials).
- Stage 5: Deploy Gate & Rolling Service Update (`deploy.sh`).
- Stage 6: Readiness Healthcheck.
- Post Actions: Clean workspace, notifications on failure.

**Step 2: Validate Jenkinsfile syntax**
Verify file formatting and absence of syntax errors.

**Step 3: Commit**
```bash
git add deploy/jenkins/Jenkinsfile
git commit -m "feat(jenkins): add unified monorepo declarative Jenkinsfile"
```

---

### Task 4: Documentation & Verification

**Files:**
- Modify: `README.md`

**Step 1: Update README.md with Jenkins CI/CD Setup Guide**
Document Jenkins job creation, required credentials (`docker-registry-credentials`), agent prerequisites, and pipeline behavior.

**Step 2: Verify git status and all files**
Run: `git status`
Expected: Clean working tree.

**Step 3: Commit**
```bash
git add README.md
git commit -m "docs: add Jenkins CI/CD setup instructions to README"
```
