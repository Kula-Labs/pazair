# Prüfung durch 100 Senior Developers (simuliert) und der Stand danach

11. Oktober 2026, Runde 2. Geprüft wurde der Branch `claude/friendly-pasteur-p7c2jh` nach Runde 1
([`PRUEFUNG-A2A.md`](PRUEFUNG-A2A.md)): das Paket `a2a/`, SPEC 17, der Testvektor, die Doku.

**Was diese Prüfung ist, und was nicht.** Fünf Prüfgruppen zu je zwanzig Senior Developers wurden simuliert,
jede mit einem Schwerpunkt: Sicherheit und Kryptografie, Funktionalität und Spec-Treue, Geschwindigkeit und
Robustheit, API und Entwicklererfahrung, Protokoll-Standards (A2A 1.0, AP2, x402, MPP, UCP, ACP, SPIFFE). Jede
Gruppe hat den Code gelesen, Behauptungen mit eigenen Skripten nachgestellt, Latenzen gemessen und die aktuellen
Protokollspezifikationen nachgeschlagen. Es waren keine hundert Menschen. Es waren fünf unabhängige Durchgänge,
deren Befunde alle reproduziert sind. Herkunft spielte keine Rolle; die Massstäbe waren die, die ein Senior
Developer anlegt, egal wo er sitzt.

## Ergebnis in einem Satz

Die Logik des Gates und der Vektor hielten; was nicht hielt, waren die Ränder: blind vertraute Zeit, ungebundene
Nachweise, ein zirkulärer Hash, eine Währungsregel, die vier von sieben Rails unmöglich machte, und eine Doku, aus
der niemand das Gate hätte einbauen können. 60 Befunde, 7 davon hoch, alle 7 behoben, 41 weitere behoben, 12
bewusst offen gelassen und hier begründet.

## Die Befunde, nach Gruppe

### Sicherheit (14 Befunde, 2 hoch)

| Schwere | Befund | Stand |
|---|---|---|
| hoch | `request.at` wurde blind vertraut; `now` nie geprüft. Wer die Zeit setzt, steuert Ablauf, Monatslimite, Step-up. | behoben: `at` muss innerhalb der Uhrabweichung von `now` liegen (`REQUEST_TIME_SKEW`); Zeiten ohne Zone, Zahlen, Booleans werden abgelehnt, nie durch «jetzt» ersetzt |
| hoch | `human_present` war ein unbestätigtes Flag, das `unattended: false` aushebelte. | behoben in der Doku und im Schema: vom Gateway gesetzt, nie aus dem Aufruf; fehlendes `unattended` heisst jetzt «nein» |
| mittel | Laufzeitnachweis und Step-up waren nicht an den Deal gebunden: ein abgefangener Nachweis galt für jeden Deal unter derselben Transfer-ID. | behoben: Nachweis über Transfer, Agent, Gateway, Deal-Hash, Betrag, Währung; Step-up trägt Deal-Hash und Verkäufer |
| mittel | `principal_sig` war selbstzertifizierend: jeder Schlüssel galt als «der Principal». | behoben: `principal_key` in der Identität, vom Issuer attestiert; Abweichung ist `MANDATE_PRINCIPAL_KEY_MISMATCH`, Fehlen ist die Lücke `principal_key_unattested` |
| mittel | Monatslimite zählte nur Abgerechnetes (keine Reservierung), negative Beträge zogen ab. | behoben: jede erlaubte Buchung des Monats zählt; Einträge werden validiert (`REQUEST_HISTORY_INVALID`) |
| mittel | Tief verschachteltes Mandat liess `decide()` abstürzen statt ablehnen. | behoben: `safeHash`, kein Hash wird ausserhalb eines try/catch gerechnet; Test mit 100 000 Ebenen |
| tief | Zeit ohne Zone war lokal; Policy-Listen als String; Gebühr nicht numerisch; negative Rückerstattung; `keys` nicht validiert. | alle behoben |
| tief | Threat-Modell nirgends formuliert. | behoben: SPEC 17 «Trust model», README «Who sets what», Schema-Beschreibung «set by» |
| info | Deal-Hashes sind selbstbehauptet, wenn der Gateway den Deal nicht selbst holt. | dokumentiert: der Gateway holt und hasht den Deal, der Agent behauptet ihn nie |

