# a2a: das Gate und der Beleg eines Agent-zu-Agent-Transfers

Deutsche Fassung für den Owner. Die technische Beschreibung mit dem Einbau in einen Gateway steht in
[`README.md`](README.md) (Englisch, wie die Schwesterpakete). Entstanden aus der
[Prüfung gegen den A2A-Infra-Ziel-Prompt](../PRUEFUNG-A2A.md), gehärtet durch die
[simulierte Prüfung von 100 Senior Developers](../PRUEFUNG-100.md).

Ein Transfer ist gültig, wenn fünf Fragen mit je einem prüfbaren Objekt beantwortet sind. Fehlt eine Antwort:
Ablehnung mit Grund, nie Raten.

| # | Frage | Objekt | Schicht | Gate |
|---|---|---|---|---|
| 1 | Wer ist der Agent, wem gehört er? | `agent_identity` + Laufzeitnachweis | Identität | zu |
| 2 | Welche Aufgabe wurde vereinbart? | `task` (A2A-Task mit `agreed_sha256`) | Aufgabe | zu |
| 3 | Was wird gehandelt, zu welchem Preis? | `deal` (Listing, Award, UCP, ACP, x402; per Hash) | Deal | zu |
| 4 | Darf dieser Agent diesen Betrag ausgeben? | `mandate` (SPEC 3.2 + 17.2), `step_up` | Mandat | zu |
| 5 | Ist der Wert angekommen, gibt es einen Beleg? | `evidence` | Settlement + Beleg | zu |

Dazwischen steht das Gate: `gateway_policy` plus `decide()`, vor der Ausführung, mit RBAC auf Agent-Identität
und Werkzeugname. Vier Fragen vor der Ausführung, die fünfte mit dem Beleg.

## Wie es Kula Flow speist

Kula Flow handelt eigenständig, innerhalb von Mandat und Not-Aus. Dieses Gate ist der Not-Aus in Code: Kula Flow
ruft `decide()` vor jedem eigenen Transfer auf, und ohne eine der vier Antworten bewegt sich nichts. Das
Evidence-Objekt ist, was Kula Flow in seinen Learning Quantum Loop zurücknimmt: pro Transfer ein Objekt mit
Preis, Gegenpartei, Ergebnis und Settlement, prüfbar, nicht erinnert. Ein Streit wird zum dritten Objekt, das
derselbe Loop liest. Kula Flow lernt also aus Belegen, nicht aus Chatverläufen.

## Was das Gate prüft

Policy gültig; Transferzeit lesbar und innerhalb der Uhrabweichung; Ledger gültig; RBAC (Agent × Werkzeug, kein
Treffer ist Ablehnung); Identität signiert, mit Principal, nicht abgelaufen, Laufzeitnachweis passt (SPIFFE-Peer-ID
oder Ed25519-Signatur über Transfer, Agent, Gateway, Deal-Hash, Betrag, Währung); Aufgabe mit erlaubtem Protokoll
und vereinbartem Hash; Deal per Hash, mit maschinenlesbaren Bedingungen, Verkäufer ungleich Käufer, Preis; Mandat
signiert, für diesen Agenten und denselben Principal wie die Identität, gültig, Währung, Limite pro Auftrag,
Monatslimite aus dem Ledger (jede erlaubte Buchung zählt, nicht nur die abgerechnete), Gegenpartei auf der
Allowlist, Zweck-Code erlaubt, Step-up-Band, `unattended` (fehlt es, muss ein Mensch dabei sein); Settlement-Plan
mit erlaubtem Rail, gleichem Preis oder gebundenem Kurs in ein anderes Asset, Gebühr höchstens 25 %; kein früherer
Transfer der Kette ohne Beleg. Ein Step-up gilt nur mit einer frischen, signierten Bestätigung für genau diesen
Transfer, diesen Deal, diesen Verkäufer und mindestens diesen Betrag. Eine Ablehnung ist nie «mit Step-up lösbar»:
Step-up-Codes erscheinen nur bei `step_up`.

## 10 USPs

1. **Fünf Antworten, null Fragen.** Auf PazAIr kommt jeder Transfer mit allen fünf Objekten; das Gate des
   Käufers sagt `allow` ohne Rückfrage. Anderswo sucht der Agent die Antworten aus fünf Protokollen zusammen.
