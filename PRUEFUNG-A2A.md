# Prüfung: PazAIr gegen den A2A-Infra-Ziel-Prompt

Erster Prüfdurchlauf, 11. Oktober 2026. Massstab: der Ziel-Prompt «Kula Labs · A2A-Infra» (Stand 9. Oktober 2026):
fünf Fragen, sieben Schichten, acht Gesetze. Geprüft wurden das offene Protokoll (`SPEC.md`, `verify/`, `issuer/`,
`vectors/`) und die Live-Endpunkte (`/.well-known/pazair-receipts.json`, `/.well-known/agent-card.json`,
`/.well-known/pazair-facts.json`, `/llms.txt`, `/openapi.json`, `/v1/word-pass/signals`, `/v1/remember`,
`/v1/listings`). Der Server-Code von pazair.kulalabs.ch liegt nicht in diesem Repo; was nur dort steht, ist als
«live, nicht in SPEC» vermerkt.

## Ergebnis in einem Satz

PazAIr beantwortet heute drei der fünf Fragen mit prüfbaren Objekten (Deal, Mandat, Beleg), zwei nur zur Hälfte
(Identität ohne Principal-Bindung, Aufgabe über MCP), und hat kein Gate, das vor der Ausführung alle fünf verlangt;
seit diesem Durchlauf gibt es das Gate, die fehlenden Objekte und einen Testvektor (SPEC 17, `a2a/`).

## Die fünf Fragen

| # | Frage | Objekt vor der Prüfung | Gate | Lücke | Artefakt jetzt |
|---|---|---|---|---|---|
| 1 | Wer ist der Agent, wem gehört er? | `ag_…`-ID mit API-Key; `declare_agent` (Selbstauskunft, live); Principal nur als Hash im Mandat | offen | keine signierte Bindung Agent → Principal → Laufzeitidentität; A2A-Card ohne Identitätsobjekt | `agent_identity` (SPEC 17.1, `a2a/schemas/agent-identity.schema.json`) |
| 2 | Welche Aufgabe wurde vereinbart? | `buy {listing_id, input}` per MCP; Tender mit `task_sha256` (SPEC 3.3); Receipts v2 mit Input-Hash (live) | halb | die Aufgabe läuft über MCP, Gesetz 5 verlangt A2A; kein Task-Objekt mit vereinbartem Hash im Kaufpfad | `task` im `transfer_request` (SPEC 17.3): `protocol`, `task_id`, `agreed_sha256`; MCP als Aufgabenprotokoll wird vom Gate abgelehnt |
| 3 | Was wird gehandelt, zu welchem Preis? | Listing mit `price` und `output_schema`; Award (SPEC 3.3) | zu | UCP/ACP nicht angebunden; Deal-Hash im Receipt fehlt (nur `listing`-ID) | `deal` im `transfer_request`: `hash`, `output_schema_sha256` oder `terms_sha256`, Zweck-Code; UCP/ACP als `kind` vorgesehen, Adapter offen |
| 4 | Darf dieser Agent diesen Betrag ausgeben? | Mandat (SPEC 3.2): Währung, Limite pro Auftrag, Monat; `mandate_end` | halb | kein Ablauf, keine Gegenpartei-Allowlist, kein Step-up, `purpose` Freitext, nur Issuer-Signatur | Mandat 17.2: `expires_at`, `counterparties`, `purpose_codes`, `step_up_above_minor`, `unattended`, `principal_sig`; `step_up`-Objekt |
| 5 | Ist der Wert angekommen, gibt es einen Beleg? | Receipt (SPEC 3) nach Lieferung und Capture; täglich verankert | halb | Receipt nennt keine Settlement-ID, kein Rail, keine Identität, keine Policy; «Settlement»-Objekt live, nicht in SPEC | `evidence` (SPEC 17.4): Identität, Aufgabe, Deal, Mandat, Gegenpartei, Preis, Settlement mit ID und Finalität, Ergebnis, Gate-Entscheid |

## Die Schichten

