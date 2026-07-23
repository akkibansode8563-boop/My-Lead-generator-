# Architecture Specification Document

## Project: National IT Hardware Customer Intelligence Platform

---

## 1. Feature-First Domain Architecture

The codebase is organized around isolated core functional domains:

```
                          ┌───────────────────────────────┐
                          │   Frontend SPA (Vercel CDN)   │
                          │   (HTML5, Vanilla CSS, JS)    │
                          └───────────────┬───────────────┘
                                          │
                                          ▼
                          ┌───────────────────────────────┐
                          │  Backend Node.js API Service  │
                          │   (Express, PM2, Guards)      │
                          └───────────────┬───────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            ▼                             ▼                             ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│ Search Intelligence   │   │  Data Collection &    │   │  Customer & Entity    │
│ (Geo Spatial Engine)  │   │  Playwright Scraper   │   │  Resolution Engine    │
└───────────────────────┘   └───────────────────────┘   └───────────────────────┘
            │                             │                             │
            └─────────────────────────────┼─────────────────────────────┘
                                          │
                                          ▼
                          ┌───────────────────────────────┐
                          │ PostgreSQL / Supabase Store   │
                          │ (Master Businesses & Locations│
                          └───────────────────────────────┘
```

### Core Domains Map
1. **Customer Intelligence**: `master_businesses`, `masterEntityService.js` (Single Master Record management).
2. **Search Intelligence**: `spatial search matrix`, `STATE_CITIES`, `STATE_HUBS`, `onStateChange()`.
3. **Data Collection**: `scraperService.js`, Playwright Chromium launcher with isolated tab execution.
4. **AI Intelligence**: `aiEnrichmentService.js`, Hermes/Ollama integration for quality tiering.
5. **CRM & Export**: `leads_v2.js`, `export.js` (Multi-page Excel generation with SheetJS).
6. **Integrations**: Supabase API, Playwright, Vercel Edge.

---

## 2. Data Flow Sequence

1. **User Action**: User selects Target State, IT Market Hub, Radius (km), Customer Types, and Product Categories in UI.
2. **Request Dispatch**: Frontend sends spatial payload to `POST /api/campaigns`.
3. **Worker Spawning**: Backend detaches background `runCampaignJob()` execution.
4. **Geo Scraping**: Playwright Chromium executes geo-bounded Google Maps spatial queries.
5. **Entity Resolution**: `masterEntityService.js` evaluates Place ID, Phone, GSTIN, Domain, and Jaro-Winkler similarity.
6. **Master Upsert**: Existing master record is enriched or new master record is inserted.
7. **Live Progress Polling**: Frontend polls `GET /api/campaigns/:id/progress` every 1.5s to render progress metrics.
