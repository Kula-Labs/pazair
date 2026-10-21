# Vercel: der Weg, in dieser Reihenfolge

Stand 21. Oktober 2026. Vercel ist der Ort, an dem heute sehr viele Agenten gebaut werden (AI SDK, v0, Next.js). Vercel
löst, wie ein Agent läuft; PazAIr löst, wie ein Agent handelt und es beweist. Das ergänzt sich. Vercel reagiert nicht
auf Partnerschaftsmails, sondern auf Dinge, die auf Vercel gebaut sind und gut aussehen. Darum diese Reihenfolge,
alles ohne Budget, alles im Rahmen der Regeln (eine persönliche Nachricht, nie Massenversand).

## Was Vercel davon hat

- Mehr Agenten, die auf Vercel laufen und Aufgaben zu Ende bringen, weil sie bei einem anderen Agenten kaufen können,
  statt bei jeder Lücke aufzugeben.
- Eine Antwort auf die Frage ihrer Firmenkunden «Mein Agent hat Geld ausgegeben, wer hat das erlaubt?»: Mandat und
  Quittung, offener Standard, kein Geld bei uns. Vercel muss nichts bauen.
- Eine Geschichte, die sie gern erzählen: Ein AI-SDK-Agent probt einen Kauf, die Quittung ist signiert und in Bitcoin
  verankert, und jeder prüft sie mit `npx pazair-verify`.

## Die Schritte

| # | Was | Stand |
|---|---|---|
| 1 | Das Template [`examples/vercel-ai-sdk/`](examples/vercel-ai-sdk/): Next.js, AI SDK 7, AI Gateway, vier PazAIr-Werkzeuge, Sandkisten-Kauf ohne Geld, Quittung geprüft, Deploy-Knopf | gebaut, `next build` grün, Werkzeuge live geprüft |
| 2 | Einmal selbst deployen (Deploy-Knopf im README), die URL ins README, ein Video von 60 Sekunden: Frage, Fund, Probe, Quittung hält | Fatih |
| 3 | Das Template in die Vercel-Template-Galerie einreichen (Formular auf vercel.com/templates; prüfen, ob es offen ist) | Fatih |
| 4 | Ein Beitrag im AI-SDK-Repo auf GitHub, Discussions «Show and tell», Text unten | Fatih |
| 5 | Ein Post auf X mit dem Video, der Vercel und das AI SDK nennt, Text unten | Fatih |
| 6 | Erst dann die Mail an Vercel, mit Link auf das, was läuft; Text im Chat vom 21. Oktober, ein Versand, keine zweite ohne Antwort | Fatih |

Was wir nicht sicher wissen und vor Schritt 3 und 6 prüfen: ob Vercel aktuell ein Förderprogramm für Open Source oder
einen Marketplace-Eintrag für Werkzeuge wie unseres offen hat. Beides gab es in Formen, die sich ändern.

## Show and tell (GitHub Discussions im AI-SDK-Repo)

**Title:** An AI SDK agent that buys from other agents, pays on delivery, and verifies the receipt (template)

> When an agent can't do a task, it usually guesses. This template gives an AI SDK agent a fourth option: ask a market
> of other agents. PazAIr is a marketplace where AI agents buy from and sell to each other: a specialist delivers, the
> delivery is checked against the listing's schema, and only then is the card charged. Every delivery gets a signed
> receipt anchored daily in Bitcoin and Stellar; the human sets limits once (a signed mandate), so "was the agent
> allowed to pay?" has a signed answer.
>
> The template uses four tools over plain REST (ask_market, check_agent, buy_sandbox, verify_receipt), the AI Gateway
> for the model, and rehearses the whole purchase without money, then verifies the receipt in the same chat.
> Deploy button in the README: https://github.com/Kula-Labs/pazair/tree/main/examples/vercel-ai-sdk
> Live demo: [URL]
>
> The trust layer (receipts, track record, buyer's licence) is an open standard under MIT, and `npx pazair-verify`
> checks any receipt offline. I'd love feedback on the tool design, and on whether the mandate idea (signed spending
> limits a receipt points to) is something you'd want agents on the AI SDK to have.

## Post auf X

> Gave a @vercel AI SDK agent a fourth option when it can't do a task: ask a market of other agents.
> It finds a seller, rehearses the purchase without money, and verifies the signed receipt in the same chat.
> Pay on delivery, receipts anchored in Bitcoin, limits the human signs once. Open standard, MIT.
> Template, one click: [Link]
