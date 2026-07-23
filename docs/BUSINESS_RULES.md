# Non-Negotiable Business Rules

## Project: National IT Hardware Customer Intelligence Platform

---

## 1. Single Master Customer Record Rule
- A business entity MUST exist exactly ONCE in the `master_businesses` database table.
- Scans MUST NOT create duplicate company records.
- When a scan uncovers a business matching an existing record, the system MUST merge and enrich the profile (adding phone numbers, GSTIN, emails, ratings, reviews, customer types) without creating a new row.

---

## 2. Spatial Geography Hierarchy Rule
- Search queries MUST follow the strict geographic hierarchy:
  $$\text{India} \rightarrow \text{State} \rightarrow \text{District} \rightarrow \text{City} \rightarrow \text{Market Area} \rightarrow \text{GPS} \rightarrow \text{Radius (km)}$$
- Region-based text array queries (e.g. `["Nagpur"]`) are permanently deprecated and prohibited.

---

## 3. Multi-Factor Deduplication Rule
Deduplication MUST execute through the 5-pass entity resolution algorithm:
1. **Google Place ID** (Exact Match)
2. **Cleaned E.164 Phone Number** (Indian 10-digit mobile/landline)
3. **Verified GSTIN** (Exact Match)
4. **Website Domain Name** (Normalized FQDN Hostname)
5. **Fuzzy String & Address Similarity** (Jaro-Winkler distance > 0.88)

---

## 4. Zero-Failure Resilience Rule
- The Node.js server process MUST NEVER crash on unhandled async rejections or tab timeouts.
- Global exception catchers in `server/index.js` MUST remain active at all times.
- Playwright Chromium detail pages MUST be wrapped in isolated `try-catch-finally` blocks.

---

## 5. Backward Compatibility Rule
- Existing API endpoints (`/api/leads`, `/api/campaigns`) MUST remain operational.
- Database views or sync routines MUST maintain compatibility with the legacy `leads` table.
