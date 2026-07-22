# National Master Customer Data Model Specification

## Overview
The National IT Hardware Customer Intelligence Platform replaces campaign-isolated lead listings with a unified relational data schema centered around `master_businesses`.

## Database Schema Specification

### 1. `master_businesses` (Unified Master Entity)
The single source of truth for every IT hardware business in India.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Permanent unique business ID |
| `company_name` | VARCHAR | NOT NULL | Verified business name |
| `brand_name` | VARCHAR | NULLABLE | Trade or brand name |
| `gstin` | VARCHAR | UNIQUE NULLABLE | Indian GST Identification Number |
| `primary_phone` | VARCHAR | NULLABLE, INDEX | Standardized 10-digit / E.164 phone |
| `is_whatsapp` | BOOLEAN | DEFAULT FALSE | WhatsApp verification status |
| `primary_email` | VARCHAR | NULLABLE | Primary business email |
| `primary_website` | VARCHAR | NULLABLE | Normalized website URL |
| `google_place_id` | VARCHAR | UNIQUE NULLABLE, INDEX | Google Maps Place ID |
| `rating` | NUMERIC(3,1) | NULLABLE | Aggregate rating score |
| `reviews_count` | INTEGER | DEFAULT 0 | Total reviews count |
| `national_ai_score` | INTEGER | DEFAULT 50 | Enterprise B2B suitability score (1-100) |
| `quality_tier` | VARCHAR | DEFAULT 'Medium' | Tier: 'Enterprise', 'High', 'Medium', 'Low' |
| `aggregated_metadata`| JSONB | DEFAULT '{}' | Enriched AI attributes, categories, capabilities |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Discovery date |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last enrichment timestamp |

### 2. `business_locations` (Spatial Geography & Bounding Data)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Location ID |
| `business_id` | UUID | REFERENCES master_businesses(id) ON DELETE CASCADE | Parent Business Entity |
| `state` | VARCHAR | NOT NULL, INDEX | Indian State (e.g. Maharashtra) |
| `district` | VARCHAR | NULLABLE | District / County |
| `city` | VARCHAR | NOT NULL, INDEX | City / Town |
| `market_area` | VARCHAR | NULLABLE, INDEX | Specific IT Market Hub (e.g., Lamington Road) |
| `full_address` | TEXT | NULLABLE | Raw/Cleaned street address |
| `latitude` | NUMERIC(10,7)| NULLABLE | WGS84 Latitude |
| `longitude` | NUMERIC(10,7)| NULLABLE | WGS84 Longitude |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Timestamp |

### 3. `business_classifications` (Verticals & Capabilities)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Classification ID |
| `business_id` | UUID | REFERENCES master_businesses(id) ON DELETE CASCADE | Parent Business Entity |
| `customer_type` | VARCHAR | NOT NULL, INDEX | e.g. 'Distributor', 'Retailer', 'System Integrator' |
| `product_category`| VARCHAR | NOT NULL, INDEX | e.g. 'Laptops', 'Networking', 'Printers' |
| `verified_by_ai` | BOOLEAN | DEFAULT TRUE | AI verification flag |

### 4. `scans` (Scan Audit & Intelligence Log)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Scan Execution ID |
| `user_id` | UUID | REFERENCES users(id) ON DELETE CASCADE | Initiating User |
| `state` | VARCHAR | NOT NULL | Search State |
| `city` | VARCHAR | NOT NULL | Search City |
| `market_area` | VARCHAR | NULLABLE | Targeted Market Area |
| `radius_km` | NUMERIC(5,2)| DEFAULT 5.0 | Radius in kilometers |
| `status` | VARCHAR | DEFAULT 'running' | 'running', 'completed', 'failed' |
| `total_discovered` | INTEGER | DEFAULT 0 | Raw places discovered |
| `master_records_updated` | INTEGER | DEFAULT 0 | Existing Master Records enriched |
| `master_records_created` | INTEGER | DEFAULT 0 | New Master Records created |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Timestamp |
