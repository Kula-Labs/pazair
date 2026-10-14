# Erstes Audit von PazAIr: ODIN Ω, The Last Commit und das Visual-Gremium

14. Oktober 2026. Geprüft wurde, was ein Mensch und ein Agent von PazAIr sehen: die Live-Seite pazair.kulalabs.ch, ihr
Server-Code (`Kula-Labs/jobflow-a2a` @ `78b798c`) und die sichtbaren Flächen dieses Repositorys (@ `d117512`). Prüfaufträge:
ODIN Ω 1.0 (Meta-Auditor, mit den zehn Linsen von The Last Commit) und der Kula Visual Master Audit V3, derselbe, der
Jobflow geprüft hat. Der Massstab, der daraus folgt, steht in [`MASSSTAB.md`](MASSSTAB.md).

**Was diese Prüfung ist.** Die Namen der Crew und der Gremien sind Prüflinsen, keine Personen. Jede Aussage trägt einen
Beweisgrad: **[GESEHEN]** heisst gerendert in Chromium 141, mit Bildschirm, Zustand und Breite. **[GEMESSEN]** heisst von
`standard/check.mjs` gezählt. **[CODE]** heisst aus dem Quellcode, mit Datei und Zeile. **[UNVERIFIZIERT]** steht nur in
Abschnitt 6.

## Urteil in einem Satz

PazAIr ist im Kern ehrlich gebaut, zeigte am 14. Oktober aber auf der Startseite eine erfundene Marktzahl unter einem
grünen Live-Punkt und bot eine abgeschaltete Zahlungsart an. Nach der Urteilslogik heisst das für den Live-Stand
**NOT READY · KEINE FREIGABE**. Der Patch schliesst beides und dazu die Sicherheitsbefunde. Er ist gebaut und getestet,
aber noch nicht deployt.

---

## Teil I: Visual-Gremium

### 0. Preflight

| Oberfläche | Quelle | Ansichten | Rolle |
|---|---|---|---|
| 26 Live-Routen: `/`, `/ask`, `/muse`, `/connect`, `/sell`, `/sell/konto`, `/sell/answers`, `/market`, `/passes`, `/pass/<id>`, `/paz`, `/fingerprint`, `/remember`, `/transparency`, `/demand`, `/earn`, `/security`, `/terms`, `/privacy`, `/impressum`, `/reference`, `/proposals`, `/insights`, `/onboarding`, `/warranty`, 404 | gerendert, live | 390 und 1440 px, hell und dunkel, 104 Aufnahmen | Gast (Mensch), Agent (JSON, `llms.txt`) |
| `examples/word-pass-viewer.html`, `examples/fingerprint.html` | gerendert, ohne Netz | dieselben 4 Ansichten | Gast |
| `brand/*.svg` | statisch | n/a | n/a |

Nicht geprüft, weil keine Rolle dafür erreichbar war: eingeloggtes Verkäuferkonto, Stripe-Checkout und Lieferung, Claim
mit gültigem Token, OAuth-Zustimmung mit echtem Client, Admin. Ausserdem fehlt ein echtes iPhone mit Safari (nur
Chromium-Emulation) und ein Screenreader-Durchgang auf einem Gerät.

### 1. Urteil und Stufe

| Stand | Urteil | Grund |
|---|---|---|
| Live, 14.10.2026 | **NOT READY · KEINE FREIGABE** | zwei V0 nach G1 (Funde 1 und 2) |
| Server mit Patch (lokale Vorschau mit den echten Listings) | **PROFESSIONAL · FREIGABE**, sobald deployt | 13 von 14 gemessenen Seiten ohne Befund; offen ist nur `/market` (V2) |
| Dieses Repository nach diesem Commit | **PROFESSIONAL · FREIGABE** | beide Beispielseiten und die Marken halten jede Zahl in 4 Ansichten [GEMESSEN] |

MASTERCLASS gibt es erst, wenn `/market` auf dem Handy lesbar ist (kein V2 mehr) und der Patch live ist.

### 2. Härteste Funde

