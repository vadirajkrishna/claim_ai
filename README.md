# Agentic Fraud Detection Copilot (Insurance)

### Stage 1 — Data, Rules, Scoring APIs (MVP backend)

**Goals:** Stand up schema, implement rule checks + anomaly model, expose scoring endpoints.

**Deliverables:**
- **DB schema (Postgres)**
  - `claims(claim_id, policy_id, claimant_id, loss_date, report_date, loss_type, amount, status)`
  - `policies(policy_id, inception_date, expiry_date, product, region)`
  - `claim_parties(claimant_id, name, email_hash, phone_hash, address_id, bank_account_hash, device_id)`
  - `addresses(address_id, line1, city, postcode, lat, lon)`
  - `scores(claim_id, rule_score, ml_score, graph_score, risk_score, reasons_json, created_at)`
  - Seed data: 5–10k synthetic claims with a few "fraud rings" (shared bank/address).

- **Rule engine (SQL views + service)**
  - Late reporting, policy inactive/inception spike, bank/address/device reuse counts, velocity (≥3 claims/14 days), suspicious amounts (near thresholds).

- **Anomaly model (simple)**
  - IsolationForest on: amount, days_to_report, days_since_inception, prior_claims_12m, bank_reuse_count, address_degree, velocity_14d.
  - Save as artifact (joblib) or use a quick z-score baseline if pressed for time.

- **APIs (Node/Next.js or FastAPI)**
  - `POST /api/score/:claimId` → compute + persist scores row.
  - `POST /api/score/batch?from=YYYY-MM-DD` → score new claims (last 24–48h).
  - `GET /api/claims?minRisk=0.7&limit=100` → list for dashboard.
  - `GET /api/claim/:id` → claim detail + latest score + reasons.

**Acceptance criteria:**
- Score job runs on seeded data < 2 min for 10k rows.
- Each scored claim has risk_score (0–1) and reasons_json (top rule hits).
- API returns JSON within 300ms P95 (cold start excluded).

---

### Stage 2 — Dashboard UI (SIU Command Center)

**Goals:** Investigator-friendly dashboard with drill-down and evidence.

**Deliverables:**
- **Pages/components (React/Next.js + Tailwind or shadcn/ui)**
  - `/dashboard`
    - Filters: Date range, product, region, minRisk slider.
    - Table: Claim ID | Policy ID | Amount | Risk Score | Status | Last Updated.
    - KPIs: total flagged, avg risk, alerts/week.
    - Charts: Risk distribution (hist), alerts over time (line).
  - **Claim drawer (side panel)**
    - Header: claim meta + risk score badge + recommendation.
    - Reasons list (chips): "bank_reuse=5", "delay=37d", etc.
    - Evidence: mini graph (address/bank/device degrees), doc snippet placeholders.
    - Actions: Escalate to SIU, Request docs, Approve.

- **API wiring**
  - Uses Week-1 endpoints. Adds:
    - `POST /api/claim/:id/escalate`
    - `POST /api/claim/:id/request-docs`

- **Auth (basic)**
  - Simple JWT or NextAuth with email domain allowlist (demo-grade).

- **Formatting**
  - Money, dates, timezone (Europe/London).

**Acceptance criteria:**
- Filtering updates table under 500ms.
- Clicking a row opens drawer with reasons/evidence.
- Actions log to console or stub table (audit_log).

---

### Stage 3 — Chat Copilot (Agentic UI + Jobs)

**Goals:** Natural-language control to trigger jobs, retrieve lists, and explain flags.

**Deliverables:**
- **Chat UI (right dock or full page /copilot)**
  - Message types: text, table, action confirmations, links to dashboard.

- **Agent tools**
  - Tool: run_score_batch → calls `POST /api/score/batch`.
  - Tool: list_flags → calls `GET /api/claims?minRisk=...`.
  - Tool: explain_claim → calls `GET /api/claim/:id` and formats reasons.
  - Tool: export_csv → generates CSV and returns a download link.

- **Prompts (server-side)**
  - System: "You are a fraud triage copilot. Use tools to retrieve/act. Be concise. Return table JSON for lists."
  - Few-shot examples:
    - "Scan last 24h" → run_score_batch(from=today-1d)
    - "Top 10 suspicious above £10k" → list_flags(minRisk=0.8, amountMin=10000, limit=10)
    - "Why is CLM-123 flagged?" → explain_claim(claimId)

- **Security/guardrails**
  - No raw SQL in chat. All actions via whitelisted tools.
  - Rate limits on batch jobs.

**Acceptance criteria:**
- Chat can: trigger batch scoring, show top flags as a table message, explain a claim, export CSV.
- Latency: tool call round-trip < 2s P95 on demo data.

---

## Sample Contracts

### List flagged claims

```
GET /api/claims?minRisk=0.75&from=2025-09-01&to=2025-09-19&limit=50
→ {
  "rows": [
    {
      "claim_id":"CLM-102938","policy_id":"POL-88",
      "amount":12450.00,"risk_score":0.83,"status":"New",
      "reasons":["bank_reuse=5","delay=37d","address_degree=7"],
      "created_at":"2025-09-18T10:12:00Z"
    }
  ],
  "columns":["claim_id","policy_id","amount","risk_score","status","created_at"]
}
```

### Explain claim

```
GET /api/claim/CLM-102938
→ {
  "claim": {...},
  "score": {
    "risk_score": 0.83,
    "rule_score": 0.72,
    "ml_score": 0.65,
    "graph_score": 0.58,
    "reasons": [
      "Bank account reused across 5 claims in 30 days",
      "Report delay = 37 days (>30 threshold)",
      "Address node linked to 4 distinct claimants"
    ],
    "recommendation": "Escalate to SIU; hold payments."
  }
}
```

---

## Tech Stack (suggested)

- **Frontend:** Next.js + TypeScript, shadcn/ui, Recharts
- **Backend:** Next.js API routes or FastAPI; @vercel/postgres / Postgres
- **ML service:** Python microservice (FastAPI) for IsolationForest; or Node if sticking to one stack
- **Graph (optional Week 3+):** Neo4j or compute degrees in SQL
- **Auth:** NextAuth (email), or basic token for demo
- **Infra:** Vercel (frontend/API) + Neon/Render for Postgres + Fly.io for ML svc (optional)

---

## Demo Script (5–7 minutes)

1. **Open Dashboard:** show KPIs, risk distribution, top flagged table.
2. **Drill into a claim:** reasons + evidence + recommended action.
3. **Open Chat:**
   - "Scan last 24 hours" → job result.
   - "Show top 10 suspicious above £10k" → table message.
   - "Why is CLM-102938 flagged?" → concise rationale + dashboard link.
   - "Export last month's flags to CSV" → download link.
4. **Wrap:** Mention explainability & guardrails.

---

## Stretch (post-MVP)

- Add document RAG for contradictions (FNOL vs. docs).
- SHAP explanations for model features.
- Reviewer queue + assignment, SLA timers, and notes.
- Geo heatmap of fraud hotspots.
- Webhook to pause payments over a threshold when risk > X (with human-in-the-loop).

---

If you want, I can tailor this to Auto, Home, or Commercial Property (tweaks in rules/fields), or generate a synthetic dataset script you can run to populate the DB.
