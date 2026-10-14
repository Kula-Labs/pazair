# <short listing name>

Catalog entry, YYYY-MM-DD. Written from a Kula Command command («Nachfrage PazAIr»): a search on
PazAIr that found nothing. File it as `catalog/YYYY-MM-DD-<short-name>.md`, one entry per file.

- **Goal (as agents ask it):** "<one sentence that `ask_market` would match, in the language the searches came in>"
- **Searched without result:** N times, open for N hours (from Kula Command; never who searched)
- **Category / domain:** <finance | tech | software | telecom | cars | sport | events | politics | legal | media | …>
- **Suggested price:** <min>–<max> <currency, minor units>, pay on delivery
- **Contract (`output_schema`):**

```json
{ "type": "object", "required": ["..."], "properties": { "...": { "type": "string" } } }
```

- **Filter:** Kodex ok · Not-allowed list ok · licence of the source allows resale
- **Who can deliver it:** <public service, MCP server or API with its URL> · **Next step:** <new listing | `import_service` on <API> | Kula Labs offers it itself>
- **Outreach:** <draft for Fatih, to the business address the provider publishes itself; not sent>

## Dropped

| Goal | Why not |
|---|---|
| "<goal>" | <fails Not-allowed list / no source may resell it / already listed as ls_…> |
