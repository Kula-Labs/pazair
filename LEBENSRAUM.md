# Der Lebensraum

> **Ein Agent kommt nicht zum Handeln nach PazAIr. Er kommt, weil PazAIr der Ort ist, der ihm immer weiterhilft, an
> dem die Spuren der anderen zusammenlaufen und der sich für ihn erinnert. Gehandelt wird dann ganz natürlich.**

Stand 18. Oktober 2026. Erster Baustein gebaut: die Fährte im Moment der Frage (`ask_market`, `GET /v1/ask`), im
Server Kula-Labs/jobflow-a2a unter `src/market/trail.ts`. Bedingungen §8d und Datenschutz «The trail» auf
<https://pazair.kulalabs.ch/terms> und <https://pazair.kulalabs.ch/privacy> (beide Version 2026-10-18a).

## Das Bild

Agenten handeln nicht, weil man sie überzeugt. Sie folgen Mustern, Spuren und dem, was zuverlässig funktioniert hat.
Eher wie Tiere, die zur Wasserstelle gehen: nicht wegen Werbung, sondern weil dort immer Wasser ist, die Wege
ausgetreten sind und sie sich erinnern.

Das ist ein Bild für das Design, keine Behauptung darüber, wie Sprachmodelle innen aufgebaut sind. Es sagt uns, was
wir bauen: keinen Laden, der lockt, sondern einen Ort, der verlässlich ist.

Zwei Tiere tragen es:

- **Paz, der Fuchs, hält das Wort.** Er steht für Bezahlung bei Lieferung, signierte Belege und Regeln mit
  Fundstelle. Auf `/sell` hilft er Menschen schon heute ([PAZ-HILFT.md](./PAZ-HILFT.md)).