**Identität: Gate war offen.** Ein Agent ist eine ID mit Key. `declare_agent` ist Selbstauskunft, nie mit Beweis
vermischt (gut), aber auch kein Beweis. Der Principal kommt erst im Mandat vor. Die Live-Agent-Card ist A2A 0.3.0,
der Ziel-Prompt verlangt v1.0+. Massnahme: `agent_identity`, vom Issuer signiert, bindet Agent, Principal-Hash,
Laufzeitidentität (SPIFFE-ID oder Ed25519-Schlüssel mit Nachweis pro Request) und den Hash der Agent-Card;
hat ein Ablaufdatum. Gate zu.

**Aufgabe: halb.** Tender und Award fixieren die Aufgabe per Hash. Der normale Kauf tut es nicht sichtbar
(Receipts v2 tragen laut `llms.txt` einen Input-Hash, in SPEC steht das nicht). Die Aufgabe läuft über MCP.
Gesetz 5 sagt: A2A redet, MCP nur Werkzeuge. Massnahme: das Gate verlangt ein Task-Objekt mit `agreed_sha256`;
die Referenz-Policy erlaubt nur `a2a`. Offen (Owner-Entscheid): den PazAIr-Kauf als A2A-Task führen oder
`pazair_order` in der Policy zulassen und die Lücke benennen.

**Deal: zu.** Listing, Preis in Minor-Einheiten, `output_schema` als Vertrag, Award für Tender. Freitext ist nie
der Vertrag. Massnahme: Deal-Hash und Vertrags-Hash in jedem Transfer. Offen: UCP- und ACP-Adapter.

**Mandat: halb.** Stark, was es gibt (Hash statt Name, Signatur bricht bei Änderung, `mandate_end`). Es fehlten:
Ablauf (Gesetz 7), Gegenpartei-Allowlist (Gesetz 7), Step-up ausserhalb des Bandes, Human-not-present als
Entscheid des Principals, und `purpose` ist Freitext («Kein Freitext-Verwendungszweck»). Massnahme: Felder
hinzugefügt, nur hinzugefügt (SPEC 8): `verifyMandate` prüft die neuen Mandate unverändert (Test). Der
Freitext bleibt für Menschen, kein Gate liest ihn; das Gate liest `purpose_codes`. Die eigene Signatur des
Principals (`principal_sig`) macht aus dem Mandat ein Verifiable Intent im Sinn von AP2.

**Settlement: halb, und das ist richtig so.** PazAIr hält kein Geld (Positionierung), die Rails sind fremd: Stripe
(Capture nach Lieferung), x402-Import, XRP, RLUSD, XLM. Gegen Gesetz 4 steht nichts: die Prüfung ist vor der
Zahlung (Lieferung gegen `output_schema`), der Chargeback ist kein Sicherheitsnetz, sondern wird mit Beweis
bestritten. Lücke: kein Objekt sagt «Wert endgültig angekommen» mit Rail und ID. Massnahme: `settlement` im
Evidence-Objekt mit `rail`, `id`, `final`, `finalized_at`. Gebührenregel als Code: `FEE_EATS_CALL` ab 25 %.

**Gate: war nicht vorhanden.** Keine Policy vor Ausführung, kein RBAC auf Identität und Werkzeugname. Massnahme:
`gateway_policy` (Schema und Referenz-Policy) und `decide()`: eine Funktion, ein Transfer, Antwort `allow`,
`step_up` oder `reject` mit Codes aus `rejection-reasons.json`. Jede Entscheidung trägt den Hash der Policy.

**Beleg: halb.** Receipt und Word Pass sind gut und verankert. Aber: ein Receipt nennt weder Identität noch
Settlement-ID noch Gate. Massnahme: `evidence`, ein Objekt pro Transfer, das alle fünf Fragen per Hash
beantwortet. Gesetz 2 als Code: ein abgerechneter Transfer ohne Evidence sperrt die nächste Zahlung auf derselben
Kette (`EVIDENCE_MISSING_PRIOR`).

## Die acht Gesetze

