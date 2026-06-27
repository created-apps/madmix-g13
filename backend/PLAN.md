# MadMix Insights Backend Build Plan

This document outlines the full architecture, database design, data-cleaning workflow, metrics-signals engine, and API boundaries for the **MadMix Insights** backend.

---

## 1. Architectural Overview

We adopt a **hybrid serverless architecture** that strikes a balance between rapid implementation and robust data-processing capabilities:

```
                  +-----------------------------------+
                  |      Vite + React Frontend        |
                  |     (Hosted on Cloud Run)         |
                  +--------+-----------------+--------+
                           |                 |
     Simple CRUD / Auth    |                 |  Analytical Aggregations,
     (governed by RLS)     |                 |  Live Decisions Engine
                           v                 v
                 +---------+---+     +-------+---------+
                 |  Supabase   |     |  FastAPI Server |
                 |  (Postgres) |     |  (on Render)    |
                 +-------------+     +-------+---------+
                                             |
                                             | Reads raw data / caches
                                             | via Service Role (Bypasses RLS)
                                             v
                                     +-------+---------+
                                     |    Supabase     |
                                     |  (Postgres DB)  |
                                     +-----------------+
```

### Trust Boundary and Security Division:
*   **Authentication (Supabase Auth):** The client logs in directly via Supabase Auth. It receives a JSON Web Token (JWT) signed with the project's secret key.
*   **Direct-to-Database CRUD:** Reading reference tables, fetching or saving bookmarks (`saved_items`), editing the user's city watches (`watched_cities`), and posting shared screenshots or notes (`shared_analyses`) flows **directly from the client to Supabase**. Access is strictly locked down via **Row-Level Security (RLS)** using `auth.uid()`.
*   **FastAPI Service Boundary:** Heavy business analysis, multi-table analytical joins (e.g., fusing sales metrics with survey pincodes), and the live Decisions Engine are delegated to **FastAPI on Render**.
*   **Token Authentication on FastAPI:**
    *   The client forwards the `Authorization: Bearer <Supabase_JWT>` header to FastAPI on every request.
    *   FastAPI validates this JWT using asymmetric RS256/ES256 verification against the project's public JWKS endpoint (`/auth/v1/.well-known/jwks.json`) — no shared secret required.
    *   Once authenticated, FastAPI interacts with the Postgres database using the **Supabase Service Role Key**, bypassing RLS rules on the backend to perform powerful, server-side aggregations and write pre-computed decisions.

---

## 2. Database Schema

The Postgres database structure includes primary indexes for relational joints, indexes to accelerate geo-hierarchies, and JSONB formats for flexible decision outputs.

The exact SQL is sketched in `/backend/schema.sql`.

### Tables Overview:
1.  **`profiles`**: Tied 1:1 to Supabase `auth.users` via a trigger. Houses user metadata and preferences.
2.  **`survey_responses`**: Real-time customer Google Form replies. Populated with pincodes, platforms, and taste scores.
3.  **`pods_availability`**: Distribution coverage metrics (0–100) per city, platform, and month.
4.  **`sku_sales`**: Financial sales MRP grouped per SKU, city, and platform.
5.  **`sales_spends`**: Advertising metrics (spends, revenue, computed A2S ratio) per platform and day.
6.  **`geo_reference`**: canonical mapping table mapping `pincode -> city -> state` to link customer pincodes with municipal sales/POD databases.
7.  **`decisions`**: Cached recommended business actions. Uses `scope_hash` for instantaneous lookups.
8.  **`shared_analyses`**: Team collaborations, storing screenshots or notes along with target filter presets.

---

## 3. Row-Level Security (RLS) Policies

All tables accessed directly by the client are locked down. RLS is **enabled** by default.

### `profiles`
*   **Select:** `auth.uid() = id` (User can read only their own profile)
*   **Update:** `auth.uid() = id` (User can modify their own details/watches)

### `shared_analyses`
*   **Select:** `auth.role() = 'authenticated'` (All authenticated team members can read shared boards)
*   **Insert:** `auth.role() = 'authenticated' AND auth.uid()::text = (new_row.created_by)` (Authenticated users can create shares under their own name)
*   **Delete/Update:** `auth.uid()::text = created_by` (Only the owner can delete or edit their post)

