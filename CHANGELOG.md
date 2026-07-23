# CHANGELOG

All notable changes to the **National IT Hardware Customer Intelligence Platform** will be documented in this file.

---

## [2.1.0] - 2026-07-23

### Added
- **Automatic Territory IT Market Hub Auto-Recommendation Engine**: Dynamically populates premier IT hardware commercial hubs in Field #2 based on the selected Target State (`Nehru Place`, `Lamington Road`, `SP Road`, `Ritchie Street`, `CTC Secunderabad`, `Chandni Chowk E-Mall`, `CG Road`).
- **Global UI Navigation Fix**: Fixed script load order and bound `showPage`, `exportLeadsCSV`, and `exportLeadsExcel` to global `window` scope.
- **CLAUDE.md & Enterprise Master Documentation**: Created complete documentation set (`PRD.md`, `ARCHITECTURE.md`, `BUSINESS_RULES.md`, `DATABASE.md`, `API.md`, `ROADMAP.md`, `CHANGELOG.md`).

---

## [2.0.0] - 2026-07-22

### Added
- **Master Customer Record Schema (`schema_v2.sql`)**: Single Source of Truth tables (`master_businesses`, `business_locations`, `business_classifications`, `scans`).
- **Multi-Pass Entity Resolution Engine (`masterEntityService.js`)**: 5-pass deduplication algorithm (Place ID, Cleaned Phone, GSTIN, Domain, Fuzzy Similarity).
- **Spatial Geography & Radius Search**: Hierarchy-based spatial search model (`State → District → City → Market Area → GPS → Radius km`).
- **Zero-Failure Server Resilience**: Global exception catchers in `server/index.js` and Playwright Chromium flags (`--no-sandbox`, `--disable-dev-shm-usage`).
- **Vercel Static Hosting Configuration (`vercel.json`)**: Hybrid architecture configuration.

---

## [1.0.0] - 2026-05-30

### Added
- Real-time scrape progress tracking dashboard.
- Consolidated multi-page Excel export engine (SheetJS).
- Region table column support in CRM view.