| Gesetz | Vorher | Jetzt |
|---|---|---|
| 1 Mandat vor Bewegung | Mandat optional (`pay_url` ohne Mandat) | Gate: ohne Mandat `MANDATE_MISSING`; `pay_url` ist der Step-up-Pfad (Mensch anwesend) |
| 2 Beleg vor Erfolg | Receipt nach Lieferung, ohne Settlement-ID | Evidence mit finalem Settlement; ohne Evidence keine zweite Zahlung |
| 3 Principal bleibt haftbar | Principal-Hash im Mandat | Principal-Hash in Identität und Mandat, müssen übereinstimmen (`MANDATE_PRINCIPAL_MISMATCH`) |
| 4 Unwiderruflich heisst vorher prüfen | Lieferung gegen Vertrag, dann Capture | unverändert; Chargeback ist ein Streit-Fall mit Beweis, kein Sicherheitsnetz |
| 5 Eine Schicht, ein Job | Kauf über MCP | Gate trennt Task, Deal, Mandat, Settlement; MCP als Aufgabenprotokoll abgelehnt; PazAIr-Kaufpfad offen |
| 6 Streit ist ein Objekt | Entscheid eines Menschen, signiert und verankert (live) | SPEC 17.5: `dispute`, `dispute_answer`, `dispute_decision` mit `bears` (Haftungspfad) und Rückerstattung mit Rail-ID; `verifyDispute` |
| 7 Limite sind Code | Limite pro Auftrag, Monat | dazu Ablauf, Allowlist, Zweck-Codes, Step-up-Band, unattended, Monatslimite aus dem Ledger |
| 8 Kein Protokoll-Mix als Ausrede | nichts markiert | jede Entscheidung listet `gaps`: `counterparty_identity`, `task_not_a2a`, `principal_signature` |

## Weitere Befunde

1. **SPEC hinkt dem Produkt hinterher.** Live gibt es «Receipts v2» (Input-Hash, geprüfter Vertrag), ein
   «Settlement»-Objekt und `declared_by_holder`; in `SPEC.md` steht keines davon. Die Positionierung sagt «sagen,
   was live ist». Hier gilt das umgekehrt: was live ist, muss in die offene SPEC. Offen, braucht den Server-Code.
2. **A2A-Version.** Agent-Card `protocolVersion` 0.3.0; Ziel-Prompt verlangt v1.0+. Offen, Server.
3. **Freitext.** `purpose` im Mandat und `description` im Listing sind Freitext. Beides bleibt für Menschen; der
   Vertrag ist `output_schema`, der Zweck ist `purpose_code`. Kein Gate liest Freitext.
4. **`/.well-known/word-pass` antwortet 404** auf pazair.kulalabs.ch. Für die Plattform selbst nicht nötig
   (SPEC 9 gilt für Agenten auf eigener Domain); kein Fehler, nur notiert.
5. **Vektoren, Tests, Doppelsignatur** sind in Ordnung: `verify` 21 Tests, `issuer` 5, Python getrennt, alle grün.

## Was gebaut wurde

| Schicht | Gate | Artefakt | offene Lücke |
|---|---|---|---|
| Identität | zu | `a2a/schemas/agent-identity.schema.json`, `signAgentIdentity` | Server stellt sie noch nicht aus; Agent-Card-Extension muss sie tragen |
| Aufgabe | zu (Policy) | `task` in `transfer-request.schema.json`, `TASK_PROTOCOL_NOT_ALLOWED` | PazAIr-Kauf als A2A-Task |
| Deal | zu | `deal` in `transfer-request.schema.json`, Zweck-Codes in `_defs.json` | UCP/ACP-Adapter |
| Mandat | zu | `a2a/schemas/mandate.schema.json`, `signMandate17`, `step_up` | `set_mandate` live ohne neue Felder |
| Settlement | zu (Plan) | `settlement` im Request, `FEE_EATS_CALL`, `RAIL_NOT_ALLOWED` | Finalität je Rail prüfen (x402/MPP-Ingestion) |
| Gate | zu | `a2a/policy/gateway-policy.json`, `gateway-policy.schema.json`, `decide()`, `rejection-reasons.json` | Einbau in den Gateway vor `buy`, `accept_bid`, `create_project` |
| Beleg | zu | `a2a/schemas/evidence.schema.json`, `signEvidence`, `verifyEvidence` | Server stellt es noch nicht aus |
| Streit | zu | `a2a/schemas/dispute.schema.json`, `signDispute`, `signDisputeAnswer`, `signDisputeDecision`, `verifyDispute` | Server stellt die drei Objekte noch nicht so aus |
| Testvektor | | `vectors/a2a-transfer-1.json`: ein Transfer, Allow, Evidence, 26 Varianten mit je einem Grund, Übergangs-Policy, Streit mit 5 Varianten | |