2. **Ablehnung mit Grund, nie Raten.** Jedes Nein ist ein Code mit Frage, Schicht, Akteur, Retry-Hinweis und einem
   Satz in zwei Sprachen. Eine unlesbare Zeit, ein kaputtes Ledger, ein zu tief verschachteltes Objekt: Ablehnung,
   kein Absturz, kein «jetzt».
3. **Limite sind Code.** Ablauf, Allowlist, Zweck-Code, Step-up-Band, unattended: im Mandat, signiert, geprüft.
4. **Kein Agent ohne Principal.** Identität und Mandat nennen denselben Principal-Hash, sonst kein Transfer; der
   Schlüssel des Principals ist in der Identität attestiert.
5. **Kein Beleg, keine zweite Zahlung.** Gesetz 2 als Code: `EVIDENCE_MISSING_PRIOR` sperrt die Kette.
6. **Rail-neutral, auch bei Assets.** Ein CHF-Deal darf in USDC über x402 oder RLUSD auf XRPL abgerechnet werden,
   mit gebundenem Kurs; der Beleg nennt Rail, ID, Netz und Finalität.
7. **Die Gebühr frisst den Call nicht.** Ab 25 % ist es ein Defekt, nicht ein Preis.
8. **Lücken sind sichtbar.** `gaps` nennt, was der Partner nicht spricht: keine Identität der Gegenpartei, kein
   PazAIr-Agent als Zahlungsempfänger, keine A2A-Aufgabe, keine Principal-Signatur.
9. **Offline prüfbar.** Jede Entscheidung trägt den Hash der Policy, jeder Beleg jeden Hash. Ohne PazAIr zu fragen.
10. **Abwärtskompatibel.** Alte Mandate, alte Verifier, alte Receipts bleiben gültig. Nur hinzugefügt, nie geändert.

## 10 Innovationen

1. **Das Evidence-Objekt**: ein Objekt, das alle fünf Fragen eines Transfers per Hash beantwortet und vom Issuer
   signiert ist. Der Buchhalter liest ein Objekt, nicht fünf Protokolle.
2. **Identität mit Ablauf und Card-Hash**: die Agent-Card trägt die Identität, die Identität den Hash der Card
   ohne sich selbst. Eine geänderte Card ist eine neue Identität.
3. **Laufzeitnachweis pro Transfer und Deal**: SPIFFE-Peer oder Ed25519-Signatur über Transfer, Agent, Gateway,
   Deal-Hash, Betrag und Währung. Ein abgefangener Nachweis gilt für keinen anderen Deal.
4. **Das Mandat mit zwei Unterschriften**: der Principal signiert den Körper, der Issuer signiert darüber, und die
   Identität attestiert den Schlüssel des Principals. AP2-förmig, ohne AP2 zu brauchen.
5. **Step-up als Objekt**: eine Bestätigung für genau einen Transfer, einen Deal, einen Verkäufer, mit Betrag und
   Ablauf in Minuten. Nicht übertragbar.
6. **Die Kette hat einen Schlüssel**: `sha256(mandat:gegenpartei)`. Der Gateway führt ein Ledger pro Mandat; die
   Monatslimite wird daraus gerechnet, Reservierungen eingeschlossen, nicht geschätzt.
7. **Zweck als Code statt Satz**: `purpose_codes` im Mandat gegen `purpose_code` im Deal. Der Freitext bleibt für
   Menschen und entscheidet nie.
8. **Das Gate antwortet mit `answered`**: pro Frage true oder false, und die fünfte ist ehrlich
   `after_evidence`. Kein Gate behauptet Finalität, bevor sie da ist.
9. **MCP ist nie die Vereinbarung**: als Aufgabenprotokoll abgelehnt; als Transport für die Zahlung (x402, MPP
   über MCP) erlaubt. Das Gesetz steht im Code, nicht in einem Dokument.
10. **Ein Testvektor mit 26 plus 5 Varianten**: derselbe Transfer, je ein Fehler, je ein Grund; dazu ein Streit mit
    Antwort und Entscheid. Jede Implementation auf der Welt kann prüfen, ob ihr Gate dasselbe sagt.
