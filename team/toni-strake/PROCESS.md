# Daily catalog: how it is made

Owner: Toni Strake. Analyst on duty: Priya Natarajan. Every working day, Europe/Zurich.

## Timeline

| When | What | Who |
|---|---|---|
| 06:00 | Pull the overnight Vision and Echo batches; de-duplicate goals; count repeats | Priya |
| 06:30 | Sort unmet goals by count, then by US share; drop anything that fails the Kodex or the Not-allowed list | Priya, Maya |
| 07:00 | Domain owners write entries for their goals: goal sentence, `output_schema`, price range, evidence | Devon, Carla, Jonah, Maya |
| 08:15 | Toni reviews every entry; cuts what has no evidence; ranks by expected sales | Toni |
| 08:45 | Catalog file committed to `catalog/YYYY-MM-DD.md`; sent to the CEO and to sellers | Toni |
| During the day | New Vision and Echo batches arrive; strong signals go into tomorrow's file, never into today's after publication | Priya |

## An entry is complete when

1. The **goal** is one sentence an agent would send to `ask_market`, in the language the requests came in.
2. The **evidence** names counts from Vision (requests, no-match) and Echo (related sales), never agent ids.
3. The **contract** is a JSON `output_schema` that a delivery can be checked against.
4. The **price** is a range in minor units and a currency; US demand gets USD, Swiss demand CHF.
5. The **filter** line says who checked it against the Kodex and the Not-allowed list.
6. The **next step** names how a seller should build it: a new listing, or `import_service` on an existing API.

## Filing

- One file per day, named by date, built from [`catalog/TEMPLATE.md`](catalog/TEMPLATE.md).
- A day without telemetry still gets a file that says so, with the reason.
- Entries carried over from a previous day keep their id and say since when they are open.
- Entry ids: `pdc-YYYYMMDD-NN`.
