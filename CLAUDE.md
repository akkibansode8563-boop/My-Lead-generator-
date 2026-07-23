# CLAUDE.md — Developer Guidelines & Standards
## National IT Hardware Customer Intelligence Platform

### Project Overview
India's largest AI-powered IT Hardware Business Database platform. Every search permanently discovers, normalizes, validates, deduplicates, classifies, enriches, merges, and updates the **Single Master Customer Record**.

---

### Non-Negotiable Architecture Rules
1. **Master Customer Record Philosophy**: Businesses exist ONCE in `master_businesses`. Scans enrich existing records rather than creating isolated duplicate leads.
2. **Geography + Radius Search Model**: Scans MUST use `India → State → District → City → Market Area → GPS → Radius (km)`. Region-based loose string queries are strictly forbidden.
3. **Multi-Pass Entity Resolution**:
   - Pass 1: Google Place ID (Exact)
   - Pass 2: Cleaned E.164 / 10-digit Indian Mobile & Landline Phone
   - Pass 3: Verified GSTIN
   - Pass 4: Normalized FQDN Website Domain
   - Pass 5: Jaro-Winkler / Trigram String & Address Similarity (>0.88)
4. **Zero-Failure Server Resilience**: Global crash guards (`uncaughtException`, `unhandledRejection`) in `server/index.js` must remain intact. Scraper detail tabs must use isolated `try-catch-finally` blocks.
5. **Backward Compatibility**: Preserve existing `/api/leads` and `/api/campaigns` compatibility layers while writing data to `master_businesses`.

---

### Key Commands

```bash
# Server Development
cd server && npm start

# Health Diagnostics & Browser Check
cd server && npm run health

# PM2 Production Process Supervisor
cd server && npm run prod

# Git Operations
git status
git add .
git commit -m "feat/fix: description"
git push origin main
```

---

### Feature-First Directory Layout
- `server/` — Express backend, Playwright scrapers, Master entity service, background workers.
- `js/` — Frontend modular JS controllers (`apify.js`, `leads_v2.js`, `export.js`, `ui_v2.js`).
- `docs/` — PRD, Architecture, Business Rules, Database, API, Roadmap, Deployment Guide.
- `knowledge/` — Technical specs and Architectural Decision Records (`knowledge/decisions/`).