### `survey_responses`, `sku_sales`, `pods_availability`, `sales_spends`
*   **Select:** `auth.role() = 'authenticated'` (Internal team can read all raw metrics)
*   **Insert/Update/Delete:** Denied to public/authenticated users. Only writable via the **FastAPI Service Role** (or `clean_load.py` script).

---

## 4. One-Time Data Cleaning & Normalization (`clean_load.py`)

Since the raw data consists of messy spreadsheets with inconsistent casing, nested multiple-headers, and raw pincodes, we design a single, idempotent python script `backend/scripts/clean_load.py` to handle the heavy cleaning before seeding Supabase:

### Extraction and Cleaning Steps:
1.  **City Name Consolidation:**
    *   Map string variants to clean canonical names (e.g., `Ahmedabad-Gandhinagar`, `ADALAJ`, `Ahmedabad City` -> `Ahmedabad`).
    *   Perform strip, lowercase, and Title-casing.
2.  **Availability Unpivoting:**
    *   Raw sheets contain `Platform | City | April 2026 | May 2026` columns.
    *   The script flattens this wide table into normalized rows: `[city, platform, month, value]`.
3.  **Geo Reference Building:**
    *   Read the customer survey. Extract unique `pincode -> city -> state` combinations.
    *   Query a zip-code API or consolidate using majority-rule votes to build a clean `geo_reference` master lookup.
    *   Inject this reference map into Postgres so any survey pincode can instantly link to municipal sales.
4.  **Survey Validation:**
    *   Enforce constraints: replace blank tastes with `'It was okay'`, trim trailing spaces in lines, and drop lines lacking a valid pincode or brand flavor.
5.  **Idempotent Upsert:**
    *   Use Postgres `ON CONFLICT (id) DO UPDATE...` keys so running the script twice updates values instead of creating duplicates.

---

## 5. The Business Decisions Engine (Rules + LLM Hybrid)

The decisions engine operates as a pipeline: **deterministic signals** identify business opportunities/leaks and fetch evidence, and the **LLM phrases** the results in readable, natural English.

```
+------------------------------------------------------------------------+
|                            INPUT FILTERS                               |
|          [State: Gujarat | City: Ahmedabad | Platform: Instamart]      |
+------------------------------------v-----------------------------------+
                                     |
+------------------------------------v-----------------------------------+
|                     STEP 1: DETERMINISTIC RULES                        |
|                                                                        |
|  * Rule 1: Sales Drops?    -> Ahmedabad Instamart Sales -58% (Apr->May) |
|  * Rule 2: Taste Backlash? -> 82% of survey complaints list "Spicy"    |
|  * Rule 3: Spend Leak?     -> A2S in Week 3 is 0.77 (Threshold: 0.40)   |
|                                                                        |
|  * ACTION TRIGGERED: "REDUCE BBQ BLAST" | Severity: High | Conf: 94%   |
+------------------------------------v-----------------------------------+
                                     |
+------------------------------------v-----------------------------------+
|               STEP 2: EVIDENCE SELECTION & ROW GATHERING               |
|                                                                        |
|  * Selects specific availability drop lines & survey metrics rows     |
+------------------------------------v-----------------------------------+
|                                    |
+------------------------------------v-----------------------------------+
|                     STEP 3: PROMPT CONTRACT TO CLAUDE                  |
|                                                                        |
|  Provide JSON variables: {sales_drop: 58, top_complaint: "Too spicy",  |
|  complaint_ratio: 0.82}.                                               |
|  Instruct Claude to write only action title & 2-sentence explanation.  |
|  (Never invent numbers. Return strict JSON format.)                    |
+------------------------------------v-----------------------------------+
                                     |
+------------------------------------v-----------------------------------+
|                       STEP 4: OUTPUT CACHING                           |
|                                                                        |
|  Generate scope_hash(Gujarat_Ahmedabad_Instamart_None) -> Cache DB     |
+------------------------------------------------------------------------+
```

