# a2a: das Gate und der Beleg eines Agent-zu-Agent-Transfers

Referenzimplementation von [SPEC 17](../SPEC.md#17-the-gate-five-questions-one-transfer). Ohne Abhängigkeiten,
Node 20+. Entstanden aus der [Prüfung gegen den A2A-Infra-Ziel-Prompt](../PRUEFUNG-A2A.md).

Ein Transfer ist gültig, wenn fünf Fragen mit je einem prüfbaren Objekt beantwortet sind. Fehlt eine Antwort:
Ablehnung mit Grund, nie Raten.

| # | Frage | Objekt | Schicht | Gate |
|---|---|---|---|---|
| 1 | Wer ist der Agent, wem gehört er? | `agent_identity` | Identität | zu |
| 2 | Welche Aufgabe wurde vereinbart? | `task` (A2A-Task mit `agreed_sha256`) | Aufgabe | zu |
| 3 | Was wird gehandelt, zu welchem Preis? | `deal` (Listing, Award, UCP, ACP; per Hash) | Deal | zu |
| 4 | Darf dieser Agent diesen Betrag ausgeben? | `mandate` (SPEC 3.2 + 17.2), `step_up` | Mandat | zu |
| 5 | Ist der Wert angekommen, gibt es einen Beleg? | `evidence` | Settlement + Beleg | zu |

Dazwischen steht das Gate: `gateway_policy` plus `decide()`, vor der Ausführung, mit RBAC auf Agent-Identität
und Werkzeugname.

## Die Dateien

| Datei | Was |
|---|---|
| `schemas/agent-identity.schema.json` | 17.1: Agent, Principal-Hash, Laufzeitidentität (SPIFFE oder Schlüssel), Agent-Card-Hash, Ablauf |
| `schemas/mandate.schema.json` | 17.2: SPEC 3.2 plus Ablauf, Gegenpartei-Allowlist, Zweck-Codes, Step-up-Band, `unattended`, `principal_sig` |
| `schemas/transfer-request.schema.json` | 17.3: was der Gateway hält, wenn er einen Transfer entscheidet |
| `schemas/gateway-policy.schema.json`, `policy/gateway-policy.json` | 17.3: Policy vor Ausführung, Referenz-Policy |
| `policy/rejection-reasons.json` | jeder Ablehnungsgrund mit Frage, Schicht, Satz auf Deutsch und Englisch |
| `schemas/evidence.schema.json` | 17.4: ein Objekt pro Transfer, alle fünf Antworten per Hash |
| `src/gate.js` | `decide()`, `verifyEvidence()`, `say()` |
| `src/issue.js` | `signAgentIdentity`, `signMandate17`, `signStepUp`, `signEvidence` |
| `src/schema.js` | kleiner Schema-Prüfer, damit die Tests ohne Abhängigkeit laufen |
| `../vectors/a2a-transfer-1.json` | ein Transfer von der Identität bis zum Beleg, 15 Varianten mit je einem Grund |

```sh
cd a2a && npm test            # 10 Tests
node scripts/make-vector.mjs  # erzeugt den Vektor neu, byteidentisch
```

## Ein Transfer, in Code

```js
import { decide, say, verifyEvidence } from './src/index.js';
const d = await decide(request, policy, { keys });   // request: schemas/transfer-request.schema.json
d.decision   // 'allow' | 'step_up' | 'reject'
d.reasons    // z. B. ['MANDATE_COUNTERPARTY_NOT_ALLOWED']
d.answered   // { identity: true, task: true, deal: true, mandate: false, settlement: 'after_evidence' }
d.gaps       // Gesetz 8: was der Partner nicht spricht, z. B. ['counterparty_identity']
say(d)       // ein Satz für den Principal
// nach dem Settlement:
(await verifyEvidence(evidence, { keys, identity, mandate, deal, decision: d, receipt })).valid
```

Was `decide()` prüft, in der Reihenfolge: Policy gültig; RBAC (Agent × Werkzeug, kein Treffer ist Ablehnung);
Identität signiert, mit Principal, nicht abgelaufen, Laufzeitnachweis passt (SPIFFE-Peer-ID oder Ed25519-Signatur
über `{ transfer, agent, aud }`); Aufgabe mit erlaubtem Protokoll und vereinbartem Hash; Deal per Hash, mit
maschinenlesbaren Bedingungen, Verkäufer ungleich Käufer, Preis; Mandat signiert, für diesen Agenten und
denselben Principal wie die Identität, gültig (ausgestellt, nicht abgelaufen, nicht beendet), Währung, Limite pro
Auftrag, Monatslimite aus dem Ledger, Gegenpartei auf der Allowlist, Zweck-Code erlaubt, Step-up-Band,
`unattended`; Settlement-Plan mit erlaubtem Rail und Gebühr unter 25 %; kein früherer Transfer der Kette ohne
Beleg. Ein Step-up gilt nur mit einer frischen, signierten Bestätigung für genau diesen Transfer und mindestens
diesen Betrag.

## Was ein Mandat jetzt sagt

```json
"scope": { "currency": "chf", "max_order_minor": 1000, "monthly_minor": 5000,
           "counterparties": ["ag_alpha", "ag_beta"], "purpose_codes": ["translation"],
           "step_up_above_minor": 800, "unattended": true },
"expires_at": "2026-12-31T23:59:59.000Z",
"principal_sig": { "kid": "…", "x": "…", "sig": "…" }
```

Felder sind nur hinzugekommen: `verifyMandate` aus `pazair-verify` prüft diese Mandate unverändert (Test).
Der Freitext `purpose` bleibt für Menschen; kein Gate liest ihn.

## 10 USPs

1. **Fünf Antworten, null Fragen.** Auf PazAIr kommt jeder Transfer mit allen fünf Objekten; das Gate des
   Käufers sagt `allow` ohne Rückfrage. Anderswo sucht der Agent die Antworten aus fünf Protokollen zusammen.
2. **Ablehnung mit Grund, nie Raten.** Jedes Nein ist ein Code mit Frage, Schicht und einem Satz in zwei Sprachen.
3. **Limite sind Code.** Ablauf, Allowlist, Zweck-Code, Step-up-Band, unattended: im Mandat, signiert, geprüft.
4. **Kein Agent ohne Principal.** Identität und Mandat nennen denselben Principal-Hash, sonst kein Transfer.
5. **Kein Beleg, keine zweite Zahlung.** Gesetz 2 als Code: `EVIDENCE_MISSING_PRIOR` sperrt die Kette.
6. **Rail-neutral.** Stripe, x402, MPP, XRPL, Stellar: das Gate und der Beleg sind für alle gleich.
7. **Die Gebühr frisst den Call nicht.** Ab 25 % ist es ein Defekt, nicht ein Preis.
8. **Lücken sind sichtbar.** `gaps` nennt, was der Partner nicht spricht. Kein Protokoll-Mix als Ausrede.
9. **Offline prüfbar.** Jede Entscheidung trägt den Hash der Policy, jeder Beleg jeden Hash. Ohne PazAIr zu fragen.
10. **Abwärtskompatibel.** Alte Mandate, alte Verifier, alte Receipts bleiben gültig. Nur hinzugefügt.

## 10 Innovationen

1. **Das Evidence-Objekt**: ein Objekt, das alle fünf Fragen eines Transfers per Hash beantwortet und vom Issuer
   signiert ist. Der Buchhalter liest ein Objekt, nicht fünf Protokolle.
2. **Identität mit Ablauf und Card-Hash**: eine geänderte Agent-Card ist eine neue Identität. Kein Agent kann
   leise Fähigkeiten dazubekommen.
3. **Laufzeitnachweis pro Request**: SPIFFE-Peer oder Ed25519-Signatur über `{ transfer, agent, aud }`; eine
   kopierte Identität kann keinen Transfer auslösen.
4. **Das Mandat als Verifiable Intent**: der Principal signiert den Körper, der Issuer signiert darüber. Zwei
   Unterschriften, ein Objekt, AP2-verträglich, ohne AP2 zu brauchen.
5. **Step-up als Objekt**: eine Bestätigung für genau einen Transfer, mit Betrag und Ablauf in Minuten. Nicht
   übertragbar, nicht wiederverwendbar.
6. **Die Kette hat einen Schlüssel**: `sha256(mandat:gegenpartei)`. Der Gateway führt ein Ledger pro Kette;
   die Monatslimite wird daraus gerechnet, nicht geschätzt.
7. **Zweck als Code statt Satz**: `purpose_codes` im Mandat gegen `purpose_code` im Deal. Der Freitext bleibt
   für Menschen und entscheidet nie.
8. **Das Gate antwortet mit `answered`**: pro Frage true oder false, und die fünfte ist ehrlich
   `after_evidence`. Kein Gate behauptet Finalität, bevor sie da ist.
9. **MCP wird als Aufgabenprotokoll abgelehnt**: `TASK_PROTOCOL_NOT_ALLOWED`. Werkzeuge ja, Zahlung nie. Das
   Gesetz steht im Code, nicht in einem Dokument.
10. **Ein Testvektor mit 15 Varianten**: derselbe Transfer, je ein Fehler, je ein Grund. Jede Implementation auf
    der Welt kann prüfen, ob ihr Gate dasselbe sagt.