### Funktionalität (15 Befunde, 3 mittel)

| Schwere | Befund | Stand |
|---|---|---|
| mittel | Principal-Signatur brach mit der Zweitsignatur aus SPEC 16 (`pq_sig` im Körper). | behoben: `principalSigned` lässt `pq_sig` und `pq_kid` weg; Test |
| mittel | Fehlendes `unattended` wurde als «erlaubt» gelesen; Issuer, Schema und Gate widersprachen sich. | behoben: fehlt es, muss ein Mensch dabei sein |
| mittel | Schema verlangte alle 17.2-Felder, das Gate prüfte sie nur optional: «nur hinzugefügt» stimmte nicht. | behoben: Felder im Schema optional, per Policy verlangt (`require.purpose_codes` neu); ein SPEC-3.2-Mandat erfüllt das Schema (Test) |
| tief | Step-up-Codes standen auch auf Ablehnungen; `answered` ignorierte Step-ups. | behoben: Step-up-Codes nur bei `step_up` |
| tief | Fünf Prüfungen, die das Schema macht und das Gate nicht (leere Task-ID, fehlendes `deal.ref`, negative Gebühr, `evidence: "yes"`, freier `reason_code`). | alle behoben |
| tief | Ledger-Zeiten nicht normalisiert; Uhrabweichung nicht validiert; `mandate_end` ohne Abweichung; `decided_at` nicht dokumentiert. | alle behoben |
| doku | «15 Varianten», «unter 25 %», «ohne sig, kid», `gaps`-Definition, Changelog ohne 17.5. | alle behoben |

### Geschwindigkeit und Robustheit (11 Befunde, 3 hoch)

Gemessen auf Node 22: `decide()` mit Allow 1,6 ms p50 (4,2 ms p99), eine frühe Ablehnung 0,7 ms, `verifyEvidence`
0,6 ms; 85 % davon ist Kryptografie (6 Hashes, 4 Signaturprüfungen). Kein Leck nach 60 000 Aufrufen. Ein Ledger
mit 10 000 Einträgen kostet 0,3 ms mehr.

| Schwere | Befund | Stand |
|---|---|---|
| hoch | Absturz durch tief verschachteltes Objekt (siehe Sicherheit). | behoben |
| hoch | `history` als String oder mit `null`-Einträgen warf `TypeError`. | behoben: validiert, Ablehnung mit Code |
| hoch | `node:fs` beim Laden: die Behauptung «Deno, Bun, Workers, Browser» war falsch. | behoben: `src/reasons.js` wird aus dem JSON generiert (CI prüft), Dateisystem nur noch in `src/node.js` |
| mittel | Signaturprüfungen sequenziell statt parallel (36 bis 45 % möglich). | offen, bewusst: 1,6 ms reichen; Parallelisierung ändert die Reihenfolge der Gründe nicht, aber die Lesbarkeit; später |
| mittel | `principalSigned` doppelt gerechnet. | behoben: einmal |
| mittel | `keys` nicht validiert. | behoben |
| tief | Policy-Hash bei jedem Aufruf (0,1 ms); `say()` wirft ohne `reasons`; `problems()` wirft bei kaputtem Schema. | `say` und `problems` behoben; Policy-Hash bleibt (6 %, deterministisch, bewusst) |

### API und Entwicklererfahrung (16 Befunde, 3 hoch)

