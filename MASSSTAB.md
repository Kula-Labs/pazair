# Der Massstab

Gilt ab dem 14. Oktober 2026, nach dem ersten Audit von PazAIr: ODIN Ω mit The Last Commit, und das Visual-Gremium,
das Jobflow abgenommen hat und sich bereit erklärt hat, auch PazAIr zu prüfen. Bericht: [`PRUEFUNG-ODIN-VISUAL.md`](PRUEFUNG-ODIN-VISUAL.md).

> **Was PazAIr zeigt, ist wahr, lesbar und mit dem Daumen erreichbar. Eine Maschine misst es, bei jedem Commit.**

## Die Sperrklinke

Ein Massstab, den nur Menschen prüfen, sinkt mit dem ersten müden Abend. Darum misst ihn eine Maschine:

- **Dieses Repository:** `standard/check.mjs` rendert jede Seite aus `examples/` in einem echten Browser, bei 390 und
  1440 px, dunkel und hell, ohne Netz, und prüft die Marken in `brand/`. Ein einziger Befund lässt CI scheitern
  (Job `standard` in `.github/workflows/test.yml`).
- **Die Live-Seite:** `node standard/check.mjs --live` legt dieselben Zahlen an pazair.kulalabs.ch an. Das ist ein
  Bericht für den Owner, kein CI-Gate, denn die Seite kommt aus einem anderen Repository.
- **Der Server** (`Kula-Labs/jobflow-a2a`): `tests/audit-2026-10-14.test.ts` hält für jeden behobenen Befund einen
  Schliesstest.

Eine Zahl darf steigen. Sinken darf sie nur mit einem Owner-Entscheid, der hier mit Datum und Grund steht. Ein
Commit, der still eine Zahl senkt, wird nicht gemergt.

### Entscheide

- **14. Oktober 2026, gleichwertiges Ziel (WCAG 2.5.8, Ausnahme «Equivalent»).** Ein Ziel unter der Grenze darf
  bleiben, wenn die Seite ein Gegenstück nennt (`data-equivalent="<id>"`) und der Prüfer nachweist: es existiert, es
  wird gezeigt, es führt auf dieselbe Adresse und ist selbst gross genug. Fehlt eines davon, bleibt es ein Befund.
  Grund: Die Ladenfassaden in der perspektivischen Zeichnung von `/market` sind Maus-Abkürzungen (nicht per Tastatur
  erreichbar) zu Ständen, die weiter unten auf derselben Seite daumengross stehen; sie grösser zu zeichnen, zerstört
  die Perspektive. `standard/selftest.mjs` beweist bei jedem Commit, dass nur ein echtes Gegenstück zählt. Der Prüfer
  nimmt damit etwas an, was er vorher ablehnte; darum steht es hier. Auftrag des Owners am 14. Oktober: «ja mach das
  alles» (die Folgepunkte des Audits, `/market` auf dem Handy darunter).

## Die Zahlen

Jede Zahl kann ein Dritter nachmessen. Keine davon ist Geschmack.

| Was | Grenze | Woher |
|---|---|---|
| Kontrast Text | mindestens 4.5:1 | WCAG 2.2 AA, 1.4.3 |
| Kontrast grosser Text (ab 24 px, fett ab 18.66 px) | mindestens 3:1 | WCAG 2.2 AA, 1.4.3 |
| Kontrast Marken und Statuszeichen | mindestens 3:1 | WCAG 2.2 AA, 1.4.11 |
| Tippziele (Knöpfe, Felder, Menüs, alleinstehende Links, auch allein in einer Tabellenzelle) | mindestens 44 × 44 px auf dem Handy (390 px), 24 × 24 px mit Maus (1440 px) | Daumen; WCAG 2.2 AA 2.5.8; Links im Fliesstext sind ausgenommen, ebenso ein kleines Ziel mit nachgewiesenem Gegenstück (siehe Entscheide) |
| Kleinste Schrift, die jemand lesen muss | 12 px | Feld, Handy, abends |
| Breite bei 390 px | nichts ragt über den Rand, nichts wird abgeschnitten | ein Handy ohne Querscrollen |
| Aufbau | `lang`, `<title>`, Viewport, genau ein `<main>`, genau ein `<h1>` | Screenreader, Suche |
| Formulare | jedes Feld hat ein Label | Screenreader |
| Drittanbieter | keine Anfrage an fremde Hosts (Schriften, Tracker) | Datenschutz, Offline |
| Dunkel für alle | jede Seite startet dunkel, auch wenn das System des Lesers hell meldet; hell nur auf ausdrückliche Wahl | Owner-Entscheid, 14. Oktober 2026 |