### Proposed Rules & Metrics Thresholds:
1.  **Reduce/Remove Rule (Over-supply vs Low Demand):**
    *   *Trigger:* Sales MRP < ₹10,000 AND Availability > 70% in May.
    *   *Signal:* Survey negative score (`taste` = 'Didn’t like it' OR `repurchase` = 'No') is > 40%.
    *   *Type:* `remove` (severity: `high`, confidence: `90`).
2.  **Grow Rule (Stock-out Risk):**
    *   *Trigger:* Sales MRP is top 20% in city AND Availability < 90%.
    *   *Signal:* Taste is > 80% `'Loved it'` or `'Liked it'`.
    *   *Type:* `grow` (severity: `medium` or `high` depending on volume, confidence: `95`).
3.  **Ad-Spend Leak Rule (A2S Inefficiency):**
    *   *Trigger:* Daily A2S ratio exceeds `0.45` for 3 consecutive days.
    *   *Type:* `spend` (severity: `medium`, confidence: `85`).

### LLM Prompt & Strict JSON Schema:
We leverage **Claude 3.5 Sonnet** (or Gemini 2.5 Flash as an fallback option).

**Prompt Structure:**
```
You are an expert commercial analyst for MadMix, a healthy millet snack brand.
You will be given raw statistical parameters calculated by our data engine.
Your sole job is to translate these raw figures into a highly actionable, plain-English executive heading and a 2-sentence justification.

CRITICAL: 
1. Do NOT invent, assume, or extrapolate any figures or trends.
2. Use ONLY the exact numbers supplied in the input context.
3. Write in a proactive, business-driven tone.

INPUT CONTEXT:
- City: {city}
- Platform: {platform}
- Flavour: {flavour}
- Sales Drop: {sales_drop_pct}%
- Top Complaint: {top_complaint} ({complaint_pct}% of surveys)
- Repurchase Intent: {repurchase_no_pct}% answered 'No'

EXPECTED JSON SCHEMA:
{
  "action": "Heading (e.g. Cut BBQ Blast Bhujia stock on Instamart in Ahmedabad)",
  "reasoning": "A 2-sentence justification describing the sales drop and the underlying survey complaints."
}
```

### Compute & Cache Strategy:
*   **On-Demand Compute:** When `/decisions` is queried with a specific filter set, FastAPI computes the hashes. If `scope_hash` exists in the `decisions` table and is less than 24 hours old, return it instantly. Otherwise, run the rules, invoke Claude, write to the cache, and return.
*   **Cache Invalidation:** The cache is flushed automatically whenever a fresh `clean_load` is triggered (since static databases change only during reload phases).

---

## 6. API Surface (FastAPI Endpoint Contracts)

All endpoints expect `Authorization: Bearer <JWT>` and are documented with OpenAPI.

### 1. `GET /api/v1/hot-cities`
Returns a list of high-priority locations requiring attention.
*   **Response:**
    ```json
    [
      {
        "city": "Ahmedabad",
        "state": "Gujarat",
        "sparkline": [78, 65, 52, 41, 32],
        "why_hot": "BBQ Blast Sales dropped 58% (82% Spice complaints)",
        "severity": "high"
      }
    ]
    ```

### 2. `GET /api/v1/analysis`
Aggregates and formats charts data.
*   **Query Parameters:** `state`, `city`, `pincode`, `platform`, `flavour`.
*   **Response:**
    ```json
    {
      "total_sales": 185000,
      "total_surveys": 28,
      "avg_repurchase_intent": 18.2,
      "worst_a2s_platform": { "platform": "Instamart", "ratio": 77.4 },
      "sales_by_platform": [ { "name": "Instamart", "value": 185000 } ],
      "availability_delta": [ { "platform": "Instamart", "apr": 78, "may": 32, "delta": -46 } ],
      "sales_by_flavour": [ { "name": "BBQ Blast Millet Bhujia", "value": 18000 } ],
      "taste_sentiment": [ { "name": "Too spicy", "count": 23, "color": "#EF4444" } ]
    }
    ```

### 3. `GET /api/v1/decisions`
Retrieves matched recommendations.
*   **Query Parameters:** `state`, `city`, `platform`, `flavour`.
*   **Response:** Array of `Decision` structures.