| Schwere | Befund | Stand |
|---|---|---|
| hoch | Paket nicht installierbar, nicht kopierbar (Import per Pfad). | teilweise: `exports`, `files`, `types`, Metadaten ergänzt; bleibt `private` und sagt es im README; die Veröffentlichung auf npm ist ein Owner-Entscheid (Pfadimport gegen `pazair-verify` als Abhängigkeit) |
| hoch | Wer `transfer` und `aud` erzeugt, war undokumentiert; der Laufzeitnachweis war so nicht baubar. | behoben: «Assembling a request» im README, fünf Schritte, und in SPEC 17.3 |
| hoch | Ledger-Semantik nur im Schema; zwei Lesarten (Monatslimite, Belegregel). | behoben: README erklärt beide, `chain` auf jedem Eintrag, Serialisierung pro Mandat |
| mittel | Keine Typen; `now` eine Falle; `answered.settlement` ein String; `say()` nennt Lücken nicht; keine Akteur-/Retry-Info für Agenten; `keys` unerklärt; `$id` löst nicht auf; keine Schemas für Entscheidung und Step-up; Namensdrift; deutsches README; README-Beispiel nicht lauffähig; keine CLI. | behoben bis auf zwei: `index.d.ts`, `now` geprüft und dokumentiert, `say` mit Lücken und `lang`, `actor` und `retry` pro Code, `fetchKeys` im Beispiel, `$id` auf raw.githubusercontent, `gate-decision` und `step-up` Schemas, `signMandate` und `verifyDispute(dispute, {…})` umbenannt, englisches README mit deutscher Fassung, `examples/gate.mjs` lauffähig. Offen: `answered.settlement` bleibt der ehrliche String (dokumentiert und im Schema fixiert); keine CLI (später) |

### Protokoll-Standards (19 Befunde, 4 hoch)

| Schwere | Befund | Stand |
|---|---|---|
| hoch | Card-Hash zirkulär: die Card trägt die Identität, die Identität den Hash der Card. | behoben: Hash über die Card ohne die Gate-Extension (`cardHash`); Extension-URI stabil `https://pazair.kulalabs.ch/ext/gate/v1`; Vektor zeigt es |
| hoch | Währung `^[a-z]{3}$`: x402 (USDC), XRPL (RLUSD), Stellar unmöglich; ein CHF-Deal konnte nie auf x402 abgerechnet werden. | behoben: Settlement mit `asset`, `network`, `fx { rate, quoted_at }`; Betrag = round(Deal × Kurs) ± 1; Vektor: CHF-Deal in USDC auf Base |
| hoch | Die Live-Agent-Card ist kein A2A-Endpunkt (`url` zeigt auf `/mcp`, 0.3.0). | offen, Server und Positionierung: Owner-Entscheid. Im Prüfbericht Runde 1 bereits als Befund |
| hoch | Ein Partner mit nur A2A + x402 scheitert am Gate, ohne dass `gaps` es sagt. | behoben, soweit das Gate es kann: `x402_requirements` als Deal-Art, Verkäufer als DID, Card-URL oder CAIP-10-Konto, Lücke `counterparty_not_onboarded`; was bleibt: er braucht eine Identität von einem Issuer, den der Gateway kennt. Das steht jetzt so in SPEC 17 |
| mittel | «AP2-kompatibel» war zu viel: AP2 v0.2 sind SD-JWT-Credentials mit ECDSA, unseres ist Ed25519 über JSON. | behoben: «AP2-förmig, kein AP2-Credential»; `how: ap2_mandate`; Feld-Mapping im Bericht der Gruppe |
| mittel | `final: true` falsch definiert (Stripe kann sehr wohl zurückbuchen); `id` je Rail unklar. | behoben: `finality` (captured, confirmed, finalized, validated, booked) plus `reversible_by_rail`; `id` je Rail benannt; Chargeback ist `bears: rail` |
| mittel | «MCP trägt nie Zahlung» ist eine Policy, kein Fakt (x402 und MPP laufen über MCP). | behoben: MCP ist nie die Vereinbarung, darf die Zahlung transportieren |
| mittel | Vektor mit A2A-0.3-Formen unter dem Etikett 1.0; `agreed_sha256` ohne A2A-Semantik. | behoben: `supportedInterfaces`, `ROLE_USER`, `messageId`; `agreed_sha256` = Hash der Message wie gesendet, `messageId` inklusive |
| mittel | SPIFFE-Prüfung unterbestimmt; Regex zu lax. | behoben: Muster verschärft, Bundle-Validierung und einzige URI-SAN in SPEC 17.1 |
| mittel | `acp_order` existiert vor der Zahlung nicht; `card` ist kein Rail; RBAC-Methodennamen aus drei A2A-Generationen. | behoben: `acp_checkout_session`, `card` gestrichen, `SendMessage`/`SendStreamingMessage`/`message/send`/`message/stream` |
| tief | Extension-URI als Markdown-Anker; `how`-Enum gemischt; Stripe-ID `pi_` vs `ch_`. | alle behoben |

