# Enterprise Architecture Overview

## System Identity
**National IT Hardware Customer Intelligence Platform** — India's largest AI-powered database of IT Hardware Distributors, Dealers, System Integrators, Corporate Customers, and MSPs.

## Core Architectural Principles
1. **Database as the Core Product**: Every scan across India permanently expands, cleans, and enriches the national IT hardware customer intelligence database.
2. **Master Customer Record Philosophy**: A business entity exists exactly ONCE in the database. Scans do not create isolated leads; they continuously enrich and update the Master Customer Record.
3. **Geography + Radius Search Model**: Scans are bounded strictly by State → City → Market Area → Radius (km) and categorized by Customer Types & Product Categories. Region-based string queries are replaced with precise spatial geographic scans.
4. **Multi-Factor Entity Resolution (Deduplication)**:
   - Primary Key Match: Google Place ID / Apify Place ID
   - Secondary Match: Normalized Phone Number (E.164 / Indian 10-digit mobile/landline)
   - Tax Identification Match: Verified GSTIN
   - Web Domain Match: Normalized FQDN Domain
   - Spatial Proximity & String Similarity: Haversine distance < 50m AND (Name + Address Trigram similarity > 0.85)

## Subsystem Map

```
                    ┌───────────────────────────────┐
                    │      Web UI / Dashboard       │
                    │ (Geography + Radius Engine)  │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Scan Controller / API Layer  │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Geo-Query Generator &       │
                    │   Google Maps/Apify Scraper   │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ Multi-Pass Deduplication &   │
                    │ Entity Resolution Engine      │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ AI Classification & Scoring  │
                    │ (B2B Tiering, Hermes/Ollama)  │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ National Master Database Store│
                    │ (PostgreSQL + Supabase)       │
                    └───────────────────────────────┘
```
