# Catrack DevOps & Deployment Handbook
**Catrack ERP Platform Infrastructure Specification (CPP-010)**
**Document Version:** 1.0.0  
**Classification:** Engineering Standard  
**Status:** Approved Reference Standard  

---

## 1. Vision & Infrastructure Philosophy

The Catrack ERP Platform uses a **Containerized, Bare-Metal Hosting** approach on Hetzner VPS instances. This architecture provides predictable costs, high CPU/RAM performance, and simple deployment operations.

### Core DevOps Objectives
*   **Immutable Deployments:** Package application builds into versioned Docker container images. The exact same image is promoted from testing through to production.
*   **Infrastructure as Code:** Manage Nginx configurations, Docker compose settings, and firewall ports as code inside the repository.
*   **Continuous Deployment:** Automate testing, image building, and deployment using automated pipelines.
*   **Zero-Downtime Releases:** Implement updates with zero user downtime using proxy redirects.

---

## 2. Git Workflow & Branching Strategy

The repository follows a structured branch management model:

```
    [ main ]       ======================== (Production Release)
                       ^              |
                       | Merge        | Branch
                       |              v
    [ staging ]    ======================== (Testing / Verification)
                       ^              |
                       | Merge        | Branch
                       |              v
    [ feature/* ]  ======================== (Local Developer Workspaces)
```

*   **Branch Protections:** Direct commits to `main` and `staging` are blocked.
*   **Pull Requests (PRs):** All feature updates must be developed on `feature/feature-name` branches and merged via PRs.
*   **Review Policy:** PRs require green CI test checks and approval from at least one senior engineer before merging into `staging` or `main`.

---

## 3. CI/CD Build & Release Pipeline

The CI/CD build pipeline executes the following checks on every pull request:

1.  **Code Linting:** Checks code style conventions.
2.  **Type Checking:** Runs TypeScript compilation checks (`tsc --noEmit`).
3.  **Automated Testing:** Runs unit and integration test suites.
4.  **Prisma Generation:** Generates the typed Prisma client.
5.  **Docker Build Verification:** Builds the container image and runs security checks to identify package vulnerabilities.

---

## 4. Docker Container Strategy

*   **Multi-Stage Builds:** The Dockerfile must use multi-stage builds to keep production images small (under 150MB):
    *   *Stage 1 (Builder):* Installs development dependencies, compiles TypeScript code, runs the Next.js build, and generates the Prisma client.
    *   *Stage 2 (Runner):* Uses a slim Alpine base image, installs runtime dependencies (like OpenSSL), copies build artifacts from Stage 1, and starts the Next.js server.
*   **User Privileges:** The container must not run as the root user. Use a dedicated `nextjs` user account inside the container.
*   **Environment Variables:** Runtime parameters must be injected using a `.env` file at container startup, separating code from configuration.

---

## 5. Hetzner Deployment Architecture

The production environment runs on a Hetzner CPX22 Ubuntu VPS instance:

```
                      HETZNER VPS NETWORK LAYOUT
                      
  Internet Requests (Port 80/443)
               |
               v
  +-----------------------------------------------------------------------+
  |  Hetzner CPX22 Ubuntu VPS                                             |
  |                                                                       |
  |  +---------------------+      Proxy Pass      +--------------------+  |
  |  | Nginx Reverse Proxy |--------------------> | Docker Container   |  |
  |  | (Handles SSL/HTTPS) | (port 80/443->3000)  | (Next.js Node App) |  |
  |  +---------------------+                      +--------------------+  |
  |            |                                            |             |
  |            v                                            v             |
  |      Certbot SSL                                  Prisma Client       |
  |                                                         |             |
  +---------------------------------------------------------+-------------+
                                                            |
                                                            v
                                                   Neon PostgreSQL (SaaS)
```

*   **Nginx Reverse Proxy:** Nginx runs on the host server, intercepting ports 80/443, handling SSL certificates via Certbot, and proxying requests to the Next.js container on port 3000.
*   **SSL Certificates:** Certbot automatically obtains and renews Let's Encrypt certificates. Systemd timers verify and renew certificates every 60 days.
*   **Firewall Rules:** The host firewall (UFW) blocks all incoming ports except:
    *   Port `22` (SSH - restricted to authorized keys).
    *   Port `80` (HTTP - automatically redirected to HTTPS).
    *   Port `443` (HTTPS - public web access).

---

## 6. Logging & Observability

*   **Log Forwarding:** Docker logs write directly to standard output and are managed by the host systemd journald log.
*   **Log Format:** Production logs use structured JSON formatting to simplify analysis.
*   **Telemetry Monitoring:** Node Exporter and Prometheus collect server metrics (CPU, RAM, Disk, network IO).
*   **Visualization:** Grafana dashboards present active server health metrics.

---

## 7. Backup & Recovery Operations

*   **Database Backups:** Daily database dumps are executed automatically.
*   **Offsite Storage:** Backup files are encrypted and shipped to remote, S3-compatible storage buckets.
*   **Retention Limits:** Daily backups are retained for 30 days, monthly backups for 1 year, and annual backups permanently for compliance.

---

## 8. Rollback Procedures

*   **Container Rollback:** If a deployment fails, the deployment script updates the Docker image tag to the previous stable release and restarts the container:
    ```bash
    docker compose up -d --replace-failed
    ```
*   **Database Rollbacks:** Database migrations are forward-only. If a schema change fails, rollback scripts must restore the schema structure from the backup copy without losing transaction records.

---

## 9. Deployment Release Checklist

The deployment pipeline must check every release against this list:

```
[ ] CI Green:       Have all unit, integration, and linter tests passed?
[ ] Database Check: Are database schema changes backward-compatible?
[ ] Environment:    Are all environment variables updated in the production .env?
[ ] Backup:         Has a backup snapshot been taken before running migrations?
[ ] SSL Status:     Is the SSL certificate valid for the target domains?
[ ] Health Check:   Does the application return status 200 on /api/health?
```
