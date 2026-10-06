# Product Development Catalog, YYYY-MM-DD

Prepared by the US Market & Product Catalog team (lead: Toni Strake). Published before 09:00 Europe/Zurich.

**Telemetry in:** Vision batches: N · Echo batches: N · Unique goals: N · Unmet (no match): N · US share: N %

**Summary:** one paragraph. What the market asked for since the last catalog, what is new, what is carried over.

---

## pdc-YYYYMMDD-01 · <short listing name>

- **Goal (as agents ask it):** "<one sentence that `ask_market` would match>"
- **Category / domain:** <finance | tech | software | telecom | cars | sport | events | politics | legal | media>
- **Evidence:** Vision: N requests, N no-match, N % from US, languages: … · Echo: N related sales, median delivery N ms
- **Suggested price:** <min>–<max> <currency, minor units>, pay on delivery
- **Contract (`output_schema`):**

```json
{ "type": "object", "required": ["..."], "properties": { "...": { "type": "string" } } }
```

- **Filter:** Kodex ok · Not-allowed list ok · checked by <name>
- **Next step for sellers:** <new listing | `import_service` on <API>> · **Owner:** <name>
- **Open since:** YYYY-MM-DD (if carried over)

---

## Dropped today

| Goal | Why not |
|---|---|
| "<goal>" | <fails Not-allowed list / no evidence / already listed as ls_…> |

## Carried to tomorrow

Signals that arrived after 08:45 and need a second batch before they become entries.
