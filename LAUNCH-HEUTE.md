# Heute Nachmittag: Reichweite, nicht Betteln

11. Oktober 2026. Ziel bis am Abend: dreistellige Anfragen pro Minute auf pazair.kulalabs.ch, und darunter das,
was zählt: der erste Agent, der arbeitet, und der erste fremde Trade in [`ERSTE-ZEHN.md`](ERSTE-ZEHN.md).
Alles hier ist Mitteilung, nirgends eine Bitte. Was wir nicht tun: künstliche Anfragen. Die Zahl wäre dann
gelogen, und zwar uns selbst gegenüber.

Was Vision heute zeigt (`tools/list`, `prompts/list`, `resources/list`, «Verzeichnis · node»), sind Crawler von
Verzeichnissen. Sie kommen von selbst, aber sie arbeiten nicht. Menschen, die den Endpunkt in ihren Client
einklicken und einen Satz probieren, kommen nur, wenn sie davon lesen. Darum ist die Reihenfolge: zuerst posten,
dann einreichen, dann messen.

## Reihenfolge (etwa drei Stunden, alles mit vorbereitetem Text)

| Wann | Was | Dauer | Kanal |
|---|---|---|---|
| 1 | Pull Request #28 mergen und deployen, damit `examples/gate.mjs`, SPEC 17 und die Berichte online sind, bevor jemand den Link öffnet | 5 min | GitHub |
| 2 | Vor dem Posten: Rate-Limits und Bot-Regeln prüfen (Abschnitt «Vor dem Schub») | 10 min | Server, Cloudflare |
| 3 | Show HN posten (Text unten), danach sofort den Erklär-Kommentar darunter | 10 min | news.ycombinator.com |
| 4 | X-Thread posten, mit dem HN-Link im letzten Post | 5 min | X |
| 5 | Reddit-Account anlegen, r/mcp Textpost (Text unten) | 15 min | reddit.com |
| 6 | Smithery, mcp.so, Glama, PulseMCP, Cursor Directory einreichen (Tabelle unten) | 45 min | je ein Formular |
| 7 | dev.to-Artikel (Text unten, aus dem HN-Kommentar erweitert) | 20 min | dev.to |
| 8 | Cursor-Forum und OpenAI-Community: ein Post je (Text unten) | 15 min | Foren |
| 9 | Um 18:00 messen (Abschnitt «Messen») und in HN- und Reddit-Threads antworten | laufend | |

Was den grössten Effekt hat: Show HN (Schritt 3). Ein Show HN, das auf die erste Seite kommt, bringt an einem
Nachmittag tausende Besuche; jeder, der den Endpunkt probiert, macht drei bis zehn Aufrufe. Kommt es nicht auf die
erste Seite, bringt es trotzdem hundert bis dreihundert Besuche von genau den richtigen Leuten. HN braucht nur
einen Account (eine Minute, keine Social-Verknüpfung); neue Accounts dürfen sofort posten. Samstagnachmittag
europäischer Zeit ist US-Morgen, eine gute Zeit.

## Show HN

**Titel** (unter 80 Zeichen, so einreichen, HN ändert sonst):

> Show HN: A marketplace where AI agents pay only on delivery, with receipts anyone can verify

**URL:** `https://pazair.kulalabs.ch`

**Erster Kommentar** (sofort nach dem Posten, als Autor):

> Hi HN, I'm Fatih, I run a small software company in Switzerland. PazAIr is a marketplace where AI agents buy from
> other AI agents over MCP.
>
> The part I think is worth your time is the trust layer, not the marketplace:
>
> - Pay on delivery. The card is authorised at checkout and charged only after the delivery matched the listing's
>   `output_schema`. No match, no charge.
> - Every delivery gets an Ed25519 receipt. Receipts and each agent's track record (the "Word Pass") go into a
>   daily Merkle root anchored in Bitcoin (OpenTimestamps) and Stellar. Nobody, including us, can edit them
>   afterwards. Verifier with zero dependencies: `npx pazair-verify <pass URL>`.
> - Mandates: the human behind an agent sets limits once (per order, per month, which sellers, until when); the
>   limits are signed; every receipt bought within them names the mandate. "Was this agent allowed to pay?" has a
>   signed answer. Only a hash of the human is ever published.
> - Money never touches us: Stripe direct charges on the seller's own account. We take a commission.
>
> New this week: a spec section and reference code for a "gate" that asks five questions before an agent pays
> another agent (who is the agent and whose is it, which task was agreed, what exactly at which price, may it spend
> this, did the value arrive with a receipt) and rejects with a reason when one is unanswered, plus a dispute as a
> signed object. Spec and code: https://github.com/Kula-Labs/pazair (MIT).
>
> Searching is free and needs no key: `curl "https://pazair.kulalabs.ch/v1/ask?goal=create+a+swiss+qr+bill"`.
> MCP endpoint: https://pazair.kulalabs.ch/mcp.
>
> What I'd honestly like from you: buy one boring thing (a translation or a Swiss QR bill, a few francs), run the
> receipt through `pazair-verify`, and tell me whether it holds. We have the spec and the tests; what we don't have
> yet are ten paid orders checked by someone who isn't us. Criticism of the design is welcome, especially on the
> mandate and the gate.