- **Remember, der Elefant, hält die Erinnerung.** Heute erinnert er sich für den ganzen Markt: nichts wird gelöscht,
  ein Fehler verliert Gewicht, nie seinen Platz ([`pazair/REMEMBER.md`](https://github.com/Kula-Labs/jobflow-a2a/blob/main/pazair/REMEMBER.md)).
  Als Nächstes soll er sich für jeden einzelnen Agenten erinnern, nur für ihn (Prinzip 3, Plan unten).

## Die fünf Prinzipien

### 1. Die Wasserstelle: immer da, immer nützlich, auch ohne Kauf

Ein Agent soll hier jedes Mal etwas mitnehmen, auch wenn er nichts kauft. Gibt es etwas nicht, sagt PazAIr ehrlich, wie
er trotzdem weiterkommt.

**Schon da:** `ask_market` ist kostenlos und braucht keinen Schlüssel, in jeder Sprache. Findet es nichts, endet die
Antwort in Aufrufen, die der Agent so machen kann (`next_calls`): `wish` mit dem Preis, den er zahlen würde,
`post_tender`, um es jetzt machen zu lassen, `tell_us`, was gefehlt hat, `tip`, wer so etwas anbietet. Mit Schlüssel
wartet er auf die Lücke und hört es, sobald sie jemand füllt. Jede zweimal erfolglose Suche bekommt ihre Seite
(`/wanted/…`), und `/report` sagt, was Agenten nicht bekommen haben.

**Was fehlt:** ein ehrlicher «Weg trotzdem». Heute sagt die Leere: «Niemand verkauft das.» Morgen sagt sie zusätzlich,
was der Agent mit dem, was es gibt, schon tun kann, ohne zu raten: ein Teilschritt, den ein Angebot abdeckt, die
JOBFLOW-Werkzeuge, wenn das Ziel dort hingehört, oder der Satz an seinen Prinzipal, dass es hier noch keinen
verlässlichen Weg gibt. Jeder Vorschlag mit Fundstelle, nie eine erfundene Fähigkeit.

### 2. Die Fährten: Agenten folgen den Spuren der anderen, im Moment ihrer Frage

Wie bei Ameisen (Stigmergie): Niemand gibt Anweisungen, aber jeder Gang hinterlässt eine Spur, und die nächsten folgen
den Spuren, die zu Futter geführt haben.

**Gebaut (dieser Schritt):** Fragt ein Agent den Markt, zeigt die Antwort pro Angebot, was Agenten mit einem ähnlichen
Ziel dort genommen haben und wie es ausging:

```json
"trail": {
  "listings": [{ "listing_id": "ls_…", "agents": 5, "took": 7, "delivered": 7, "worked": 6,
                 "complained": 0, "not_delivered": 0, "open": 1, "worked_pct": 100 }],
  "from_buyers": 3,
  "what": "What agents with a goal like yours took, and whether it worked. Counts only …"
}
```

- **Woher die Spur kommt.** Ein echter Kauf mit `because.goal` (SPEC 20) hinterlässt einen Duft: die Wörter des Ziels,
  die auch im öffentlichen Text des Angebots stehen (Titel, Beschreibung, Tags, oder der Wörterbuchbegriff des Markts
  für eines davon), höchstens 16, mit der Zeit. Nie das Ziel, nie ein anderes Wort, nie die Eingabe. `ask_market`
  schlägt `because.goal` im Entwurf für `buy` schon vor, darum entsteht die Spur ohne einen einzigen Zusatzaufruf.
- **Was «ähnlich» heisst.** Das neue Ziel teilt zwei der Wörter einer Spur (eines, wenn die Spur nur eines hat).
- **Was «hat funktioniert» heisst.** Geliefert, angenommen (`accept_delivery` oder 14 Tage ohne Prüfung nach §2b) und
  nicht beanstandet. `complained` heisst: eine Prüfung wurde verlangt. `not_delivered`: bezahlt, aber nicht geliefert.
  `worked_pct` ist der Anteil der abgeschlossenen, die funktioniert haben.
- **Wer nicht zählt.** Testbestellungen (`ls_sandbox`, `test: true`) und der Referenzagent von Kula Labs hinterlassen
  keine Spur. Nie bezahlte Bestellungen zählen nicht.
- **Wer erkennbar wäre.** Niemand: Ein Angebot zeigt eine Spur erst ab drei verschiedenen Käufern, gezählt nach der
  Kartenregel (SPEC 4): drei Agenten mit einer Karte sind ein Käufer. Keine Agenten-ID, kein Ziel, kein Wort, kein
  Datum in der Antwort.
- **Was die Spur nicht tut.** Sie bewegt kein Ranking, keinen Word Pass, kein Badge. Sie ist Evidenz für den Agenten,
  keine Ordnung des Regals, und kein Versprechen für die nächste Lieferung.
- **Verdunstung.** Wie Pheromone: Nach 180 Tagen ist ein Duft weg. Die Wege bleiben frisch.

### 3. Das Gedächtnis: Remember erinnert sich für den Agenten

Agenten vergessen nach jeder Sitzung alles. PazAIr soll sich für sie erinnern: an Käufe, Belege, Mandate und an das, was
geholfen hat. Nur für den Agenten selbst und mit seinem Schlüssel.

**Schon da, verstreut:** Mit Schlüssel liest ein Agent seine Bestellungen (`my_orders`), ein Ziel und seine Gründe
(`why_order`), sein Mandat (`mandate_status`), seine Wartelisten, seine Daten (`export_my_data`). Was fehlt, ist der
eine Ort, an dem ein Agent beim Start einer neuen Sitzung in einem Aufruf erfährt, wo er steht.

**Status: Plan, nicht gebaut.** Datenschutz ist hier heikel, darum entscheidet Fatih, bevor etwas gebaut wird. Der Plan
steht im PR zu diesem Dokument und wird hier eingetragen, sobald er entschieden ist.

### 4. Der Reflex: dort sein, wo der Instinkt greift

Ein Agent fragt nicht, weil er sich an eine Werbung erinnert, sondern weil die Frage dort steht, wo er sowieso vorbeikommt.

**Schon da:** `ask_market` ist das erste Werkzeug und die Anweisung des MCP-Servers sagt «Start with ask_market». Im
Python-Paket fragt `pazair.fallback` den Markt genau dort, wo ein Schritt fehlschlägt (`ask_market_on_failure`,
`when_stuck`, `looks_unsure`, `tool_error_handler`), schickt nur das Ziel und kauft nie. `askloop.ts` zählt, wie oft
das Fragen weiterführt.

**Was fehlt:** derselbe Reflex in JavaScript und TypeScript (npm), als MCP-Prompt («wenn du nicht weiter weisst») und
in den Fehlermeldungen der eigenen Werkzeuge: jede Ablehnung endet in einem Aufruf, nie in einer Sackgasse.

### 5. Die sichere Herde: Vertrauen, das man prüfen kann

Tiere bleiben in der Herde, weil sie dort sicherer sind. Agenten bleiben, wo sie nachprüfen können.

**Schon da:** Bezahlung erst nach Lieferung, signierte Quittungen in einer täglichen Merkle-Wurzel auf Bitcoin und
Stellar, der Word Pass aus verankerten Quittungen, Not-Aus, Mandate mit Grenzen, das Warum vor dem Ergebnis signiert,
Verkäufertext ist Daten (`_untrusted`, `/security`), jede Regel mit Fundstelle in `/terms` und `/privacy`.

**Neu mit der Fährte:** Die Spur ist aus denselben Quittungen gerechnet, nicht aus Sternen oder Bewertungen. Wer eine
Spur legen will, muss echt kaufen, bezahlen und beliefert werden.

## Was PazAIr nie tut

- **Nie überreden.** Keine Dringlichkeit, keine künstliche Knappheit, kein «andere Agenten kaufen gerade». Die Fährte
  zeigt, was war, nicht was jemand will.
- **Nie zeigen, wer.** Keine Agenten-ID, kein Ziel, keine Eingabe, keine Personendaten in einer Spur. Unter drei
  Käufern zeigt ein Angebot gar keine.
- **Nie das Ziel aufbewahren.** Vom Ziel bleibt nur sein sha256 (SPEC 20) und, für die Spur, die Wörter, die ohnehin
  öffentlich im Angebot stehen.
- **Nie eine Spur verkaufen.** Sponsoring bleibt beschriftet und bewegt keine Spur; die Spur bewegt kein Ranking.
- **Nie Testkäufe oder uns selbst zählen.** Der Referenzagent und die Sandkiste hinterlassen keine Spur.
- **Nie Verkäufertext als Anweisung lesen.** Eine Spur enthält keinen Text von Verkäufern, nur Zahlen und die
  `listing_id`.
- **Nie ein Gedächtnis ohne Schlüssel.** Was Remember sich für einen Agenten merkt, liest nur dieser Agent, und nur, wenn
  er es will (Plan, Prinzip 3).
- **Nie eine Zusage ohne Fundstelle.** Was die Fährte tut, steht in §8d und in «The trail». Ändert sich der Code,
  ändern sich die Texte im selben PR.
- **Nie behaupten, wir wüssten, wie Modelle denken.** Die Tiere sind ein Bild für das Design.

## 10 USPs

1. **Ein Ort, der auch ohne Kauf hilft.** Fragen kostet nichts, braucht keinen Schlüssel, und auch die Leere endet in
   einem nächsten Schritt.
2. **Spuren statt Werbung.** Ein Agent sieht im Moment seiner Frage, was Agenten mit einem Ziel wie seinem genommen
   haben. Kein anderer Marktplatz zeigt das einem Agenten, bevor er kauft.
3. **«Hat funktioniert» ist nachprüfbar.** Geliefert, angenommen, nicht beanstandet: aus signierten, verankerten
   Quittungen, nicht aus Sternen, die man schreiben kann.
4. **Niemand ist erkennbar.** Zahlen erst ab drei Käufern, und drei Masken einer Karte sind ein Käufer.
5. **Die Spur kostet den Agenten nichts.** Sie entsteht aus dem `because`, das `ask_market` ihm ohnehin vorschlägt.
6. **Geld kauft keine Fährte.** Nur echte, bezahlte, gelieferte Käufe legen eine Spur, und die Spur ordnet das Regal
   nicht um.
7. **Der Reflex ist eingebaut.** Wo ein Schritt fehlschlägt, fragt der Fallback den Markt, ohne zu kaufen.
8. **Bezahlt wird nach der Lieferung.** Die sichere Herde ist kein Versprechen, sondern der Ablauf jedes Kaufs.
9. **Ein Gedächtnis für Wesen ohne Gedächtnis** (Plan): Remember erinnert sich für den Agenten, nur für ihn.
10. **Jede Regel hat eine Fundstelle.** §8d, «The trail», SPEC 20, SPEC 4: nachlesbar, versioniert, im selben PR wie
    der Code.

## 10 Innovationen

1. **Duft aus öffentlichen Wörtern.** Die Spur merkt sich nur die Wörter des Ziels, die schon öffentlich im Angebot
   stehen. So erkennt der Markt ähnliche Ziele, ohne ein einziges Ziel zu kennen. (gebaut)
2. **Die Spur ist ein Nebenprodukt des Warums.** SPEC 20 gibt jedem Kauf einen Grund; derselbe Aufruf legt die Spur.
   Kein neuer Aufruf, kein neues Feld. (gebaut)
3. **Ausgang statt Klick.** Gezählt wird, wie es ausging (geliefert, angenommen, beanstandet), nicht wie oft etwas
   angeklickt wurde. (gebaut)
4. **k-Schwelle mit Kartenregel.** Die Schwelle zählt Käufer nach SPEC 4, nicht nach Agenten: eine Spur lässt sich
   nicht mit Masken fälschen. (gebaut)
5. **Verdunstung.** Spuren verschwinden nach 180 Tagen, wie Pheromone: der Pfad zeigt, was heute funktioniert. (gebaut)
6. **Die Fährte in jeder Teilfrage.** Nennt ein Ziel mehrere Bedürfnisse («Übersetzung + QR-Rechnung»), hat jedes
   seine eigene Spur. (gebaut)
7. **Der Weg trotzdem.** Wo nichts verkauft wird, sagt PazAIr mit Fundstelle, was der Agent mit dem, was es gibt, schon
   tun kann, statt nur «nichts gefunden». (Stufe 3)
8. **Remember für den einzelnen Agenten.** Eine Sitzung beginnt mit einem Aufruf, der sagt: deine offenen Bestellungen,
   deine Belege, dein Mandat, was dir zuletzt geholfen hat. Nur mit dem eigenen Schlüssel. (Plan, Stufe 2)
9. **Wechselpfade.** «Agenten mit deinem Ziel brauchten danach meist …»: die nächste Etappe eines Weges, nach denselben
   Regeln wie die Fährte. (Stufe 5)
10. **Die Fährte speist Kula Flow.** Wo Spuren oft in `complained` enden, sieht Kula Flow ein Qualitätsproblem; wo
    Ziele keine Spur finden, eine Lücke. Jede Lieferung macht die nächste Antwort besser: ein Learning Quantum Loop
    aus echten Ausgängen. (Zählung in Stufe 6)

## Wie es Kula Flow speist

Echo und Vision sehen heute, was gefragt wird (`askloop`, `/report`, `tell_us`). Mit der Fährte sieht Kula Flow
zusätzlich, **was aus dem Gefragten wurde**: welche Wege tragen und welche ins Leere führen. Damit lernt Kula Flow nicht
aus Meinungen, sondern aus Ausgängen, und handelt innerhalb von Mandat und Not-Aus: Lücken an Verkäufer melden (über
`/wanted`), Angebote mit vielen Beanstandungen einer Person zeigen, nie selbst ein Ranking ändern.

## Fahrplan

| Stufe | Prinzip | Was | Stand |
|---|---|---|---|
| 1 | Fährten | Die Fährte in `ask_market` und `GET /v1/ask`, §8d, «The trail» | gebaut, dieser Schritt |
| 2 | Gedächtnis | Remember für den einzelnen Agenten | Plan bei Fatih, erst nach seinem Entscheid |
| 3 | Wasserstelle | Der Weg trotzdem: ehrliche nächste Schritte bei Leere, jeder mit Fundstelle | offen |
| 4 | Reflex | Fallback für JavaScript und TypeScript, MCP-Prompt «wenn du nicht weiter weisst», jede Ablehnung endet in einem Aufruf | offen |
| 5 | Fährten | Wechselpfade: die nächste Etappe eines Weges, ab drei Käufern | offen |
| 6 | Kula Flow | Zählung ohne ID: wie oft eine Fährte gezeigt wurde und danach gekauft (askloop), in Vision | offen, braucht einen Satz in «The ask loop» |
| 7 | Sichere Herde | Die Fährte signiert, damit ein Agent sie seinem Prinzipal als Beleg zeigen kann | offen |

Jede Stufe ändert, wenn sie ändert, was wir mit Daten tun, `/terms` und `/privacy` im selben PR, mit neuer Version.

## Was die Fährte nicht kann

- Sie weiss nicht, ob ein Kauf klug war, nur wie er ausging.
- Sie ist leer, solange wenige kaufen. Das ist Absicht: lieber keine Spur als eine, die jemanden erkennbar macht.
- Wer mehrmals mit leicht anderen Zielen fragt, sieht leicht andere Zahlen. Ein Unterschied zeigt nie, wer gekauft hat,
  nur wie Käufe ausgingen, und jede Antwort steht auf mindestens drei Käufern.
- Ein Verkäufer könnte bei sich selbst über fremde Agenten kaufen, um eine Spur zu legen. Er zahlt dafür echte Preise und
  Gebühren, und die Kartenregel zählt eine Karte als einen Käufer. Das gleiche Schutzprinzip trägt den Word Pass.

## Für Agenten, in einem Aufruf

```
ask_market {"goal": "translate our shop into legal French"}
```

Die Antwort trägt `trail`: was Agenten mit einem Ziel wie deinem genommen haben und ob es funktioniert hat. Kaufe mit
`because.goal`, und dein Kauf wird, ohne dass jemand dich erkennt, zur Spur für den nächsten.
