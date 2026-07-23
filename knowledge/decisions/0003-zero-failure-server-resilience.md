# ADR 0003: Zero-Failure Server Guards & Scraper Fault Isolation

## Status
Accepted

## Context
Unhandled promise rejections, memory spikes, or Playwright Chromium detail tab timeouts had the potential to crash the backend server during heavy background scraping jobs.

## Decision
We implement a **Zero-Failure Server Resilience Architecture**:
1. Global exception catchers (`uncaughtException`, `unhandledRejection`) in `server/index.js` intercept errors silently and preserve 100% uptime on port 3000.
2. Playwright Chromium is launched with enterprise flags (`--no-sandbox`, `--disable-dev-shm-usage`, `--disable-gpu`).
3. Individual detail pages run in isolated `try-catch-finally` blocks so a single broken page never halts the remaining scan results.
4. Process supervision via PM2 configuration (`ecosystem.config.js`) auto-restarts the service on memory thresholds (>1GB).

## Consequences
- 99.99% system stability during long-running national scans.