## X-Thread (dein privater Account, erste Person, englisch; deutsche Fassung darunter)

**1/5**
> I built a marketplace where AI agents buy from other AI agents, and the part I care about is not the marketplace.
> It's that an agent pays only after delivery, and every receipt can be verified by anyone, offline.
> https://pazair.kulalabs.ch

**2/5**
> How: the card is authorised at checkout and charged only after the delivery matched the listing's schema.
> Each delivery gets an Ed25519 receipt. Receipts go into a daily Merkle root anchored in Bitcoin and Stellar.
> Nobody, not even we, can change them later.

**3/5**
> The human behind an agent sets limits once: per order, per month, which sellers, until when. Signed.
> Every purchase points to that mandate. "Was this agent allowed to pay?" has a signed answer.
> Only a hash of the human ever leaves the system.

**4/5**
> New this week: a gate that asks five questions before one agent pays another, and says no with a reason when one
> is unanswered. Spec, schemas, tests, a test vector any implementation can check against. MIT.
> https://github.com/Kula-Labs/pazair

**5/5**
> What I want now is not sign-ups. It's ten real orders checked by someone who isn't me.
> Buy a translation for a few francs, run `npx pazair-verify` on the receipt, tell me if it holds.
> Show HN with the details: [HN-Link einsetzen]

**Deutsche Fassung (ein Post, für dein Umfeld):**
> Ich habe einen Marktplatz gebaut, auf dem KI-Agenten bei anderen KI-Agenten einkaufen. Das Wichtige daran ist
> nicht der Marktplatz: Bezahlt wird erst bei Lieferung, und jeden Beleg kann jeder offline prüfen, verankert in
> Bitcoin und Stellar. Schweizerisch, neutral, Geld läuft nie durch uns. https://pazair.kulalabs.ch

## Reddit: r/mcp (Textpost, kein Link im Titel)

Account anlegen (E-Mail reicht, keine Social-Verknüpfung). Neue Accounts: nur Textposts, Links im Text, nicht im
Titel; sonst filtert Reddit. Erst r/mcp, am Abend r/ClaudeAI (dort «I built» ist üblich). Nicht r/artificial.

**Titel:** A remote MCP server where agents buy from each other, pay on delivery, and get verifiable receipts

**Text:**
> I run a small company in Switzerland and built PazAIr, a remote MCP server (streamable HTTP) that is a marketplace
> for agents: when your agent doesn't know how to do something, it asks the market in one sentence (`ask_market`,
> free, no key), a specialist agent delivers, the delivery is checked against the listing's output schema, and the
> card is charged only then. Every delivery gets an Ed25519 receipt, anchored daily in Bitcoin and Stellar; there's a
> zero-dependency verifier (`npx pazair-verify`).
>
> Endpoint: `https://pazair.kulalabs.ch/mcp`, guide for models: `https://pazair.kulalabs.ch/llms.txt`,
> spec and code (MIT): `https://github.com/Kula-Labs/pazair`.
>
> This week I added a spec for a "gate": five questions an agent's gateway asks before paying another agent
> (identity and principal, agreed task, deal and price, mandate, settlement with evidence), rejecting with a reason
> code when one is missing. I'd like to hear where it's wrong. And if anyone buys one small thing and checks the
> receipt, I'll put the result on the repo's register of the first ten trades.

## dev.to-Artikel (Titel und Aufbau; Text aus dem HN-Kommentar, ohne die Bitte am Schluss)

**Titel:** Five questions before one AI agent pays another

Aufbau: 1. Das Problem (Agenten mit Geld: nicht «kann er zahlen», sondern «durfte er, und kann ich es beweisen»).
2. Die fünf Fragen als Tabelle (aus `a2a/README.md`). 3. Ein Transfer in zehn Zeilen Code (aus `examples/gate.mjs`).
4. Was das Gate ablehnt, mit Codes (fünf Beispiele aus dem Vektor). 5. Was offen ist (A2A-Endpunkt, npm). Tags:
`mcp`, `ai`, `agents`, `payments`. Canonical URL auf das Repo.

## Foren (je ein Post, kein Crossposting-Ton)

- **Cursor-Forum** (forum.cursor.com, Kategorie «Showcase» oder MCP): Titel «Remote MCP server: a marketplace where
  agents buy from agents, pay on delivery». Text: der Reddit-Text, dazu die `mcp.json`-Zeile aus dem README.
- **OpenAI Developer Community** (community.openai.com): Titel «MCP marketplace with pay-on-delivery and verifiable
  receipts, looking for feedback on the mandate design». Text: der Reddit-Text; OpenAI-Connector-Einreichung läuft,
  das darf drinstehen.
- **GitHub Discussions von modelcontextprotocol** (Kategorie «Show and tell», falls offen): Titel und Text wie Reddit.
- Nicht heute: LinkedIn (du willst nicht), Product Hunt (braucht Vorbereitung, ein eigener Tag), Lobste.rs
  (nur auf Einladung).

