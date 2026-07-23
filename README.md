# National IT Hardware Customer Intelligence Platform

> **Enterprise-Grade AI-Powered National Customer Database for IT Hardware Businesses in India**

---

## Executive Vision
This platform is **NOT** a temporary lead generation tool. It is India's largest **National IT Hardware Customer Intelligence Database**. 

Every search query executed across the country permanently discovers, cleans, deduplicates, classifies, enriches, and merges IT hardware business entities (Distributors, System Integrators, Dealers, Retailers, Corporate Customers, MSPs) into a **Single Master Customer Record**.

---

## Core Architecture Highlights

- **Master Customer Record Store (`master_businesses`)**: Unified single-source-of-truth database entity for every IT hardware company in India.
- **5-Pass Entity Resolution Engine (`masterEntityService.js`)**:
  1. Google Place ID Match
  2. Cleaned Indian Mobile / Landline Phone Match (E.164)
  3. Verified GSTIN Match
  4. Normalized Domain Hostname Match
  5. Jaro-Winkler / Trigram Fuzzy Name & Address Similarity (>0.88)
- **Spatial Geography & Radius Search Model**:
  $$\text{India} \rightarrow \text{State} \rightarrow \text{District} \rightarrow \text{City} \rightarrow \text{Market Area} \rightarrow \text{GPS} \rightarrow \text{Radius (km)}$$
- **Zero-Failure Server Resilience**: Protected by global exception catchers, Playwright Chromium tab-isolation, auto-relaunch wrappers, and PM2 process supervision.
- **Hybrid Vercel Architecture**: Static frontend deployed on Vercel Edge CDN with persistent background worker running on Render/Railway.

---

## Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Supabase Project (PostgreSQL)

### 2. Running Locally
```bash
# Clone the repository
git clone https://github.com/akkibansode8563-boop/My-Lead-generator-.git
cd My-Lead-generator-

# Start backend server
cd server
npm install
npm start
```

Open `index.html` in your web browser or navigate to `http://localhost:3000`.

### 3. Running System Health Diagnostics
```bash
cd server
npm run health
```

---

## Documentation Index

- 📄 [CLAUDE.md](CLAUDE.md) — Developer & AI Assistant Guidelines
- 📄 [docs/PRD.md](docs/PRD.md) — Product Requirements Document
- 📄 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System & Feature-First Architecture
- 📄 [docs/BUSINESS_RULES.md](docs/BUSINESS_RULES.md) — Non-Negotiable Business Rules
- 📄 [docs/DATABASE.md](docs/DATABASE.md) — Database Schema & Master Entity Model
- 📄 [docs/API.md](docs/API.md) — Enterprise API Specification
- 📄 [docs/ROADMAP.md](docs/ROADMAP.md) — Product Evolution Roadmap
- 📄 [CHANGELOG.md](CHANGELOG.md) — Release History & Version Logs

---

## License
Enterprise License — Proprietary National Customer Intelligence Platform.