## Was bewusst offen bleibt

1. **Veröffentlichung auf npm** (`pazair-a2a` mit `pazair-verify` als Abhängigkeit): Owner-Entscheid, wie bei den
   anderen Paketen über `RELEASING.md`.
2. **Die Live-Agent-Card** als echter A2A-Endpunkt mit `supportedInterfaces` und der Gate-Extension: Server.
3. **Parallelisierte Signaturprüfung** im Gate: möglich, nicht nötig.
4. **CLI** (`npx pazair-a2a decide request.json`): später, nach dem Muster von `pazair-verify`.
5. **`answered.settlement: "after_evidence"`** bleibt ein String in einer Karte aus Booleans. Er ist im Schema
   fixiert und sagt die Wahrheit: die fünfte Frage ist vor dem Settlement nicht beantwortbar.
6. **Keyed Hash für den Principal** (gegen Brute-Force auf kurze Referenzen): betrifft SPEC 3.2 und den Server,
   nicht nur dieses Paket; gehört in die Lernschleife (SPEC 13).
7. **Serialisierung pro Mandat** gegen zwei gleichzeitige Entscheidungen: Aufgabe des Gateways, dokumentiert,
   nicht im Gate lösbar, das zustandslos bleibt.

## Der Stand nach Runde 2

| | Runde 1 | Runde 2 |
|---|---|---|
| Objekte | Identität, Mandat 17.2, Step-up, Request, Policy, Evidence, Streit | dazu Gate-Entscheidung und Step-up als Schema, Principal-Schlüssel in der Identität, Asset und Kurs im Settlement, Finalität je Rail |
| Ablehnungsgründe | 69 | 74, jeder mit Frage, Schicht, Akteur, Retry, zwei Sätzen; generiertes Modul ohne Dateisystem |
| Vektor | 16 + 5 Varianten | 26 + 5 Varianten, A2A-1.0-Formen, Card mit Extension, USDC-Settlement, Zeitabweichung, ungültiges Ledger |
| Tests | 13 | 13 Tests, 150 Zusicherungen, dazu `examples/gate.mjs` in CI |
| Laufzeit | nicht gemessen | 1,6 ms pro Entscheidung, kein Leck, 100 000-fach verschachtelter Input wird abgelehnt |
| Doku | deutsches README | englisches README mit Einbauanleitung, deutsche Fassung mit USPs und Innovationen, Typen, Threat-Modell in SPEC 17 |
| Standards | A2A-Extension, SPIFFE, Rails als Liste | Card-Hash ohne Zirkel, A2A 1.0, SPIFFE-Validierung, x402/XRPL/Stellar abrechenbar, UCP/ACP korrekt benannt, AP2 ehrlich eingeordnet |

Alle Suiten grün (a2a 13, verify 21, issuer 5, Python), Vektor und generiertes Modul reproduzieren byteidentisch,
beides wird in CI geprüft. Gepusht auf `claude/friendly-pasteur-p7c2jh`; gemerged ist nichts, ein Pull Request
wird auf Zuruf geöffnet.