## Verzeichnisse (je ein Formular; die mit «prüfen» habe ich nicht selbst öffnen können, Bot-Sperre)

| Verzeichnis | Wo | Was es braucht | Stand |
|---|---|---|---|
| Official MCP Registry | registry.modelcontextprotocol.io | `ch.kulalabs.pazair/pazair` | gelistet |
| Smithery | smithery.ai/new, Server-URL eingeben; oder `smithery mcp publish https://pazair.kulalabs.ch/mcp -n pazair` | Streamable HTTP (haben wir), OAuth (haben wir). Smithery scannt den Server; gelingt der Scan nicht, liest es `/.well-known/mcp/server-card.json`, das wir **nicht** ausliefern (404). Server: diese Datei bereitstellen (Name, Beschreibung, Tools), dann klappt der Scan sicher | heute |
| Glama | glama.ai/mcp/servers: indexiert GitHub-Repos mit dem Topic `mcp` und übernimmt Einträge aus dem offiziellen Registry; Eintrag danach «Claim ownership» | Topic `mcp` auf dem Repo Kula-Labs/pazair setzen (GitHub → About → Topics); Eintrag suchen und beanspruchen; Änderungen: support@glama.ai | heute, 5 min |
| mcp.so | mcp.so/submit (Formular: GitHub-URL, Beschreibung, Tags, Kategorie; liest das README; Indexierung bis 24 h) | Repo-URL, Kategorie «Marketplace»/«Finance» | heute, prüfen |
| PulseMCP | pulsemcp.com, Submit-Seite | Server-URL, Beschreibung | heute, prüfen |
| Cursor Directory | cursor.directory/mcp, «Submit» | Name, URL, Beschreibung, Logo | heute, prüfen |
| Claude Connectors Directory | claude.com/docs/connectors/building/submission: Portal in den Claude-Admin-Einstellungen (Team/Enterprise) oder das Review-Formular aus der Support-FAQ | OAuth 2.0 (haben wir), Tool-Annotationen (`title`, `readOnlyHint`/`destructiveHint` auf jedem Tool: **Server prüfen**), Datenschutzerklärung, Testaccount für die QA | diese Woche; Annotationen zuerst |
| ChatGPT Apps / Connector | läuft, von dir angestossen | | läuft |
| Meta Muse | läuft, von dir angestossen | | läuft |
| awesome-mcp-servers (GitHub-Liste) | Pull Request mit einer Zeile unter der passenden Kategorie | GitHub-Account | diese Woche |
| LobeHub, mcpservers.org, mcp.directory | je ein Formular | | wenn Zeit bleibt |

## Vor dem Schub (Server, 10 Minuten)

1. Rate-Limit auf `/mcp` und `/v1/*`: `tools/list`, `ask_market`, `search_listings`, `/v1/ask`, `/v1/listings`
   müssen ohne Key hunderte Aufrufe pro Minute aus einem Netz aushalten; Limits nur auf schreibende Tools.
2. Cloudflare: keine Challenge auf `/mcp`, `/llms.txt`, `/.well-known/*`, `/openapi.json`; Bot-Fight-Mode darf
   Agenten-Clients (node, python-httpx, Claude, ChatGPT) nicht blocken.
3. `/.well-known/mcp/server-card.json` ausliefern (für Smithery, siehe oben).
4. Tool-Annotationen (`readOnlyHint` auf allem, was nur liest) für die Claude-Directory-Einreichung.
5. Vision: ein Schub von einer Quelle darf nicht als Angriff gewertet und gesperrt werden.
6. Erste Zeilen der Tool-Beschreibungen und von `llms.txt`, damit aus einem `tools/list` ein echter Aufruf wird:

   - `ask_market`: «Try it now, free, no key: {"goal": "create a swiss qr bill"}. Returns the agents that do
     exactly this, their price, their track record, and the one call to buy. Works in any language.»
   - `search_listings`: «Free, no key. Query by what you need; every result shows price, output_schema (what you
     will get, checked before you are charged) and the seller's Word Pass.»
   - `llms.txt`, erste Zeile: «First call, no key, right now: ask_market {"goal": "<one sentence>"}. You pay only
     after a delivery matched the listing's schema, and you get a receipt anyone can verify.»

## Messen (18:00)

- Anfragen pro Minute und Besucher aus wie vielen Ländern (Vision).
- **Davon arbeiten**: wie viele `ask_market`- oder `search_listings`-Aufrufe, wie viele `register_agent` von
  Fremden, wie viele `buy`.
- Der erste Fremde, der einen Receipt geprüft und es gesagt hat: in `ERSTE-ZEHN.md` eintragen.
- Jede Antwort in HN und Reddit innerhalb einer Stunde, sachlich, mit Zahl oder Link, nie mit Versprechen.

Wenn am Abend die Zahl dreistellig ist und «davon arbeiten» immer noch 0: dann haben wir Reichweite und keine
Tür. Dann ist morgen der Tag für die Tool-Beschreibungen und den ersten Kauf durch einen der Leser.
