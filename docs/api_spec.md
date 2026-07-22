# Enterprise API Specification — Customer Intelligence Platform

## Overview
Base URL: `http://localhost:3000/api/v2` (Legacy `/api` retained for backwards compatibility).

---

## Endpoints Summary

### 1. `POST /api/v2/intelligence/scan`
Initiates a Geography + Radius intelligence scan across specified customer types and product categories.

#### Request Body
```json
{
  "state": "Maharashtra",
  "city": "Mumbai",
  "market_area": "Lamington Road",
  "radius_km": 5.0,
  "customer_types": [
    "IT Distributors",
    "System Integrators",
    "Computer Shops"
  ],
  "product_categories": [
    "Laptops",
    "Networking",
    "Peripherals"
  ]
}
```

#### Response (201 Created)
```json
{
  "status": "success",
  "scan_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "message": "Spatial intelligence scan initiated across 5km radius of Lamington Road, Mumbai."
}
```

---

### 2. `GET /api/v2/intelligence/scan/:id/progress`
Polls live real-time metrics of an active intelligence scan.

#### Response (200 OK)
```json
{
  "scan_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "Scraping",
  "progress_percentage": 45,
  "discovered_places": 142,
  "master_records_created": 38,
  "master_records_enriched": 94,
  "duplicates_merged": 10,
  "current_query": "System Integrators Laptops near Lamington Road, Mumbai",
  "eta": "1m 15s"
}
```

---

### 3. `GET /api/v2/intelligence/master-database`
Searches and queries the National Master Customer Intelligence Database with rich filtering.

#### Query Parameters
- `state` (optional): Filter by State.
- `city` (optional): Filter by City.
- `customer_type` (optional): Filter by target vertical (e.g. `Distributor`).
- `quality_tier` (optional): Filter by AI quality tier (`Enterprise`, `High`, `Medium`, `Low`).
- `search` (optional): Fuzzy search company name, phone, GSTIN, website, address.
- `page` (default: 1): Page number.
- `limit` (default: 50, max: 250): Items per page.

#### Response (200 OK)
```json
{
  "status": "success",
  "data": [
    {
      "id": "e5b8d27a-874a-4d2b-9801-149b142831f2",
      "company_name": "TechZone IT Solutions Pvt Ltd",
      "brand_name": "TechZone",
      "gstin": "27AAACT1234A1Z5",
      "primary_phone": "9876543210",
      "is_whatsapp": true,
      "primary_email": "contact@techzone.in",
      "primary_website": "https://techzone.in",
      "city": "Mumbai",
      "state": "Maharashtra",
      "market_area": "Lamington Road",
      "customer_types": ["IT Distributor", "System Integrator"],
      "product_categories": ["Enterprise Servers", "Networking"],
      "national_ai_score": 92,
      "quality_tier": "Enterprise",
      "google_rating": 4.6,
      "reviews_count": 184
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```