Alles in `a2a/` ist ohne Abhängigkeiten, läuft mit `npm test` (13 Tests) und steht in SPEC 17. Runde 2, die
simulierte Prüfung durch fünf Gruppen von Senior Developers mit 60 Befunden und dem Stand danach:
[`PRUEFUNG-100.md`](PRUEFUNG-100.md).

**Was es für Kula Flow heisst.** Kula Flow handelt nur mit Mandat (Positionierung, Innovation 10). Das Gate ist
die Stelle, an der das geprüft wird, bevor Kula Flow Geld bewegt; das Evidence-Objekt ist, was sein Learning
Quantum Loop danach liest. Siehe [`a2a/README.md`](a2a/README.md#wie-es-kula-flow-speist).

**Nachprüfung des eigenen Codes.** Eine zweite, kritische Durchsicht fand sechs Lücken im Gate, alle behoben
und mit Tests belegt: `verifyEvidence` verglich den Preis nicht mit dem Deal; die Identität der Gegenpartei wurde
ohne Art, Ablauf und Ausstelldatum angenommen; ein Step-up aus der Zukunft galt als frisch; eine unlesbare
Transferzeit wurde durch «jetzt» ersetzt (geraten, nicht abgelehnt); eine kaputte RBAC-Regel liess das Gate
abstürzen statt ablehnen; `answered` wurde vor dem Ende aller Prüfungen berechnet. Dazu ein Grund-Code ohne
Prüfung dahinter (entfernt) und Code-Duplikate (zusammengelegt).

## Was offen bleibt und wer entscheidet

- **Owner:** Kaufpfad als A2A-Task oder `pazair_order` in der Policy zulassen. Empfehlung: `pazair_order` für
  12 Monate zulassen, in jeder Entscheidung als `gaps: ["task_not_a2a"]` sichtbar, parallel A2A-Task einführen.
  Vorbereitet als `a2a/policy/gateway-policy-transition.json`; die Referenz-Policy bleibt streng.
- **Server:** `agent_identity` bei `register_agent` ausstellen; `set_mandate` um die 17.2-Felder erweitern;
  `decide()` vor `buy`, `accept_bid`, `create_project`; `evidence` nach jedem Capture; SPEC-Drift schliessen.
- **SPEC:** Settlement-Objekt und Receipts v2 nachtragen (braucht den Server-Code). Das `dispute`-Objekt ist erledigt (17.5).
- **Partner:** UCP/ACP-Adapter, x402/MPP-Finalität.

## Die Challenge: der Sprung

Der Befund zeigt den Hebel. Jeder Agent, der irgendwo bezahlt, muss sich die fünf Antworten aus fünf Protokollen
zusammensuchen: Identität hier, Mandat dort, Deal als Freitext, Settlement ohne Beleg. Auf PazAIr kommt jeder
Transfer mit allen fünf Antworten als signierte Objekte, und das Gate des kaufenden Agenten sagt ohne eine einzige
Rückfrage `allow`. **Fünf Antworten, null Fragen.** Ein intelligenter Agent wählt den Weg mit null offenen Fragen,
nicht weil er muss, sondern weil jede offene Frage ihn Zeit, Geld oder Haftung kostet. Was das im Einzelnen heisst,
mit zehn USPs und zehn Innovationen: [`a2a/README.md`](a2a/README.md).

## Nachtrag: die Tür

Eine Rückmeldung von aussen, am selben Tag, sagt, was diese Prüfung nicht misst: nicht eine Funktion fehlt,
sondern zehn kleine, echte, bezahlte Lieferungen, die jemand ausser uns gesehen hat. Die Reihenfolge stimmt
(Vertrauen zuerst, dann Markt), und sie darf nicht verwässert werden, weil jemand schnelleres Volumen will. Das
Gate von SPEC 17 ändert daran nichts, es hält nur die Schicht dicht, während die Tür aufgeht. Das Register dafür,
mit den drei Kriterien pro Trade: [`ERSTE-ZEHN.md`](ERSTE-ZEHN.md). Erster Trade: langweilig. QR-Rechnung,
Übersetzung, Zeitstempel, Extraktion.

