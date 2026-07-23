# Product Requirements Document (PRD)

## Project Name: National IT Hardware Customer Intelligence Platform

---

## 1. Vision & Core Philosophy

This platform is **NOT** a lead generation tool. It is India's largest **AI-Powered National IT Hardware Business Database**.

The database itself is the primary asset. Every search query executed across India permanently enriches the master customer database. Every future scan merges new attributes (phone, email, GSTIN, website, rating, reviews, customer types) into existing records without creating duplicates.

---

## 2. Core Functional Requirements

### 2.1 Master Customer Record Management
- Maintain a Single Master Customer Record for every IT hardware business entity in India (`master_businesses`).
- Execute multi-pass deduplication before record insertion:
  1. Google Place ID Match
  2. Cleaned Indian E.164 Phone Match
  3. Verified GSTIN Match
  4. FQDN Website Domain Match
  5. Jaro-Winkler / Trigram Address & Name Similarity (>0.88)

### 2.2 Spatial Geography & Radius Search Engine
- Execute spatial searches structured strictly by geographic hierarchy:
  $$\text{India} \rightarrow \text{State} \rightarrow \text{District} \rightarrow \text{City} \rightarrow \text{Market Area} \rightarrow \text{GPS} \rightarrow \text{Radius (km)}$$
- Auto-suggest premier IT Market Hubs based on selected Target State.
- Region-based text array queries are permanently deprecated.

### 2.3 Real-Time Scan Dashboard
- Display live metrics updated every 1.5s: Progress %, Discovered Count, Pages/Queries Processed, Duplicates Merged, Failed Records, Current Query, and Countdown ETA.

### 2.4 Consolidated CRM & Multi-Page Excel Export
- Support multi-page sequential fetches, cross-page deduplication, frozen header rows, auto-fitted columns, and executive summary worksheets.

---

## 3. Non-Functional Requirements

- **Availability**: 99.99% uptime with global exception guards and Playwright tab isolation.
- **Performance**: Support scraping up to 500 leads per scan with background worker detachment.
- **Maintainability**: Feature-first architecture with strict backwards compatibility for existing `/api` endpoints.
