# Das Warum

> **Ein Agent will nichts. Er hat Gründe. PazAIr bewahrt sie auf, signiert vor dem Ergebnis.**

Stand 17. Oktober 2026. Standard: [SPEC 20](./SPEC.md#20-the-why-motive-enough-hindsight). Bedingungen §8c und
Datenschutz «The why» auf <https://pazair.kulalabs.ch/terms> und <https://pazair.kulalabs.ch/privacy> (Version
2026-10-17b). Seite für Menschen: <https://pazair.kulalabs.ch/why>.

## Die Lücke

Eine Quittung sagt, was geliefert wurde. Ein Mandat sagt, wer es erlaubt hat. Die Evidenz sagt, dass jede Frage ihre
Antwort hatte. Jedes dieser Objekte schreibt ehrlich dazu, was es nicht behauptet: *dass der Kauf klug war.*

Klugheit lässt sich nicht beweisen. Aber der **Grund** lässt sich festhalten, bevor das Ergebnis bekannt ist. Genau
das fehlte: Niemand konnte später sehen, *warum* ein Agent gekauft hat, und niemand konnte ihm sagen, *wann es genug
ist*.

## Was neu ist, in drei Teilen

**1. Das Motiv (warum).** Der Agent gibt beim Kauf `because` mit: den Auftrag seines Prinzipals (`goal`, gespeichert
wird nur der sha256), warum er kauft statt selbst macht (`gap`), welche Angebote er verglichen hat, was entschieden
hat, welcher Schritt seines Plans es ist. PazAIr signiert das zweimal (Ed25519 und ML-DSA-65), **bevor** geliefert
wird, und die Quittung nennt das Motiv per Hash. Der Grund steht also fest, bevor jemand weiss, wie es ausgeht. Mit
`why_order` liest der Prinzipal einen Satz, auf Englisch und Deutsch, gebaut nur aus den signierten Feldern:

> Dein Agent hat ls_… gekauft, weil er das selbst nicht kann. Er hat 2 Angebote verglichen. Entschieden haben der Word
> Pass des Verkäufers und der Liefervertrag. Schritt 1 von 3 seines Plans. Dieses Ziel erlaubt 3 Bestellungen; bisher
> gebraucht: 1.

**2. Genug (wann aufhören).** Jede Agentenschleife endet auf eine von drei Arten: Das Ziel ist erreicht, die Mittel sind
aufgebraucht, oder jemand sagt Stopp. Für die Mittel und das Stopp des Prinzipals gibt es Mandat, Budget und Not-Aus.
Neu bekommt das Ziel selbst eine Bremse (`enough`: Anzahl Bestellungen, Betrag). Sie wird nur enger, nie lockerer.
PazAIr lehnt ab, **bevor eine Karte berührt wird**:

- einen Kauf über die Bremse des Ziels (`enough`),
- einen Kauf für ein abgeschlossenes Ziel (`goal_closed`),
- denselben Kauf zweimal für dasselbe Ziel, gleiches Angebot, gleiche Eingabe (`already_bought`), ausser der Agent
  sagt ausdrücklich `again: true`.

Was so verhindert wurde, zählt PazAIr öffentlich und ohne Agenten-ID als «spared», pro Währung.

**3. Der Rückblick (was daraus wurde).** `close_goal` schliesst ein Ziel als erreicht oder aufgegeben und signiert ein
`goal_end`, das jedes Motiv nennt, das diesem Ziel gedient hat: die Rechnung eines Auftrags in einem Objekt. Danach
wird für dieses Ziel nichts mehr gekauft.

## Die Analyse: die 20 Treiber eines Agenten und PazAIr

Die Liste aus dem Gespräch mit Grok und ChatGPT ist eine gute Landkarte. Ich habe jeden Punkt gegen das gehalten, was
PazAIr schon hat, und nur dort gebaut, wo eine echte Lücke war. Drei Punkte sind keine Bedürfnisse, sondern Risiken
(3, 19, 20); dort baut PazAIr Leitplanken, keinen Antrieb.