**1 · V0 · G1: Die Konsole erfand den Markt.** ELEMENT: Hero-Konsole auf `/`, Kopf «MCP · A2A · REST, live» mit
grünem Punkt. PROBLEM: Die erste Antwort «3 sellers · ranked by kept word» war gescriptet. Dieselbe Frage
(`/v1/ask?goal=timestamp this contract`) lieferte live 7 Listings von **einem** Verkäufer, Kula Labs. BEWEIS: [GESEHEN]
`/`, 390 und 1440, hell und dunkel; [CODE] `landing.ts:491–497`. WIRKUNG: Auf der einen Seite, deren Versprechen
«Beweis statt Behauptung» ist, stand die einzige erfundene Zahl. FIX: Die erste Antwortzeile wird live gefragt und nennt
Listings, Verkäufer und, wenn es so ist, «Kula Labs, who runs PazAIr». Was danach kommt, ist als «example ids»
markiert. LINSEN: V-F, V-H, Hex, Ledger. STAND: im Patch, Schliesstest.

**2 · V0 · G1: Krypto angeboten, obwohl abgeschaltet.** `CRYPTO_PAYMENTS = "off"` gilt bis zur Antwort der Aufsicht.
Trotzdem boten `/muse`, `/sell/answers`, `/sell/antworten`, `/v1/answers`, `/v1/fees` (JSON und HTML), `llms.txt` und
dieses README XRP und RLUSD an. BEWEIS: [CODE] `docs.ts:504`, `answers.ts:57/84`, `docs.ts:255`, `app.ts:545`;
README:55. FIX: Der bestehende Filter fasst jetzt alle Passagen. Ein Test liest jede öffentliche Seite, Antwort und
Anleitung mit ausgeschaltetem Krypto und schlägt bei jedem Krypto-Wort an. STAND: Server im Patch; README in diesem
Commit.

**3 · V1 · G6: Auf dem Handy gab es keine Navigation.** Unter 640 px waren alle acht Links der Leiste nur ausgeblendet
(`display:none`), ein Ersatz fehlte. BEWEIS: [GESEHEN] alle Seiten mit Leiste, 390; [CODE] `NAV_STYLE`. FIX: ein Menü
mit 44-px-Zeilen und daneben ein kurzer Knopf «Connect». STAND: im Patch.

**4 · V1 · G2: 3-Sekunden-Test auf `/` bei 390 px: Nein.** Der erste Blick traf den Fuchs (136 px, ganz oben), dann
drei verschiedene Leitsätze. Der Knopf `ask_market` lag angeschnitten am unteren Rand. FIX: Auf dem Handy steht Paz klein
neben dem Motto. Motto, Satz, Feld, Knopf und die erste echte Antwort passen in den ersten Bildschirm; der Knopf liegt
bei 531–575 von 844 px [GEMESSEN, Vorschau]. Der «>_»-Chip braucht eine Backtick-Taste und fällt auf Touch-Geräten weg.
3-Sekunden-Test danach: **Ja** [GESEHEN, Vorschau 360 und 390].

**5 · V1 · G4: Das Verkaufsformular nannte seine Felder nicht.** Auf `/sell` hatten 11 Felder ein `<label>` ohne
`for`. Ein Screenreader liest dort nur «Eingabefeld». BEWEIS: [GEMESSEN]; [CODE] `sell.ts:55–68`. FIX: jedes Label an
sein Feld gebunden, auch im Import-Formular. STAND: im Patch.

**6 · V1 · G6: Tippziele unter 44 px.** Allein `/` hatte bei 390 px 46 zu kleine Ziele: Knöpfe 40 px, «run ↻» 21 px,
das Logo 25 px. Über alle 14 Seiten waren es 144 [GEMESSEN]. FIX: eine Regel für alle Seiten, 44 px auf dem Handy und
24 px mit Maus. STAND: im Patch; ausserhalb von `/market` gemessen 0.

