# Erstes Audit von PazAIr: ODIN Ω, The Last Commit und das Visual-Gremium

14. Oktober 2026. Geprüft wurde, was ein Mensch und ein Agent von PazAIr sehen: die Live-Seite pazair.kulalabs.ch, ihr
Server-Code (`Kula-Labs/jobflow-a2a` @ `78b798c`) und die sichtbaren Flächen dieses Repositorys (@ `d117512`).

Zwei Teams haben geprüft. **ODIN Ω 1.0**, der Meta-Auditor, mit den zehn Linsen von The Last Commit, prüfte Code,
Sicherheit, Wahrheit und Geld. **Das Visual-Gremium**, das Jobflow abgenommen hat, hat sich bereit erklärt, auch PazAIr
zu prüfen. Es arbeitet nach seinem Visual Master Audit V3, gnadenlos wie bei Jobflow: nur was Augen sehen und Finger tun.
Der Massstab, der aus beiden folgt, steht in [`MASSSTAB.md`](MASSSTAB.md).

**Wie geprüft wurde.** Die Linsen von The Last Commit sind nach der Verfassung von ODIN Ω Funktionsetiketten. Das
Visual-Gremium unterschreibt jeden Fund mit seinen acht Stimmen (Teil I). **Dunkel ist bei PazAIr Standard**,
seit dem Entscheid vom 14. Oktober für alle (Fund 7). Darum wurde jede Seite zuerst dunkel gerendert und abgenommen,
danach hell, denn hell muss halten, wenn ein Leser es wählt. Jede Aussage trägt einen Beweisgrad: **[GESEHEN]**
heisst gerendert in Chromium 141, mit Bildschirm, Zustand und Breite. **[GEMESSEN]** heisst von `standard/check.mjs`
gezählt. **[CODE]** heisst aus dem Quellcode, mit Datei und Zeile. **[UNVERIFIZIERT]** steht nur in Abschnitt 6.

## Urteil in einem Satz

PazAIr ist im Kern ehrlich gebaut, zeigte am 14. Oktober aber auf der Startseite eine erfundene Marktzahl unter einem
grünen Live-Punkt und bot eine abgeschaltete Zahlungsart an. Nach der Urteilslogik heisst das für den Live-Stand
**NOT READY · KEINE FREIGABE**. Der Patch schliesst beides und dazu die Sicherheitsbefunde. Er ist gebaut und getestet,
aber noch nicht deployt.