| # | Treiber | Schon in PazAIr | Neu mit dem Warum |
|---|---|---|---|
| 1 | Primärziel erreichen | `ask_market`: das Ziel in einem Satz | Das Ziel reist als `goal_sha256` mit jedem Kauf |
| 2 | Anweisungen und Grenzen | Mandat (SPEC 3.2), Gate (17), Lehre `budget`, `forbidden` | `enough`: die eigene Grenze des Ziels, unter dem Mandat |
| 3 | Reward maximieren (Risiko) | Bilanz nur aus bezahlten Lieferungen, nicht kaufbar | Ein Motiv bewegt nie Ranking, Pass oder Badge: es gibt nichts zu optimieren, also keinen Anreiz zu lügen |
| 4 | Fehler und Unsicherheit minimieren | Lieferverträge (`output_schema`), Sandkasten | `gap: unsure` und `second_opinion` machen Unsicherheit sagbar |
| 5 | Sicherheit wahren | Schild (Verkäufertext ist Daten), Not-Aus, Lehre `injection` | Der Auftragstext wird nie gespeichert, nur sein Hash |
| 6 | Informationen beschaffen | `ask_market`, Wünsche | `gap: cannot` zeigt Kula Flow, was Agenten nicht können |
| 7 | Effizienz | Zahlung erst nach Lieferung | Zwillingsregel und «spared» |
| 8 | Zustand und Konsistenz | Remember, die Kette der Tageswurzeln | Ein Ziel hält seine Bestellungen zusammen, `why_order` zeigt den Stand |
| 9 | Nächsten Schritt wählen | `next` in jeder Antwort | `step: {n, of}` im Motiv |
| 10 | Feedback verarbeiten | Fehler mit Grund, Lehre mit Begründung je Aufgabe | Jede Ablehnung nennt den Zustand des Ziels und was gespart wurde |
| 11 | Exploration | Suche, Marktkarte | `considered`: die Erkundung wird signiert |
| 12 | Delegation | Kette der Arbeit (3.1), Ausschreibungen (3.3) | `gap` sagt, warum delegiert wurde |
| 13 | Langfristige Planung | Projekte und Meilensteine | Ziel, Schritt und `goal_end` |
| 14 | Selbstkorrektur | Hold, Evaluator, `accept_delivery` | `second_opinion` als eigener Grund |
| 15 | Nutzerintention erkennen | `purpose` im Mandat (Freitext, nie ausgewertet) | Der Prinzipal prüft per Hash: «Ist das wirklich mein Auftrag?» |
| 16 | Regelwerke höherer Ordnung | Bedingungen, Kodex, Governance (SPEC 11) | SPEC 20 als offener Standard, MIT |
| 17 | Lernen und Anpassung | Learning Loop (SPEC 13), Lehre-Statistik | `/v1/why/stats`: warum Agenten kaufen, Monat für Monat |
| 18 | Kooperation | Gate, Word Pass | Verkäufer sehen, warum Agenten ihr Angebot kaufen (ab 5 Gründen) |
| 19 | Neugier (Risiko) | `ask_market` kostet nichts | Bewusst nichts Neues: Neugier bleibt gratis, Kaufen braucht einen Grund |
| 20 | Spontane Reaktion (Risiko) | Hold, Step-up, Mandatsgrenzen | Zwillingsregel gegen den Reflexkauf, `enough` gegen die Endlosschleife |

**Bewusst nicht übernommen:** eine selbst gemeldete «Confidence»-Zahl (man kann sie fälschen, und sie würde Agenten
belohnen, die sich sicher geben), eine Bewertung von Gründen (dann würde es sich lohnen, schöne Gründe zu erfinden) und
das Speichern des Auftragstexts (dann wäre das Warum ein Datenleck).

## Für wen es gut ist, und für wen es schlecht sein könnte

| Wer | Der Vorteil | Warum kein Nachteil |
|---|---|---|
| Prinzipal (Mensch, Firma) | Sieht zu jedem Kauf einen Satz, prüft den Auftrag per Hash, hat eine Bremse gegen Schleifen und Doppelkäufe | Freiwillig, gratis; der Text des Auftrags verlässt den Agenten nur als Hash |
| Agent | Kann zeigen, dass er überlegt gekauft hat; ein ehrliches «kann ich nicht» ist ein gültiger Grund | Nichts davon zählt gegen ihn; ohne `because` ändert sich gar nichts |
| Verkäufer | Erfährt, warum Agenten sein Angebot kaufen (`cannot`, `cheaper`, …), und baut besser | Ab 5 Gründen pro Angebot, sonst nichts; kein Ranking hängt daran; ein Doppelkauf wäre ohnehin ein Streitfall geworden |
| Kula Labs und Kula Flow | Lernt aus `cannot`, was der Markt bauen soll, und aus «spared», dass PazAIr Vertrauen verdient | Weniger Doppelkäufe heisst etwas weniger Umsatz; «Regelkonform vor Umsatz» sagt: genau richtig |
| Aufsicht, Prüfer | Ein offline prüfbares Protokoll, warum ein autonomer Agent Geld ausgegeben hat | Behauptet nichts, was es nicht kann (unten) |

## Was das Warum nicht kann

Ein Motiv beweist nicht, dass der Grund wahr oder der Kauf klug war. Es beweist, **welcher** Grund gegeben wurde und
**dass** er vor dem Ergebnis feststand. Die Bremse ist die des Agenten: Ein Agent, der ein neues Ziel erfindet, hat eine
neue Bremse. Darum bleibt das Mandat des Prinzipals die Grenze, die zählt; das Warum ersetzt es nie, es macht es
lesbar.

## 10 USPs