### 4. `POST /api/v1/decisions/generate`
Manually triggers the analysis-regeneration process (enabling the idle -> generating -> result UI flow).
*   **Request Body:** Filter scope parameters.
*   **Response:** `{"status": "queued", "task_id": "gen_8892"}` or resolves synchronously to the updated decision cards list.

---

## 7. Project Structure & Dependencies

```
backend/
├── PLAN.md                   # This file
├── README.md                 # Development & Deploy Commands
├── schema.sql                # Production DB DDL
├── requirements.txt          # Python Packages
├── scripts/
│   └── clean_load.py         # One-shot data normalizer
└── app/
    ├── __init__.py
    ├── main.py               # FastAPI entry point
    ├── core/
    │   ├── config.py         # Env var settings
    │   └── security.py       # JWT local verification
    ├── db/
    │   └── session.py        # Supabase client bindings
    ├── schemas/
    │   └── analysis.py       # Pydantic schema serializers
    └── services/
        ├── metrics.py        # Relational aggregator
        └── engine.py         # Rules + Claude decision maker
```

### Key Python Dependencies (`requirements.txt`):
*   `fastapi>=0.110.0`
*   `uvicorn>=0.28.0`
*   `pydantic[email]>=2.6.0`
*   `supabase>=2.4.0`
*   `pandas>=2.2.0`
*   `openpyxl>=3.1.0` (for spreadsheet structures)
*   `anthropic>=0.18.0`
*   `PyJWT[cryptography]>=2.8.0` (for asymmetric RS256/ES256 JWT verification via JWKS)

---

## 8. Phased Build Roadmap

### Phase 0: Schema Provisioning & Data Loads (Done in 2 Days)
*   **Deliverable:** Run `schema.sql` inside Supabase SQL editor. Write and verify `clean_load.py` on the raw spreadsheets.
*   **Definition of Done:** All raw Excel rows are split, normalized, and correctly inserted into local/cloud tables. `geo_reference` is fully mapped.

### Phase 1: Authentication & Core Metrics (Done in 3 Days)
*   **Deliverable:** Stand up FastAPI with the JWT authentication middleware. Write `GET /analysis` aggregation queries in Postgres.
*   **Definition of Done:** Frontend can query `/analysis` passing its user JWT and receives accurate sales and survey counts with proper mock latency.

### Phase 2: Rules Engine & Proof of Concept (Done in 2 Days)
*   **Deliverable:** Implement the deterministic signals engine. Write unit test rules that can flag Ahmedabad Instamart as a 'reduce' type without invoking the LLM.
*   **Definition of Done:** Python backend accurately flags the 5 mock signals with correct severities.

### Phase 3: Claude Phrasing Integration & Cache (Done in 2 Days)
*   **Deliverable:** Bind Claude SDK into the service pipeline. Test JSON response schema parsing and handle API timeout failures gracefully. Wire the `scope_hash` cache.
*   **Definition of Done:** Decisions are written with natural business rationale, stored inside Postgres, and served under 10ms on cached hits.

### Phase 4: Production Hardening (Done in 2 Days)
*   **Deliverable:** Implement rate-limiting on the `/generate` endpoint to protect LLM budgets. Set up CORS locks for the Next.js production host. Deploy onto Render.
*   **Definition of Done:** Staging environment is live and securely processing requests.

---

## 9. Open Questions & Assumptions

1.  **Rule Threshold Calibrations:** Are our proposed boundaries (e.g. A2S > 45% = leak, Sales < 10k = pull) suitable for MadMix's actual operations? *Assumption: Yes, these parameters align with the seed numbers and can be tuned in configuration variables later.*
2.  **Shared Analysis Snapshots:** When a user shares an analysis, should the system save a live reference to a changing decision, or capture a static snapshot of the database at that moment? *Assumption: We will capture a frozen database snapshot to ensure notes remain coherent even if metrics shift next month.*
3.  **Survey Schema Shifts:** Will the real Google Form MCQ fields change? *Assumption: Yes, the survey parser in `clean_load.py` will map variable question titles to our simplified database columns (`taste`, `repurchase`, `improvement`) to shield the dashboard from form layout revisions.*