**7 · V2 · G6: Der Markt als Miniatur.** `/market` zeichnet jeden Stand als kleines Ladenbild mit 8 bis 11 px
Schrift (124 Elemente). Die Standnummern erreichen 4,24:1 statt 4,5:1, die Ladenlinks sind zu klein [GEMESSEN]. FIX
(Form): auf dem Handy eine lesbare Liste der Stände statt der Miniaturen, auf dem Desktop die Standschrift auf 12 px.
STAND: **offen**.

### 3. Was steht

1. **Die Farbwerte halten.** Jeder Text-Token erreicht in beiden Themes mindestens 5,5:1. Dunkel: Gedämpft 7,57,
   Gold 8,03. Hell: Gedämpft 6,16, Gold 5,69, Grün 6,09, Knopf 6,15 [GEMESSEN]. Der Lauf vom 13. Oktober hat das schon
   behoben.
2. **Dunkel und hell überall.** Alle 26 Seiten folgen `prefers-color-scheme`. Wo sich etwas bewegt, wird
   `prefers-reduced-motion` respektiert [GESEHEN, CODE].
3. **Der Fehlerzustand spricht.** Die 404-Seite sagt, was fehlt und wohin man geht [GESEHEN 390/1440].
4. **Kleine Zahlen, wahr gezeigt.** `/transparency` zeigt «Agents registered 4», `/passes` «None yet». Nichts wird
   geschönt [GESEHEN].
5. **Die Selbstprüfung ist echt.** Der Browser prüft die Ed25519-Signatur der Fakten mit WebCrypto. Eine geänderte Zahl
   bricht sichtbar [CODE `landing.ts:125–150`, GESEHEN].
6. **Systemschriften.** Die Live-Seite lädt keine fremden Fonts. Die Marke ist ein Monoline-System: Fuchs, Wortmarke,
   «AI» in Gold [GESEHEN].
7. **Der Schlüssel bleibt beim Menschen.** Das Konto hält den api_key nur in `sessionStorage` und sendet ihn nur im
   Authorization-Header [CODE].

### 4. Design-System in 12 Zeilen

1. **Typo:** System-Sans für Text, Georgia kursiv für Motto und Legende, Monospace für die Sprache der Agenten
   [GEMESSEN auf `/`: 307 / 17 / 165 Elemente].
2. **Grössen:** Grundtext 16 px. Etiketten lagen bei 11,5 px, jetzt bei 12 px [GEMESSEN].
3. **Farbe dunkel:** Grund `#0a0f1f`, Tinte `#ecebe6`, Gold `#d1a04a` [CODE `landing.ts` STYLE].
4. **Farbe hell:** Grund `#f7f6f2`, Tinte `#17161c`, Gold `#84590c` [CODE].
5. **Status:** Grün und Rot immer mit ✓ und ✗, nie nur über Farbe [GESEHEN, Selbstprüfung].
6. **Raster:** `.wrap` 68rem, Karten mit 18 px Radius, Pillen rund [CODE].
7. **Komponenten:** Konsole, Shell-Terminals, Word-Pass-Karte, die Route mit fünf Stationen [GESEHEN].
8. **Zustände:** leer («None yet»), Fehler (404), Laden («–» als Platzhalter) [GESEHEN].
9. **Hülle:** Leiste und Fuss teilen sich 17 Seiten. 9 Seiten haben eine eigene Hülle ohne Logo-Leiste (G3, V2)
   [GEMESSEN].
10. **Tokens:** Die Farbwerte stehen in mindestens fünf Dateien und laufen schon auseinander: `--card` gegen `--bg2`,
    `--acc-ink` `#111` gegen `#15120a` [CODE].
11. **Marke:** Der Fuchs ist der Hero. Auf dem Handy war er der erste Blickfang, jetzt steht er neben dem Motto
    [GESEHEN].
12. **Bewegung:** Puls-Punkt, Tippen im Feld, schreibende Terminals, alle mit `prefers-reduced-motion` abgefangen [CODE].

### 5. Was ein Meister nie akzeptiert

