# Enterprise API Specification

## Project: National IT Hardware Customer Intelligence Platform

Base URL: `http://localhost:3000/api` (Production: `https://your-backend.onrender.com/api`).

---

## Endpoints Summary

### 1. `POST /api/campaigns`
Initiates a Geography + Radius intelligence scan across specified customer types and product categories.

#### Request Body
```json
{
  "name": "Scan: Delhi NCR — Delhi (Nehru Place)",
  "state": "Delhi NCR",
  "city": "Delhi",
  "market_area": "Nehru Place",
  "radius_km": 50.0,
  "customer_types": ["IT Dealers", "System Integrators"],
  "product_categories": ["Laptops", "Enterprise Servers"],
  "target_regions": ["Nehru Place", "Delhi"],
  "target_categories": ["Laptops", "Enterprise Servers"]
}
```

#### Response (201 Created)
```json
{
  "message": "Intelligence scan created and started in background",
  "campaign": {
    "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "Scan: Delhi NCR — Delhi (Nehru Place)",
    "status": "pending"
  }
}
```

---

### 2. `GET /api/campaigns/:id/progress`
Polls real-time metrics of an active intelligence scan.

#### Response (200 OK)
```json
{
  "status": "Scraping",
  "progress": 45,
  "leadsCollected": 142,
  "pagesProcessed": 4,
  "totalPages": 15,
  "eta": "1m 15s",
  "currentQuery": "IT Dealers Laptops near Nehru Place, Delhi",
  "successCount": 142,
  "duplicateCount": 28,
  "failedCount": 2,
  "exportStatus": "Pending"
}
```

---

### 3. `GET /api/leads`
Queries the Master Customer Intelligence Database with rich filtering and pagination.

#### Query Parameters
- `city` (optional): Filter by city.
- `state` (optional): Filter by state.
- `search` (optional): Fuzzy search company name, phone, GSTIN, website, address.
- `category` (optional): Filter by vertical category.
- `page` (default: 1): Page number.
- `limit` (default: 50): Items per page.

#### Response (200 OK)
```json
{
  "data": [
    {
      "id": "e5b8d27a-874a-4d2b-9801-149b142831f2",
      "company_name": "TechZone IT Solutions Pvt Ltd",
      "phone": "9876543210",
      "website": "https://techzone.in",
      "city": "Delhi",
      "state": "Delhi NCR",
      "ai_score": 92,
      "quality_tier": "Enterprise"
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