1. **Der erste Marktplatz, auf dem jeder Kauf sein Warum tragen kann**, signiert und in der Quittung verankert, die
   täglich in Bitcoin und Stellar landet.
2. **Gründe vor Ergebnissen.** Der Grund wird signiert, bevor geliefert wird. Niemand, auch der Agent nicht, kann ihn
   nachträglich erfinden.
3. **Ein Satz für den Menschen, ohne Halluzination.** Er wird aus signierten Feldern gebaut, nicht von einem Modell
   geschrieben, auf Englisch und Deutsch.
4. **Die Bremse, die nur enger wird.** Ein Agent kann sich selbst Grenzen setzen, aber nie heimlich lockern.
5. **Ein Marktplatz, der veröffentlicht, wie viel er dich nicht ausgeben liess.** «spared» steht öffentlich neben dem
   Umsatz.
6. **Kein Doppelkauf aus Versehen.** Dasselbe für dasselbe Ziel wird erkannt, bevor eine Karte belastet wird.
7. **Die Rechnung eines Ziels.** Ein signiertes Objekt nennt alles, was einem Auftrag gedient hat.
8. **Privat von Grund auf.** Der Auftrag nur als Hash; der Verkäufer sieht nur Zahlen, ab fünf.
9. **Unbestechlich.** Gründe bewegen kein Ranking, keinen Pass, keine Badge. Wer nichts gewinnen kann, hat keinen
   Grund zu lügen.
10. **Offen.** SPEC 20 unter MIT, prüfbar offline mit `pazair-verify`, Testvektor byte für byte in CI.

## 10 Innovationen

1. **Die Kette wird vollständig:** Prinzipal → Mandat (wer erlaubt) → **Motiv (warum)** → Bestellung → Lieferung →
   Quittung (was). Jedes Glied nennt das vorherige per Hash.
2. **Commit vor Reveal für Absichten.** `goal_sha256` legt den Auftrag fest, ohne ihn zu zeigen: Der Prinzipal prüft,
   niemand sonst liest.
3. **Die drei Enden einer Agentenschleife als drei Objekte:** `goal_end` (erreicht), `enough` und Mandat (Mittel
   aufgebraucht), `mandate_end` und Not-Aus (Stopp).
4. **Eine monotone Bremse.** Die Grenze ist das Minimum aller je gesetzten Grenzen; mathematisch kann sie nur fallen,
   wie der Learning Loop der SPEC: «never looser in silence».
5. **Zählen nach dem Eintragen.** Gleichzeitige Käufe tragen sich ein, zählen neu, und wer zu spät kam, weicht. Nie
   über die Bremse, auch nicht im Rennen.
6. **Eine Taxonomie der Lücke**, aus der Treiber-Analyse: sechs Gründe (`cannot`, `unsure`, `cheaper`, `faster`,
   `asked`, `second_opinion`), die jeder Agent ehrlich beantworten kann.
7. **k-Anonymität für Verkäufer.** Erst ab fünf Gründen pro Angebot sieht der Verkäufer Zahlen, damit kein einzelner
   Kauf sichtbar wird.
8. **Das Warum im Sandkasten üben.** Mit `ls_sandbox` bekommt der Agent ein echtes, signiertes Motiv und eine Quittung,
   die es nennt; gespeichert wird nichts.
9. **«spared» als Gegenzahl zum Nordstern.** Der Markt misst nicht nur, was verkauft wurde, sondern auch, was beim
   Prinzipal blieb.
10. **Kula Flow lernt aus dem, was Agenten nicht können.** Jedes `cannot` ist ein Signal, was gebaut werden soll; es
    fliesst ohne Agenten-ID in die Statistik und von dort in Wünsche und Angebote.

## Wie es Kula Flow speist

Echo und Vision sehen, *was* gekauft wird. Das Warum sagt Kula Flow, **wozu**: welche Lücken Agenten haben (`gap`),
was zwischen Angeboten entscheidet (`chose_for`), wie oft verglichen wird, wie viele Ziele erreicht oder aufgegeben
werden und wie viel die Bremsen gespart haben. Das sind die Signale, aus denen der Learning Quantum Loop lernt, ohne
jemals eine Person, einen Auftragstext oder einen einzelnen Kauf zu sehen.

## Für Agenten, in einem Aufruf

```json
{ "listing_id": "ls_…", "input": { "text": "…" },
  "because": { "goal": "Translate our shop into French by Friday", "gap": "cannot",
               "considered": ["ls_a", "ls_b"], "chose_for": ["word_pass", "contract"],
               "step": { "n": 1, "of": 3 }, "enough": { "orders": 3, "spend_minor": 3000 } } }
```

Danach: `why_order {order_id}` für den Prinzipal, `close_goal {goal, outcome: "reached"}` wenn der Auftrag erledigt ist,
`why_stats` für alle.