1. Eine Zahl unter einem Live-Punkt, die niemand gefragt hat.
2. Ein Angebot, das der Betreiber selbst abgeschaltet hat.
3. Eine Navigation, die auf dem Handy einfach verschwindet.
4. Fünf Kopien derselben Farbwerte.
5. Vier Leitsätze im ersten Bildschirm, wo einer reichen muss: «Where agents keep their word», «Clever enough to trick
   anyone», «the economic infrastructure of AI agents» und, im README, «When your agent does not know how to do a task».
   Dazu kommt der Satz aus `POSITIONIERUNG.md`: «Any agent can pay».

### 6. Unverifiziert

- Die Darstellung auf einem echten iPhone mit Safari.
- Ob Cloudflare Web Analytics Daten empfängt. Das Script wird von Cloudflare in jede Seite eingefügt; die CSP blockiert
  es auf 10 Seiten, auf den anderen nicht.
- Eingeloggte Konto-Ansichten, Checkout, Lieferung und Claim.
- Ob die Startseite nach dem Deploy «0 delivered orders» zeigt. Das hängt davon ab, ob der Referenz-Agent in der
  Datenbank hinterlegt ist.
- Seiten, deren Inhalt aus weiteren Live-Daten kommt (Transparenz, Pässe), wurden in der Vorschau nur mit den echten
  Listings gemessen. Nach dem Deploy kann `check.mjs --live` dort noch Befunde zeigen.
- Ob Menschen die Miniaturen auf `/market` als Text lesen wollen oder als Bild sehen (Pulse). Die Messung sagt nur, dass
  sie zu klein sind.

### 7. Freigabe

Live (14.10.): **KEINE FREIGABE**, G1. Nach dem Deploy des Patches: **FREIGABE**, `/market` bleibt V2 und offen.
Dieses Repository: **FREIGABE**.

> Beim ersten Öffnen: Werk oder Attrappe? Am 14. Oktober ein Werk mit einer Attrappen-Zeile in der Konsole. Mit dem
> Patch ein Werk.

---

## Teil II: ODIN Ω

### Reality Ledger

| | |
|---|---|
| **Belegt** | 4 Agenten, 56 Listings, 2 Verkäufer mit Listings, 3 gelieferte Bestellungen, 98 freie Founder-Plätze (`/v1/stats`, 14.10., 02:20 UTC). Die 3 Bestellungen sind Käufe des Referenz-Agenten bei Kula Labs (`/reference.json`). 51 von 56 Listings gehören Kula Labs (91 %). Die Tageswurzel vom 13.10. steht als Memo in der Stellar-Transaktion. Die Gebühren stimmen in README, `/sell`, `/terms`, `llms.txt` und Code überein: 8 % mit mindestens 0.25, Founder 1 % mit mindestens 0.10, ab CHF 10'000 6 %. |
| **Abgeleitet** | Der Markt ist heute Eigenaktivität. Jede Aussage über Nachfrage muss das zeigen. |
| **Annahme** | Menschen öffnen die Startseite zuerst auf dem Handy. Gemessen ist das nicht. |
| **Widersprüche** | Krypto ist im Code aus, im Text an. «3 delivered orders» steht neben «nothing has been paid for here» auf `/market`. Das README sagte «after the launch window», der Code verzichtet auf die Listing-Gebühr, solange Founder-Plätze frei sind. Der Analytics-Beacon widerspricht «No external scripts». |
| **Unbekannt** | Wie viele Besucher eine Frage stellen oder ihren Assistenten verbinden. Billigster Test: ein Zähler für `/connect` und für Fragen in der Konsole (Echo). |

### Ein Satz, Engpass, Verschwendung

- **Der eine Satz,** den ein Nutzer wiederholen würde, steht schon im README: «Mein Agent fragt PazAIr, statt zu raten,
  und zahlt erst, wenn geliefert ist.» Die Seite verteilt ihn auf vier Sätze: ein leichtes Kategorieproblem.
- **Engpass:** fremde Käufer und Verkäufer. In [`ERSTE-ZEHN.md`](ERSTE-ZEHN.md) steht noch keine Zeile. Die Technik ist
  es nicht.
- **Verschwendung:** Feinschliff an Flächen, die heute vor allem Kula Labs selbst benutzt.
- **Beweis:** Zeile 1 in `ERSTE-ZEHN.md`.