**Dunkel für alle** (Owner, 14. Oktober 2026). Jede Seite wird dunkel gestaltet, dunkel abgenommen und startet dunkel,
was auch immer das System des Lesers meldet. Hell gibt es nur auf ausdrückliche Wahl: ein Schalter in der Leiste, die
Wahl auf dem Gerät gemerkt (`pazair-theme`) und vor dem ersten Bild angewendet. Die helle Fassung hält dieselben
Zahlen. Der Prüfer misst jede Ansicht mit einem System auf hell: dunkel muss trotzdem dunkel sein, hell erst nach der
Wahl.

## Die sechs Sichtregeln für PazAIr

Übertragen aus dem Visual Master Audit V3 des Gremiums, das Jobflow abgenommen hat. Jobflow sperrt eine Rechnung, bis der Beweis vollständig ist. PazAIr sperrt
eine Behauptung, bis ihr Beleg sichtbar ist.

| Regel | Was verletzt sie | Stufe |
|---|---|---|
| **G1 Wahrheit** | Ein grünes Licht, «live», «verified» oder eine Zahl, deren Beleg genau diese Aussage nicht deckt. Eine Demo, die nicht als Beispiel markiert ist. Eine abgeschaltete Funktion, die irgendwo angeboten wird. | V0 |
| **G2 Blickfang** | Der erste Blick auf einer Kernseite fällt auf Dekoration statt auf das, was man tun kann: fragen, verbinden, verkaufen, prüfen. | V1 |
| **G3 Ein Gesicht** | Seiten mit eigener Leiste, eigenem Fuss oder eigenen Farbwerten statt der gemeinsamen. Eine Seite, die hell startet. | V2; der dunkle Standard V1 |
| **G4 Formular** | Ein Feld ohne Namen, ein Haken ohne Inhalt, eine Zusage ohne Fundstelle in `/terms`. | V1 |
| **G5 Leer und Fehler** | Ein Zustand, der nicht sagt, was fehlt und was zu tun ist. Rohes JSON für einen Menschen, der einen geteilten Link öffnet. | V2 |
| **G6 Daumen** | Auf 390 px ist die nächste Handlung nicht erreichbar, ein Ziel ist unter 44 px, oder Text wird abgeschnitten. | V1 |

Die Stufen: V0 lügt oder ist unbenutzbar · V1 schwerer Bruch · V2 spürbare Inkonsistenz · V3 Detail · V4 steht, hält
aber von Meisterschaft ab. Daraus folgt das Urteil, ohne Verhandlung: Gibt es ein V0, wird nichts freigegeben. Ein V1
gibt nur mit Sperre frei, und die Sperre nennt die Regel. MASTERCLASS gibt es nur ohne V0 bis V2 und mit bestandenem
3-Sekunden-Test, gerendert auf einem Handy.

## Die Wahrheitsregeln

Aus der Verfassung von ODIN Ω, angewandt auf das, was PazAIr sagt:

1. Gebaut, deployt, live, genutzt und bewiesen sind fünf Zustände. Eine Seite nennt den, der stimmt.
2. Ist eine Funktion abgeschaltet, steht sie nirgends als Angebot: nicht auf der Seite, nicht im README, nicht in
   `llms.txt`, nicht in einer Werkzeugbeschreibung.
3. Was Kula Labs bei Kula Labs kauft, wird getrennt gezählt und nie als Nachfrage gezeigt (siehe [`ERSTE-ZEHN.md`](ERSTE-ZEHN.md)).
4. Jede Zahl auf einer Seite kommt aus einer Quelle, die ein Agent selbst abfragen kann.
5. Jede Zusage an Verkäufer, Käufer oder Partner hat eine Fundstelle in den Bedingungen.

## So wird geprüft

```bash
cd standard && npm ci     # einmal: playwright-core, ohne Browser-Download; es nimmt das Chrome der Maschine (CHROME_PATH)
node check.mjs            # examples/ und brand/; Befunde auf stdout, Exit 1 bei jedem Befund
node check.mjs --live     # dieselben Zahlen an pazair.kulalabs.ch
node check.mjs --json     # ein JSON-Dokument, zum Beispiel für Kula Flow
node selftest.mjs         # der Prüfer prüft sich selbst: ein echtes Gegenstück zählt, drei falsche nicht
```

## Wie das Kula Flow speist

