# Master Database Architecture & Data Specification

## Project: National IT Hardware Customer Intelligence Platform

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    master_businesses ||--o{ business_locations : HAS
    master_businesses ||--o{ business_classifications : CATEGORIZED_AS
    scans ||--o{ master_businesses : DISCOVERS

    master_businesses {
        uuid id PK
        string company_name
        string brand_name
        string gstin UK
        string primary_phone
        boolean is_whatsapp
        string primary_email
        string primary_website
        string google_place_id UK
        numeric rating
        integer reviews_count
        integer national_ai_score
        string quality_tier
        jsonb aggregated_metadata
        timestamptz created_at
        timestamptz updated_at
    }

    business_locations {
        uuid id PK
        uuid business_id FK
        string state
        string district
        string city
        string market_area
        text full_address
        numeric latitude
        numeric longitude
    }

    business_classifications {
        uuid id PK
        uuid business_id FK
        string customer_type
        string product_category
        boolean verified_by_ai
    }

    scans {
        uuid id PK
        uuid user_id FK
        string state
        string city
        string market_area
        numeric radius_km
        jsonb customer_types
        jsonb product_categories
        string status
        integer total_discovered
        integer master_records_updated
        integer master_records_created
    }
```

---

## 2. Table Specifications

### `master_businesses`
Single source of truth table for every IT hardware business entity in India.

- Primary Indexes: `idx_mb_primary_phone`, `idx_mb_company_name`, `idx_mb_google_place_id`, `idx_mb_gstin`.
- Triggers: Auto-update `updated_at` timestamp.

### `business_locations`
Spatial geography and bounding box location records linked 1-to-many with master businesses.

### `business_classifications`
Vertical classification tags (IT Distributors, System Integrators, Retailers, Product Categories).

### `scans`
Audit logs of national geographic scans and discovery execution stats.

---

## 3. Migration Files
- `schema.sql` — Legacy V1 baseline schema.
- `schema_v2.sql` — Master Customer Record V2 relational migration script.