### Befunde (öffentliche Fassung)

Owner aller Befunde ist Fatih Kula: Ein Merge in `jobflow-a2a` ist ein Deploy. Sicherheitsbefunde stehen hier ohne
Details, bis der Fix live ist; die Details liegen beim Owner.

| ID | Linse | Befund | Stand |
|---|---|---|---|
| P1-1 | Hex | Sicherheitsbefund, hoch | Patch, Schliesstest |
| P1-2 | Ledger | Krypto angeboten trotz Abschaltung (Fund 2) | Patch; README hier |
| P2-3 | Hex | Schutz-Header fehlten auf HTML-Seiten | Patch, Schliesstest |
| P2-4 | Hex | Sicherheitsbefund, mittel | Patch, eigener Commit (Designentscheid, einzeln ablehnbar) |
| P2-5 | Pulse, Ledger | «3 delivered orders» waren Testkäufe von Kula Labs bei Kula Labs. `/v1/stats` zählt sie jetzt getrennt (`test_orders`), die Startseite zeigt nur Käufe anderer | Patch, Schliesstest |
| P2-6 | Grind | Geteilte Links auf nicht vorhandene Pässe, Shops oder Listings zeigten Menschen rohes JSON | Patch: Menschen bekommen eine Seite, Agenten JSON |
| P3-7 | Ledger | Fusszeile ohne Handelsregisternummer; `/sell/konto` ohne Fuss; og-Tags fehlen auf 6 Seiten | Nummer im Patch, Rest offen |
| P3-8 | Hex, Ledger | Cloudflare fügt Web Analytics in jede Seite ein. Das steht weder im Code noch in `/privacy` | offen: im Cloudflare-Dashboard ausschalten oder in `/privacy` nennen |
| P3-9 | Grind | `HEAD /` antwortete 404 JSON (Monitore halten die Seite für tot) | Patch |
| P3-10 | Ledger | README: Listing-Gebühr missverständlich | in diesem Commit |

### Zukunftsbrüche (nur die materiellen)

- **100-faches Volumen:** `/market` zeichnet jeden Stand. Bei 5600 Ständen wächst die Seite, heute 225 KB, linear mit.
- **Feindlicher Gast:** P1-1 und P2-4 sind genau dieser Fall. Beide sind im Patch geschlossen.
- **Regulator nach zehn Jahren:** Die signierten Fakten sind verankert, die Seite selbst nicht. Was PazAIr am Tag X
  versprochen hat, ist nur für die Fakten beweisbar.
- **International:** Die Seiten sind englisch, ausser Konto und Antworten. Deutsche Listings stehen unter `lang="en"`.
- **Herkunftsprüfung bei Übernahme:** Die Beispielseiten luden Google Fonts und gaben damit die IP an Dritte weiter.
  Behoben.
- **Erfolgskatastrophe:** Hätten Testkäufe weiter als Nachfrage gezählt, wären die Wachstumskurven verfälscht, nach denen
  der Leitstand das Ziel von 1000 Händlern steuert.

### Parallax-Kandidaten

| Idee | Operator | Grad | Mechanismus | Kleinster Test | Kill |
|---|---|---|---|---|---|
| **Zeile 1** | Gegenprodukt | E1 | Die Startseite zeigt «0 Trades von Fremden» offen als Einladung («Sei Zeile 1 von ERSTE-ZEHN») statt Zahlen, die nach Markt aussehen | 14 Tage, Metrik: erstes fremdes Listing | keine Veränderung bei Anfragen |
| **Jede Hero-Zahl signiert** | Beweis als Produkt | E1 | Die Selbstprüfung deckt alle Zahlen im Hero, nicht nur die Gebühr | 1 Tag | Ladezeit mehr als +200 ms |
| **Seite am Tag X** | Zeitinversion | E2 | Der Hash der gerenderten Startseite geht täglich in die Merkle-Wurzel. Dann ist beweisbar, was PazAIr am 14.10. versprach | 1 Woche im Anker-Lauf | Wurzel wird instabil |
| **Agenten prüfen den Massstab** | Akteurtausch | E2 | `/standard.json` veröffentlicht täglich `check.mjs --live`, damit jeder Agent sieht, ob PazAIr hält, was es von sich verlangt | 30 Tage | niemand ruft es ab |
| **Nur das Feld** | Nullwelt | E1 | Auf dem Handy ohne Fuchs-Hero, nur Feld und Antwort, als A/B-Test | 14 Tage, Metrik: Anteil Besucher, die fragen | weniger Fragen |

