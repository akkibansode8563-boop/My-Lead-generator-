# Geography & Radius Search Model Architecture

## Core Mandate
Region-based loose string searching is permanently deprecated. 

All discovery scans in the National IT Hardware Customer Intelligence Platform operate strictly on a **Structured Geographic Hierarchy + Spatial Radius Search**.

## Geographic Hierarchy Model

```
State (e.g., Maharashtra, Karnataka, Delhi NCR)
  └── District (e.g., Mumbai City, Pune, Bengaluru Urban)
       └── City / Hub (e.g., Mumbai, Nashik, Pune)
            └── Market Area (e.g., Lamington Road, Nehru Place, SP Road)
                 └── GPS Latitude & Longitude Coordinates
                      └── Radius Search Boundary (e.g., 1 km, 5 km, 10 km, 25 km)
```

## Customer Types & Product Categories Matrix

### Target Customer Types (Verticals)
- IT Distributors
- Regional Distributors
- Value-Added Dealers (VADs)
- Retailers & Computer Shops
- Laptop Dealers & Service Centers
- Printer & Consumable Dealers
- Networking & Security Dealers
- System Integrators & Solution Providers
- Managed Service Providers (MSPs)
- Corporate Customers & SMEs
- Educational Institutes & Universities
- Government Organizations & PSU Procurement
- Hospitals & Healthcare Facilities
- Banks & Financial Institutions
- Manufacturing Units

### Product Categories
- Enterprise Servers & Storage
- Desktop PCs & Workstations
- Laptops & Ultrabooks
- Computer Peripherals & Components
- Networking & Fiber Equipment (Cisco, Mikrotik, D-Link)
- Printers, Scanners & Plotters
- CCTV, Access Control & Surveillance
- Power Backup & Online UPS
- Software Licenses & Cloud Services
- Point-of-Sale (POS) & Barcode Systems

## Radius Spatial Search Algorithm
When a scan is initiated for a Market Area (e.g. `Lamington Road, Mumbai` with radius `5 km`):
1. Geocode the Market Area string to extract `(Latitude, Longitude)` center point using Google Maps / OpenStreetMap Geocoding API.
2. Build spatial queries bounded by the radius circle:
   - Calculate bounding box lat/lng deltas: `Δlat = radius / 111.045`, `Δlng = radius / (111.045 * cos(lat))`.
   - Query Google Places API / Scraper using formatted localized queries: `"[Customer Type] [Product Category] near [Market Area], [City]"`.
3. Discovered places are filtered by spatial distance using the **Haversine Formula**:

$$ d = 2r \arcsin \left( \sqrt{ \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1) \cos(\phi_2) \sin^2\left(\frac{\Delta \lambda}{2}\right) } \right) $$

Where $r = 6371 \text{ km}$. Places lying outside the selected radius are logged as contextual adjacent data but prioritized according to exact distance from the target hub.
