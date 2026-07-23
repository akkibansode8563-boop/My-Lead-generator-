# ADR 0002: Spatial Geography Hierarchy & Radius Searching

## Status
Accepted

## Context
Loose text region searches (e.g. `["Nagpur"]`) produced inaccurate results when users selected non-local states (e.g. `Delhi NCR`), causing query mismatches and zero leads.

## Decision
We permanently deprecate region-based string searching in favor of a **Structured Spatial Geography Hierarchy**:
$$\text{India} \rightarrow \text{State} \rightarrow \text{District} \rightarrow \text{City} \rightarrow \text{Market Area} \rightarrow \text{GPS} \rightarrow \text{Radius (km)}$$

Selecting any State dynamically updates both the major city selector (`STATE_CITIES`) and auto-suggests premier commercial IT hardware market hubs (`STATE_HUBS`) in the territory dropdown list.

## Consequences
- Accurate spatial bounding for any state/city in India.
- Eliminates hardcoded fallback conflicts.