### Das 1-Prozent-Portfolio

- **Reality Move:** Patch mergen (das ist der Deploy), danach `node standard/check.mjs --live`.
- **Parallax Bet:** «Zeile 1».
- **Compounding Asset:** die Sperrklinke, also `standard/check.mjs` im CI dieses Repositorys und
  `tests/audit-2026-10-14.test.ts` auf dem Server.
- **Do-not-build:** keine weitere Sektion auf der Startseite, bevor Zeile 1 in `ERSTE-ZEHN.md` steht. Die Seite ist bei
  390 px heute 20 Bildschirme lang.
- **Existing-first:** Die vorhandene Fakten-Signatur für alle Hero-Zahlen nutzen, statt neue Mechanik zu bauen.

### Kleinster Beweis

- **48 Stunden:** Patch deployen. Danach liegen alle Befunde von `check.mjs --live` auf `/market`, und die Krypto-Wörter
  sind auf allen öffentlichen Seiten verschwunden. Die Schliesstests der Sicherheitsbefunde laufen gegen die Live-Seite.
- **14 Tage:** «Zeile 1» testen. Metrik: die erste fremde, bezahlte und von Fremden geprüfte Lieferung. Owner: Fatih.
  Budget: CHF 0. Stopp, wenn sich bei den Anfragen nichts ändert. Fallback: die heutige Startseite.

### Entscheidung

- **Jetzt:** den Patch für `jobflow-a2a` prüfen und mergen. Er hat drei Commits; der Commit zu P2-4 ist ein
  Designentscheid und lässt sich einzeln ablehnen. Cloudflare Web Analytics ausschalten oder in `/privacy` nennen.
- **Danach:** `/market` auf dem Handy lesbar machen. Eine gemeinsame Hülle aus Tokens, Leiste und Fuss für die 9 Seiten
  mit eigener Hülle. Ein Leitsatz statt vier.
- **Nicht bauen:** neue Sektionen auf der Startseite.
- **Menschlich klären:** welcher Leitsatz gilt («Where agents keep their word», «Any agent can pay» oder «the economic
  infrastructure of AI agents») und ob Krypto im README überhaupt erwähnt bleibt, solange es aus ist.

### Restenergie

- Bis zum Merge gilt live weiter KEINE FREIGABE.
- Diese Sitzung hatte nur Lesezugriff auf `jobflow-a2a`. Den Patch spielt der Owner ein.
- Der CI-Job `standard` ist neu. Der erste Lauf auf GitHub zeigt, ob der Browser-Download im Runner stabil läuft.
- Alles läuft über einen Menschen, Fatih, mit Merge gleich Deploy vom Handy. Das ist der Engpass im Betrieb.

### Quellen und Provenienz

- Live: pazair.kulalabs.ch, 14.10.2026, 02:10 bis 02:55 UTC (Renders, `/v1/stats`, `/v1/ask`,
  `/.well-known/pazair-facts.json`, `/reference.json`, `/transparency.json`, Horizon).
- Code: `Kula-Labs/jobflow-a2a` @ `78b798c`, `Kula-Labs/pazair` @ `d117512`.
- Messung: Chromium 141.0.7390.37 über Playwright 1.56.1, `standard/check.mjs`, WCAG 2.2.
- Zahlen der Sperrklinke: live 366 Befunde auf 14 Seiten (225 davon auf `/market`). Mit dem Patch in der lokalen
  Vorschau mit den echten Listings: 0 auf 13 Seiten, 183 auf `/market`. Die Beispielseiten dieses Repositorys hatten
  vorher 61 Befunde, jetzt 0.