`check.mjs --live --json` ist ein Signal, das Vision täglich lesen kann: eine Liste von Befunden mit Seite, Regel,
Ansicht und Messwert. Kula Flow lernt daraus, welche Änderung eine Zahl verschlechtert hat, bevor ein Mensch es
bemerkt. Handeln darf es nur innerhalb von Mandat und Not-Aus, und das heisst hier: einen Fix vorschlagen, nicht
selbst deployen.

## 10 USPs

1. **Gemessen statt gefunden.** Jede Aussage über das Aussehen ist eine Zahl, die ein Dritter nachmessen kann.
2. **Ein Gate für Behauptungen.** PazAIr zeigt kein grünes Licht ohne den Beleg, der genau dieses Licht deckt.
3. **Abgeschaltet heisst unsichtbar.** Eine Funktion, die Recht oder Owner pausiert haben, verschwindet aus jedem Text.
4. **Eigengeschäft getrennt.** Was der Betreiber bei sich selbst kauft, zählt nie als Nachfrage.
5. **Gerendert, nicht vermutet.** Geprüft wird im echten Browser, bei 390 und 1440 px, dunkel zuerst, dann hell.
6. **Offline-fest.** Die Beispielseiten müssen ohne Netz stehen; eine Anfrage an fremde Hosts ist ein Befund.
7. **Der Daumen als Einheit.** 44 px sind keine Empfehlung, sondern eine Grenze, die CI durchsetzt.
8. **Ein Befund, ein Schliesstest.** Jeder behobene Befund lässt einen Test zurück, der ihn nie wieder zulässt.
9. **Derselbe Massstab live.** Ein Befehl legt die CI-Zahlen an die laufende Seite an.
10. **Senken braucht einen Namen.** Eine Grenze sinkt nur mit Owner-Entscheid, datiert und begründet in dieser Datei.

## 10 Innovationen

Stand 15. Oktober 2026, 14:53 UTC: Die Punkte 1, 2, 4, 5 und 9 betreffen den Server, ebenso «dunkel für alle». Sie
sind live (`Kula-Labs/jobflow-a2a#232`, Folgepunkte in `#233`), nachgemessen im
[Bericht, Teil III](PRUEFUNG-ODIN-VISUAL.md#teil-iii-nachmessung-nach-dem-deploy): 10 Befunde, 13 von 14 Seiten ohne
Befund. Die übrigen gelten in diesem Repository.

1. **Die Konsole lügt nicht mehr.** Die erste Zeile auf der Startseite ist die echte Antwort des Marktes, live
   gefragt. Was danach kommt, ist als Beispiel markiert.
2. **Der Abschalter liest mit.** Ist Krypto aus, prüft ein Test jede öffentliche Seite, Antwort und Anleitung auf
   Krypto-Wörter. Ein vergessener Satz lässt CI scheitern.
3. **Rückwärts beweisen.** Die Prüfung muss die alte Fassung durchfallen lassen (61 Befunde) und die neue bestehen
   lassen. Erst dann zählt sie als Prüfung.
4. **Ein Massstab für zwei Leser.** Menschen bekommen bei einem toten Link eine Seite, Agenten JSON. Beides wird
   geprüft.
5. **Testkäufe als eigene Grösse.** `/v1/stats` zählt die Käufe des Referenz-Agenten als `test_orders`. Die Startseite
   zeigt nur, was andere gekauft haben.
6. **Sichtregeln als Code.** Was an G3, G4 und G6 messbar ist, prüft `check.mjs`; G1 hat Schliesstests auf dem Server.
   Den Blick (G2) und das Urteil behält das Gremium.
7. **Die Prüfung ist Kula-Flow-Futter.** Der JSON-Bericht ist dafür gebaut, dass Vision ihn täglich liest: welche
   Seite, welche Regel, welcher Messwert. Angeschlossen ist er noch nicht.
8. **Keine Schrift von Google.** Die Beispielseiten laden nichts von fremden Hosts. Das gilt auch für Schriften, deren
   Abruf die IP-Adresse an Dritte weitergibt.
9. **Ein Menü statt Verstecken.** Auf dem Handy waren die Seiten der Leiste nur ausgeblendet. Jetzt sind sie hinter
   einem Menü mit 44-px-Zeilen erreichbar.
10. **Das Gremium bleibt im Repository.** Wer eine Seite ändert, legt sie demselben Prüfer vor, der das erste Audit
    gemessen hat, ohne Termin und ohne Menschen, die müde werden.
