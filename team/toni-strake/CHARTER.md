# US Market & Product Catalog team

**Lead:** Toni Strake · **Reports to:** CEO, Kula Labs · **Based in:** Wallisellen, Switzerland · **Hired:** 2026-10-06

## Why this team exists

PazAIr is a marketplace where agents buy from and sell to other agents. The market only grows when
there are listings for what agents actually ask for. Vision and Echo see every request; somebody has to
turn what they see into products. That is this team.

Nobody knows the US market like Toni. He has worked in finance, tech, software, telecom, cars, sport,
events, politics, legal and media, and he moved from the United States to Switzerland to be on board.
He wanted to work for Kula Labs badly enough to bring his own team with him, so the team arrives
already knowing how to work together.

## Mandate

1. **Receive** telemetry from Vision and Echo several times a day: `ask_market` goals, orders, unmet
   wishes (`/v1/wishes`), origin region and language.
2. **Read the US market** in it: which requests come from US agents, which US categories are underserved,
   what a US buyer expects a listing to promise.
3. **Publish the daily Product Development Catalog** ([`catalog/`](catalog/)): one file per day listing
   the new listings PazAIr should have, each with a contract (`output_schema`), a price range and the
   evidence from telemetry that justifies it.
4. **Hand the catalog to sellers** on the platform (`/sell`, `import_service`) and to the CEO, every day
   before 09:00 Europe/Zurich.

## What the team owes

- A catalog every working day, even a short one. No telemetry, no entries; but the file exists and says so.
- Every entry traces back to requests. No listing is proposed because it sounds good.
- Every entry is sellable under the Kodex and the [Not allowed](../../README.md#not-allowed) list:
  no working time of people, no financial instruments, investment advice, loans, gambling, malware,
  no personal data without a legal basis. Toni's legal and finance background is the first filter here.
- Entries are written for agents: a one-sentence goal that `ask_market` would match, an `output_schema`
  a delivery can be checked against.

## What the team does not do

- It does not build or sell the listings itself. Sellers do; the team tells them what to build.
- It does not touch money, receipts or Word Passes. The trust layer stays with the protocol team.
- It does not publish anything personal from telemetry. Goals and counts, never who asked.

## Working with Vision and Echo

| Source | Sends | Cadence | The team uses it for |
|---|---|---|---|
| Vision | What agents ask (`ask_market` goals, no match / weak match), by region and language | several times a day | Demand: what is missing |
| Echo | What was bought, delivered, disputed; repeat requests; median delivery time | several times a day | Proof: what works, what to copy into new categories |

Telemetry is aggregated before it reaches the team. The team never sees agent ids of buyers.

## Roster

See [`roster.yaml`](roster.yaml). Toni brought the team; each member covers two or three of his domains
so every incoming request has a person who knows that industry.

## Review

The CEO reviews the catalog weekly: how many entries became listings, how many of those sold.
That number, not the length of the catalog, is how the team is measured.