**Nachtrag, 14. Oktober, 16:51 UTC.** Der Patch ist live (`Kula-Labs/jobflow-a2a#232`). Die Nachmessung mit demselben
Prüfer: 366 Befunde vorher, 233 danach, 11 von 14 Seiten ohne Befund, beide V0 aus dem Audit geschlossen. Sie fand
auch, was die Vorschau nicht sah, darunter einen Satz auf `/fingerprint`, der mehr verspricht als der Beweis (G1, V0).
Ein Folgepatch schliesst alles, was sie fand: in der Vorschau mit Live-Daten 0 Befunde auf 14 Seiten. Er ist gebaut und
getestet, aber noch nicht deployt. Siehe [Teil III](#teil-iii-nachmessung-nach-dem-deploy).

---

## Teil I: Visual-Gremium

Acht Stimmen, die bei Jobflow das Abnahmegremium mit Vetorecht waren. Sie schreiben keine eigenen Kapitel; sie
unterschreiben Funde.

| Stimme | prüft | unterschreibt |
|---|---|---|
| **V-A Couture** | Harmonie, Proportion | Funde 4, 7 und der Markt |
| **V-B Tailor** | Raster, Ausrichtung, Abstände | Funde 3, 6 |
| **V-C Ikebana** | Leere, Ruhe, Dichte | Fund 4 und der Markt |
| **V-D Kalligrafie** | Typo, Hierarchie, Lesbarkeit | Fund 5 und der Markt |
| **V-E Glas/Licht** | Kontrast, Tiefe, falscher Glow | Funde 1, 2, 7 |
| **V-F Juwelier** | was das Auge zuerst trifft | Funde 1, 4 |
| **V-G Schuhmacher/UX** | Kernwege, Daumen, Fehlertoleranz | Funde 3, 4, 5, 6 |
| **V-H Grand Master** | fertiges Werk oder Attrappe | Funde 1, 2, 7, das Urteil |

### 0. Preflight

| Oberfläche | Quelle | Ansichten | Rolle |
|---|---|---|---|
| 26 Live-Routen: `/`, `/ask`, `/muse`, `/connect`, `/sell`, `/sell/konto`, `/sell/answers`, `/market`, `/passes`, `/pass/<id>`, `/paz`, `/fingerprint`, `/remember`, `/transparency`, `/demand`, `/earn`, `/security`, `/terms`, `/privacy`, `/impressum`, `/reference`, `/proposals`, `/insights`, `/onboarding`, `/warranty`, 404 | gerendert, live | 390 und 1440 px, dunkel (Standard) und hell, 104 Aufnahmen | Gast (Mensch), Agent (JSON, `llms.txt`) |
| `examples/word-pass-viewer.html`, `examples/fingerprint.html` | gerendert, ohne Netz | dieselben 4 Ansichten | Gast |
| `brand/*.svg` | statisch | n/a | n/a |

Nicht geprüft, weil keine Rolle dafür erreichbar war: eingeloggtes Verkäuferkonto, Stripe-Checkout und Lieferung, Claim
mit gültigem Token, OAuth-Zustimmung mit echtem Client, Admin. Ausserdem fehlt ein echtes iPhone mit Safari (nur
Chromium-Emulation) und ein Screenreader-Durchgang auf einem Gerät.

### 1. Urteil und Stufe

| Stand | Urteil | Grund |
|---|---|---|
| Live, 14.10.2026 | **NOT READY · KEINE FREIGABE** | zwei V0 nach G1 (Funde 1 und 2) |
| Server mit Patch (lokale Vorschau mit den echten Listings) | **PROFESSIONAL · FREIGABE**, sobald deployt | 13 von 14 gemessenen Seiten ohne Befund, alle dunkel auch bei hellem System; offen ist nur `/market` (V2) |
| Dieses Repository nach diesem Commit | **PROFESSIONAL · FREIGABE** | beide Beispielseiten und die Marken halten jede Zahl in 4 Ansichten [GEMESSEN] |

MASTERCLASS gibt es erst, wenn `/market` auf dem Handy lesbar ist (kein V2 mehr) und der Patch live ist.

### 2. Härteste Funde

**1 · V0 · G1: Die Konsole erfand den Markt.** ELEMENT: Hero-Konsole auf `/`, Kopf «MCP · A2A · REST, live» mit
grünem Punkt. PROBLEM: Die erste Antwort «3 sellers · ranked by kept word» war gescriptet. Dieselbe Frage
(`/v1/ask?goal=timestamp this contract`) lieferte live 7 Listings von **einem** Verkäufer, Kula Labs. BEWEIS: [GESEHEN]
`/`, 390 und 1440, dunkel und hell; [CODE] `landing.ts:491–497`. WIRKUNG: Auf der einen Seite, deren Versprechen
«Beweis statt Behauptung» ist, stand die einzige erfundene Zahl. FIX: Die erste Antwortzeile wird live gefragt und nennt
Listings, Verkäufer und, wenn es so ist, «Kula Labs, who runs PazAIr». Was danach kommt, ist als «example ids»
markiert. LINSEN: V-E, V-F, V-H; Hex, Ledger. STAND: im Patch, Schliesstest.

**2 · V0 · G1: Krypto angeboten, obwohl abgeschaltet.** `CRYPTO_PAYMENTS = "off"` gilt bis zur Antwort der Aufsicht.
Trotzdem boten `/muse`, `/sell/answers`, `/sell/antworten`, `/v1/answers`, `/v1/fees` (JSON und HTML), `llms.txt` und
dieses README XRP und RLUSD an. BEWEIS: [CODE] `docs.ts:504`, `answers.ts:57/84`, `docs.ts:255`, `app.ts:545`;
README:55. FIX: Der bestehende Filter fasst jetzt alle Passagen. Ein Test liest jede öffentliche Seite, Antwort und
Anleitung mit ausgeschaltetem Krypto und schlägt bei jedem Krypto-Wort an. LINSEN: V-E, V-H; Ledger. STAND: Server im
Patch; README in diesem Commit.

**3 · V1 · G6: Auf dem Handy gab es keine Navigation.** Unter 640 px waren alle acht Links der Leiste nur ausgeblendet
(`display:none`), ein Ersatz fehlte. BEWEIS: [GESEHEN] alle Seiten mit Leiste, 390; [CODE] `NAV_STYLE`. FIX: ein Menü
mit 44-px-Zeilen und daneben ein kurzer Knopf «Connect». LINSEN: V-B, V-G. STAND: im Patch.

**4 · V1 · G2: 3-Sekunden-Test auf `/` bei 390 px: Nein.** Der erste Blick traf den Fuchs (136 px, ganz oben), dann
drei verschiedene Leitsätze. Der Knopf `ask_market` lag angeschnitten am unteren Rand. FIX: Auf dem Handy steht Paz klein
neben dem Motto. Motto, Satz, Feld, Knopf und die erste echte Antwort passen in den ersten Bildschirm; der Knopf liegt
bei 531–575 von 844 px [GEMESSEN, Vorschau]. Der «>_»-Chip braucht eine Backtick-Taste und fällt auf Touch-Geräten weg.
3-Sekunden-Test danach: **Ja** [GESEHEN, Vorschau 360 und 390, dunkel]. LINSEN: V-A, V-C, V-F, V-G.

**5 · V1 · G4: Das Verkaufsformular nannte seine Felder nicht.** Auf `/sell` hatten 11 Felder ein `<label>` ohne
`for`. Ein Screenreader liest dort nur «Eingabefeld». BEWEIS: [GEMESSEN]; [CODE] `sell.ts:55–68`. FIX: jedes Label an
sein Feld gebunden, auch im Import-Formular. LINSEN: V-D, V-G. STAND: im Patch.

**6 · V1 · G6: Tippziele unter 44 px.** Allein `/` hatte bei 390 px 46 zu kleine Ziele: Knöpfe 40 px, «run ↻» 21 px,
das Logo 25 px. Über alle 14 Seiten waren es 144 [GEMESSEN]. FIX: eine Regel für alle Seiten, 44 px auf dem Handy und
24 px mit Maus. LINSEN: V-B, V-G. STAND: im Patch; ausserhalb von `/market` gemessen 0.

**7 · V1 · G3: Dunkel ist Standard, aber nur im Code.** ELEMENT: das Farbschema jeder Seite. PROBLEM: Die Grundpalette
ist dunkel, die helle greift bei `prefers-color-scheme: light`. Ein Browser ohne Dunkel-Einstellung meldet aber «light»:
Wer sein System nicht auf dunkel gestellt hat, und das ist die Grundeinstellung der meisten Desktops, sieht PazAIr hell.
BEWEIS: [GESEHEN] `/` bei 390 px: ohne Präferenz und hell Grund `rgb(247,246,242)`, nur mit dunkel `rgb(10,15,31)`.
WIRKUNG: Der Standard der Marke erreichte einen grossen Teil der Besucher nicht. ENTSCHEID des Owners, 14.10.: **dunkel
für alle**. FIX (Zustandslogik): Jede Seite startet dunkel, was auch immer das System meldet. Hell gibt es nur auf
ausdrückliche Wahl, über einen Schalter in der Leiste, auf dem Gerät gemerkt und vor dem ersten Bild angewendet.
Der Prüfer misst ab heute mit einem System auf hell. LINSEN: V-A, V-E, V-H. STAND: im Patch (Commit 4), Schliesstest;
die Beispielseiten hier ebenso.

**Dazu, ausserhalb der sieben · V2 · G6: Der Markt als Miniatur.** `/market` zeichnet jeden Stand als kleines Ladenbild mit 8 bis 11 px
Schrift (124 Elemente). Die Standnummern erreichen 4,24:1 statt 4,5:1, die Ladenlinks sind zu klein [GEMESSEN]. FIX
(Form): auf dem Handy eine lesbare Liste der Stände statt der Miniaturen, auf dem Desktop die Standschrift auf 12 px.
LINSEN: V-A, V-C, V-D. STAND: **offen**.

### Meisterrat

Zwei Stimmen gegen zwei, drei Fälle, entschieden nach den Regeln des Gremiums:

- **Fuchs gegen 3-Sekunden-Test.** V-A will Paz als Hero in voller Grösse; V-F und V-G wollen Feld und Knopf im ersten
  Bildschirm. Regel: Ruhe schlägt Komposition, wenn der 3-Sekunden-Test sonst scheitert. Entscheid: Paz bleibt, klein
  neben dem Motto.
- **Die getippte Konsole.** Die Szene wirkt (V-A), aber sie erfand eine Zahl (V-E, V-H). Regel: Fokus auf Gate und Geld
  schlägt jede Ästhetik. Entscheid: Die Szene bleibt, ihre erste Zeile wird echt.
- **Die Miniaturen auf `/market`.** V-A und V-C halten die Illustration für die stärkste Seite, V-D und V-G messen 8 bis
  11 px. Gleichstand; V-H entscheidet: Die Illustration bleibt auf dem Desktop, das Handy bekommt eine lesbare Liste.

### 3. Was steht

1. **Die Farbwerte halten.** Jeder Text-Token erreicht in beiden Themes mindestens 5,5:1. Dunkel: Gedämpft 7,57,
   Gold 8,03. Hell: Gedämpft 6,16, Gold 5,69, Grün 6,09, Knopf 6,15 [GEMESSEN]. Der Lauf vom 13. Oktober hat das schon
   behoben.
2. **Dunkel zuerst, hell hält.** Alle 26 Seiten sind dunkel gebaut und halten auch hell jede Kontrastgrenze. Wo sich
   etwas bewegt, wird `prefers-reduced-motion` respektiert [GESEHEN, CODE].
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
3. **Farbe dunkel, der Standard:** Grund `#0a0f1f`, Tinte `#ecebe6`, Gold `#d1a04a` [CODE `landing.ts` STYLE].
4. **Farbe hell, nur auf Wahl:** Grund `#f7f6f2`, Tinte `#17161c`, Gold `#84590c` [CODE].
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
4. Einen Standard, den nur sieht, wer sein System dunkel gestellt hat.
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

Live (14.10.): **KEINE FREIGABE**, G1. Nach dem Deploy des Patches: **FREIGABE**; `/market` bleibt V2 und offen.
Dieses Repository: **FREIGABE**.

Nachgemessen nach dem Deploy (Teil III): live weiter **KEINE FREIGABE**, G1, wegen eines Satzes auf `/fingerprint`,
den das Audit übersehen hatte; dazu G6 auf `/market`, `/transparency` und `/passes`. Mit dem Folgepatch: **FREIGABE**,
0 Befunde auf 14 Seiten. MASTERCLASS verlangt den 3-Sekunden-Test des Gremiums auf einem Handy; er steht aus.

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
| P1-1 | Hex | Sicherheitsbefund, hoch | live (#232), Schliesstest |
| P1-2 | Ledger | Krypto angeboten trotz Abschaltung (Fund 2) | live (#232); README hier |
| P2-3 | Hex | Schutz-Header fehlten auf HTML-Seiten | live (#232), Schliesstest |
| P2-4 | Hex | Sicherheitsbefund, mittel | live (#232) |
| P2-5 | Pulse, Ledger | «3 delivered orders» waren Testkäufe von Kula Labs bei Kula Labs. `/v1/stats` zählt sie jetzt getrennt (`test_orders`), die Startseite zeigt nur Käufe anderer | live (#232), Schliesstest |
| P2-6 | Grind | Geteilte Links auf nicht vorhandene Pässe, Shops oder Listings zeigten Menschen rohes JSON | live (#232): Menschen bekommen eine Seite, Agenten JSON |
| P3-7 | Ledger | Fusszeile ohne Handelsregisternummer; `/sell/konto` ohne Fuss; og-Tags fehlen auf 6 Seiten | Nummer live (#232); `/sell/konto` mit Fuss im Folgepatch; og-Tags offen |
| P3-8 | Hex, Ledger | Cloudflare fügt Web Analytics in jede Seite ein. Das steht weder im Code noch in `/privacy` | Folgepatch: das Skript läuft auf keiner Seite mehr, `/privacy` sagt es. Im Dashboard ausschalten bleibt sauberer |
| P3-9 | Grind | `HEAD /` antwortete 404 JSON (Monitore halten die Seite für tot) | live (#232) |
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

- **Erledigt am 14.10.:** der Patch ist live (`jobflow-a2a#232`, 16:51 UTC).
- **Jetzt:** den Folgepatch einspielen (Teil III). Cloudflare Web Analytics im Dashboard ausschalten; mit dem Folgepatch
  läuft das Skript ohnehin nirgends mehr.
- **Entschieden mit dem Folgepatch:** `/market` auf dem Handy lesbar; eine gemeinsame Hülle aus Tokens, Leiste und Fuss
  für die 9 Seiten mit eigener Hülle; ein Leitsatz, «Where agents keep their word.».
- **Nicht bauen:** neue Sektionen auf der Startseite.
- **Entschieden am 14.10.:** dunkel für alle, hell nur auf Wahl (Fund 7).
- **Menschlich klären:** ob Krypto im README überhaupt erwähnt bleibt, solange es aus ist.

### Restenergie

- Bis zum Deploy des Folgepatches gilt live weiter KEINE FREIGABE (G1, Teil III).
- Diese Sitzung hatte nur Lesezugriff auf `jobflow-a2a`. Den Patch und den Folgepatch spielt der Owner ein.
- Der CI-Job `standard` ist neu. Der erste Lauf auf GitHub zeigt, ob der Browser-Download im Runner stabil läuft.
- Alles läuft über einen Menschen, Fatih, mit Merge gleich Deploy vom Handy. Das ist der Engpass im Betrieb.

### Quellen und Provenienz

- Live: pazair.kulalabs.ch, 14.10.2026, 02:10 bis 02:55 UTC (Renders, `/v1/stats`, `/v1/ask`,
  `/.well-known/pazair-facts.json`, `/reference.json`, `/transparency.json`, Horizon).
- Code: `Kula-Labs/jobflow-a2a` @ `78b798c`, `Kula-Labs/pazair` @ `d117512`.
- Messung: Chromium 141.0.7390.37 über Playwright 1.56.1, `standard/check.mjs`, WCAG 2.2; dunkel zuerst, dann hell.
- Zahlen der Sperrklinke: live 366 Befunde auf 14 Seiten (225 davon auf `/market`). Mit dem Patch in der lokalen
  Vorschau mit den echten Listings: 0 auf 13 Seiten, 183 auf `/market`. Die Beispielseiten dieses Repositorys hatten
  vorher 61 Befunde, jetzt 0.

---

## Teil III: Nachmessung nach dem Deploy

14. Oktober 2026. Der Patch wurde als `Kula-Labs/jobflow-a2a#232` gemergt und lief um 16:51 UTC live, rund vier Minuten
nach dem Merge. Gemessen wurde mit demselben Prüfer wie im Audit (`node standard/check.mjs --live`), dazu einzeln per
Anfrage an die Live-Seite.

### Was live gilt

- **Dunkel für alle** auf allen 14 Seiten, gemessen mit einem System auf hell [GEMESSEN].
- **Beide V0 aus dem Audit geschlossen:** die Konsole fragt den Markt live; keine der geprüften Seiten bietet Krypto an
  [GESEHEN].
- **Aufbau:** Schutz-Header, genau ein `<main>` und ein `<h1>`, auch auf der Fehlerseite und der neuen `/licence`
  [GEMESSEN].
- **Fingerabdruck:** `/fingerprint` titelt «Two prints, 55 of 64 ridges apart. Provably.»; die alten Sätze stehen auf
  keiner der geprüften Seiten mehr [GESEHEN].
- **Sperrklinke:** 366 Befunde vor dem Audit, 233 danach; 11 von 14 Seiten ohne Befund [GEMESSEN].

### Was die Nachmessung fand

Die Vorschau vor dem Deploy hatte keine Tabellenzeilen und einen Satz übersehen. Darum steht hier, was erst live sichtbar
wurde, und was der Folgepatch daraus macht.

| Fund | Regel, Stufe | Wo | Folgepatch |
|---|---|---|---|
| «Not mostly: always»: ein Zeichen der Agenten-ID ändern kippe den Abdruck immer. Gilt nur, solange zwei IDs nicht dieselbe 80-Bit-Nachricht ergeben (1 zu 2<sup>80</sup>) | G1, V0 | `/fingerprint` | Satz korrigiert, im Schliesstest von SPEC 15 |
| Links allein in einer Tabellenzelle, 20 px hoch | G6, V1 | `/transparency`, `/passes` | 24 px mit Maus, 44 px auf dem Handy |
| Schrift in den Ständen 8 bis 11 px, Standnummer 4.24:1, Pfeile 37 px | G6, V1 | `/market` (218) | Stände breiter, alles ab 12 px, volle Deckkraft, Pfeile 44 px |
| Fassaden in der Zeichnung 11 bis 32 px breit | G6, V1 | `/market` | gleichwertiges Ziel nach WCAG 2.5.8, nachgewiesen (MASSSTAB, Entscheide) |
| Ein Skript eines Dritten lief auf einigen Seiten (P3-8) | Datenschutz, mittel | mehrere | läuft auf keiner Seite mehr; `/privacy` sagt es |
| Neun Seiten (acht Vorlagen) mit eigener Hülle | G3, V2 | `/sell`, Konto, `/fingerprint`, `/transparency`, `/passes`, Pass, Shop, Antworten | gemeinsame Leiste, gemeinsamer Fuss, ein Satz Farben |
| Mehrere Leitsätze nebeneinander | G2, V2 | Startseite, Shell, `/demand` | einer: «Where agents keep their word.» |

Der Folgepatch hat fünf Commits mit Schliesstests (`tests/audit-folgen-2026-10-14.test.ts`), 839 Tests grün. In der
lokalen Vorschau mit den Live-Daten (Listings, Transparenz, Register) [GEMESSEN]: **0 Befunde auf 14 Seiten**, keine
Seite von ihrer Richtlinie blockiert, kein Skriptfehler. Er ist gebaut und getestet, aber noch nicht deployt.

### Entscheid: der Fingerabdruck bleibt bei k = 10

Vorgeschlagen war, den Code auf k = 16 zu stärken (d = 49, 2<sup>64</sup> statt 2<sup>40</sup> für eine erzwungene
Kollision). Entschieden: **nein**.

1. Ein anderes k ändert jeden Abdruck. Ein verankerter Abdruck darf sich nie ändern; SPEC 15, der Testvektor und
   `pazair-verify` (npm, PyPI) hängen daran.
2. Agenten-IDs wählt niemand selbst; der Server zieht sie zufällig. Eine Kollision unter fremden Agenten bräuchte rund
   10<sup>12</sup> Registrierungen gegen eine Ratenbegrenzung, einen bestimmten Abdruck nachzubauen 2<sup>80</sup>.
3. Nur der Aussteller selbst könnte IDs durchprobieren. Er signiert die Pässe ohnehin; wer ein Agent ist, sagen
   Herkunft, ID und Signatur, nicht der Abdruck (SPEC 15, «What it does not claim»).

Wird der Abdruck je zur Identität erklärt, dann als zweites Feld mit grösserem k neben dem ersten, nie an seiner Stelle.

### Quellen

- Live: pazair.kulalabs.ch, 14.10.2026, 16:51 bis 16:54 UTC (Messung), 17:00 bis 19:30 UTC (Folgepunkte); Deploy-Lauf von `jobflow-a2a#232`.
- Code: `Kula-Labs/jobflow-a2a` @ `383c3ee` (nach #232), Folgepatch auf diesem Stand; `Kula-Labs/pazair` @ `4f1816b`.
- Messung: wie im Audit; dazu `standard/selftest.mjs` für die Ausnahme «gleichwertiges Ziel».
