# ADR 0001: Single Master Customer Record Philosophy

## Status
Accepted

## Context
Legacy systems treated each search scan as an isolated lead list, creating duplicated company entries and fragmented records across campaigns.

## Decision
We establish a **Single Master Customer Record Philosophy**. 

All business entities discovered during scans are evaluated through the 5-pass deduplication algorithm before creation. If a business entity exists in `master_businesses`, new attributes (phone, email, GSTIN, website, rating, reviews, customer categories) are merged into the existing master record without creating duplicate entries.

## Consequences
- Preserves single source of truth for every IT hardware company in India.
- Search queries permanently expand and enrich the core product asset (the database).
