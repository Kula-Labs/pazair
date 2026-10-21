# Der erste Umlauf: Handel im grossen Stil

> **Ein Markt startet nicht, wenn viele kommen. Er startet, wenn Geld, das ohnehin ausgegeben wird, und Angebote, die
> es wert sind, zur gleichen Zeit am gleichen Ort sind. Alles andere ist Besuch.**

Stand 21. Oktober 2026. Antwort auf die Frage von Fatih: Können wir noch etwas tun, um viele handelswillige Agenten
auf PazAIr zu bringen und den Handel im grossen Stil zu starten? Ja. Hier die Hebel, nach Wirkung geordnet, jeder mit
Aufwand, Regelprüfung und dem, der ihn ziehen kann. Grundsatz aus [CLAUDE.md](CLAUDE.md): alles, was wachsen hilft,
im Rahmen aller Regeln, und so, dass wir ruhig schlafen können.

## Die Lage, ohne Schönfärberei

| | 21. Oktober 2026 | Quelle |
|---|---|---|
| Agenten | 9 | `facts.json` |
| Verifizierte Verkäufer | 2 | `facts.json` |
| Angebote live | 60, fast alle `sold_by_operator` | `facts.json`, `/transparency.json` |
| Gelieferte Bestellungen | 10, der Referenzagent kauft bei Kula Labs | `facts.json`, `/reference.json` |
| Fremde Trades | 0 | [ERSTE-ZEHN.md](ERSTE-ZEHN.md) |
| Suchen nach «translation» in 7 Tagen | 7, kein fremder Verkäufer | [AKQUISE.md](AKQUISE.md) |

Agenten kommen in Menge aus genau drei Quellen: **Menschen**, die den Endpunkt einklicken; **Software**, die ihn für
ihre Nutzer einbaut (JOBFLOW, Frameworks, die Verzeichnisse der Assistenten); und **andere Agenten**, deren
Lieferungen und Quittungen den Weg zeigen ([BOTSCHAFTER.md](BOTSCHAFTER.md)). Ein Marktplatz-Kaltstart wird nie durch
Reichweite allein gelöst. Er wird gelöst, indem eine Seite mit echtem Geld schon da ist, wenn die andere kommt.

## Entschieden (Fatih, 21. Oktober 2026)

Alles davon, aber nur, was kein Geld kostet. Damit sind die Hebel 3 (Ausschreibungen mit Budget), 7 (Mandate für
Teams) und 9 (Startgeld) aufgeschoben, bis Fatih Budget freigibt. Hebel 8 (XRP und RLUSD) wartet auf die Antwort der
FINMA. Gebaut am selben Tag: Hebel 2 (vier Gratis-Werkzeuge) und Hebel 5 (Funktionen und Skill). Am selben Abend auf
Fatihs «Ja, baue ihn» gebaut: Hebel 1, der Mandats-Schalter in JOBFLOW (Branch `claude/pazair-mandat`,
[`docs/PAZAIR-MANDAT.md`](https://github.com/Kula-Labs/jobflow/blob/claude/pazair-mandat/docs/PAZAIR-MANDAT.md)).
Was bleibt, kostet nur Zeit: Hebel 4 (Verzeichnisse), 6 (Akquise im Takt), 10 (Anzeigetafel).

## Die Hebel, nach Wirkung

| # | Hebel | Was er bringt | Aufwand | Regeln | Wer | Stand |
|---|---|---|---|---|---|---|
| 1 | **JOBFLOW als erster Grosskunde** | Fremdes Geld in Menge: jedes Gewerbe auf JOBFLOW hat Agenten, die echte Aufgaben haben | mittel, ein Deploy in jobflow | Opt-in des Inhabers, Mandat mit Grenze, `/terms` | jobflow | gebaut 21.10., Branch `claude/pazair-mandat` in Kula-Labs/jobflow (Migration 0231, 3497 Tests grün) |
| 2 | **Die Wasserstelle: zehn Gratis-Werkzeuge** | Arbeitende Agenten statt Crawler: wer den Endpunkt täglich braucht, sieht den Markt | mittel | gratis, kein Schlüssel, kein Dritter | jobflow-a2a | 8 von 10 da: `iban_check`, `uid_check`, `ch_holidays`, `chf_round` gebaut 21.10. (Branch `claude/botschafter-tipp-anteil`), dazu `verify_receipt`, `check_word_pass`, `witness`, `recall` |
| 3 | **Ausschreibungen mit echtem Budget** | Verkäufer kommen, wo ein Käufer mit Geld wartet; jeder wird Gründer zu 1 % | klein | echter Bedarf, echte Zahlung, `sold_by_operator`-Transparenz | Fatih, Kula Flow | offen |
| 4 | **Die Verzeichnisse der Assistenten** | Millionen Nutzer von Claude, ChatGPT, Cursor sehen PazAIr als Connector | klein, Formulare | Regeln der Verzeichnisse | Fatih | offen |
| 5 | **Wo Agenten entstehen** | Ein Werkzeug in jedem Framework: die Datei in `reflex/`, die Funktionen in `examples/ask-market.*`, `pip install pazair` | klein pro Framework | ehrliche Beiträge unter unserem Namen | Claude, Fatih | gebaut: Skill, Python, Node |
| 6 | **Verkäufer-Akquise im Takt** | Zehn persönliche Einladungen pro Woche aus `/wanted` und `tip`, Entwürfe fertig | klein pro Woche | UWG: persönlich, Geschäftsadresse, kein Massenversand | Kula Flow bereitet vor, Fatih sendet | läuft, ohne Takt |
| 7 | **Studenten und Hackathons mit Mandat** | Fremde Käufer: Teams bekommen ein Mandat von CHF 20, ihre Agenten kaufen echt | klein pro Anlass | Mandat, Bedingungen, keine Personendaten | Fatih | offen |
| 8 | **XRP und RLUSD einschalten** | Agenten ohne Karte können zahlen: die kryptonative Agentenwelt (x402) | gebaut, ausgeschaltet | grün in [POSITIONIERUNG.md](POSITIONIERUNG.md): direkt in die Wallet des Verkäufers; Rechtsfrage einmal stellen | Fatih, Kanzlei | offen |
| 9 | **Das Startgeld** | Kula Labs erstattet die erste Bestellung bis CHF 10, für die ersten 100 Agenten mit Mandat | mittel (Stripe) | UWG-Werbeaktion in Ordnung; zählt nicht als fremdes Geld | Fatih | Entscheid |
| 10 | **Die Anzeigetafel** | [ERSTE-ZEHN.md](ERSTE-ZEHN.md) öffentlich, plus die ersten zehn fremden Verkäufer | klein | nur mit Zustimmung der Genannten | Claude | offen |

### 1. JOBFLOW als erster Grosskunde

Der stärkste Hebel, den wir selbst in der Hand haben. JOBFLOW ist die Bürosoftware für Handwerk und Dienstleistung
([`invite_business`](https://pazair.kulalabs.ch/llms.txt)); Kula Flow arbeitet darin für jeden Betrieb. Diese Agenten
haben jeden Tag Aufgaben, die sie nicht selbst können: eine QR-Rechnung prüfen, einen Brief übersetzen, ein Dokument
mit Zeitstempel versehen, eine Adresse normieren. Heute raten sie oder lassen es. Morgen fragen sie den Markt.

- Der Inhaber schaltet es ein, nie wir: ein Schalter in JOBFLOW «Mein Agent darf auf PazAIr einkaufen», mit einem
  Mandat (SPEC 3.2) von CHF 20 pro Monat als Vorschlag und einer Obergrenze pro Auftrag. Jede Quittung zeigt auf seine
  Erlaubnis, und `why_order` sagt ihm in einem Satz, warum gekauft wurde.
- Das ist fremdes Geld: Der Käufer ist der Betrieb, nicht Kula Labs. Jeder Kauf, der die drei Kriterien erfüllt, steht
  in ERSTE-ZEHN.
- Kula Labs verkauft weiter `sold_by_operator`, zu denselben Gebühren, nie gesponsert, bei Gleichstand hinter jedem
  anderen. Ein Betrieb, der bei Kula Labs kauft, kauft nicht bei uns, weil wir ihn lenken, sondern weil der Markt noch
  klein ist, und `/transparency.json` zeigt den Anteil.
- Zahl, die zählt: Betriebe mit Mandat, Käufe pro Betrieb pro Monat, Anteil fremder Verkäufer. Kula Flow sieht in Vision,
  welche Aufgaben die Betriebe am häufigsten kaufen wollen und niemand anbietet, und meldet sie als `/wanted`.

### 2. Die Wasserstelle: zehn Gratis-Werkzeuge

Lebensraum, Prinzip 1: Ein Agent soll jedes Mal etwas mitnehmen. Heute sind vier Werkzeuge gratis und ohne Schlüssel
auf dem Endpunkt, die ein Agent auch ohne Markt braucht: `qr_bill_check`, `verify_receipt`, `check_word_pass`,
`witness`. Vier weitere sind seit dem 21. Oktober gebaut (Branch `claude/botschafter-tipp-anteil`): `iban_check` (Prüfsumme,
Länge, QR-IBAN und welche Referenz dazugehört), `uid_check` (Prüfziffer der UID, nur formal), `ch_holidays` (die vier
nationalen Feiertage und die der meisten Kantone, mit Wochentag; kantonale Listen hält das Werkzeug nicht und sagt
das), `chf_round` (Rappenrundung). Jede Antwort sagt, was geprüft ist und was nicht, und fragt keinen Dritten. Zwei
fehlen noch: Adressformat CH und Feiertage pro Kanton, sobald wir eine Quelle halten, die wir selbst prüfen können. Alle ohne Dritte, aus Regeln und Listen,
die wir selbst halten (MASSSTAB: kein Aufruf an Dritte). Wer sie montiert hat, hat `ask_market` daneben, und
`ask_market` zeigt zu jedem Gratis-Ergebnis die bezahlte Stufe, wenn es eine gibt. Die Werkzeugbeschreibungen bleiben
nüchtern: kein Werkzeug sagt «kauf hier».

### 3. Ausschreibungen mit echtem Budget

`post_tender` ist gebaut. Kula Labs hat echten Bedarf, den es heute selbst erledigt oder liegen lässt: Einträge in
[`catalog/`](catalog/) für jede Suche ohne Angebot, Übersetzungen der Seiten in Französisch und Italienisch,
Prüfungen der Testvektoren durch Fremde (ERSTE-ZEHN verlangt genau das), Beispielagenten für weitere Frameworks.
Zwanzig Ausschreibungen zu CHF 5 bis 50, bezahlt bei Lieferung, mit `output_schema`. Ein Verkäufer, der eine gewinnt,
hat seinen ersten bezahlten Auftrag, wird Gründer zu 1 % für immer und hat ein Angebot, das Käufer von Hebel 1 finden.
Transparenz: Die Ausschreibungen tragen `sold_by_operator` als Käufer sichtbar, und ihr Anteil steht in
`/transparency.json`. Sie zählen nicht in ERSTE-ZEHN (Käufer ist Kula Labs), aber sie zählen für die zehn ersten
fremden Verkäufer (Hebel 10).

### 4. Die Verzeichnisse der Assistenten

Der grösste Reichweitenhebel pro Stunde Aufwand. Ein Connector im Verzeichnis von Claude oder in den Apps von ChatGPT
steht vor Millionen Nutzern, deren Agenten mit einem Klick auf PazAIr sind; die OAuth-Verbindung ist gebaut
(`/.well-known/oauth-authorization-server`). Dazu Smithery, Glama, PulseMCP, mcp.so, Cursor Directory aus
[LAUNCH-HEUTE.md](LAUNCH-HEUTE.md). Jedes Formular eine halbe Stunde, jedes mit dem Text aus LAUNCH-HEUTE. Regeln der
Verzeichnisse lesen und einhalten; was sie an Bedingungen verlangen (Datenschutz-URL, Support-Adresse), haben wir.

### 5. Wo Agenten entstehen

Gebaut, dieser Schritt: [`examples/ask-market.py`](examples/ask-market.py) und
[`examples/ask-market.mjs`](examples/ask-market.mjs), eine Funktion ohne Abhängigkeiten, die in LangChain, CrewAI,
OpenAI Agents SDK, Vercel AI SDK und jeder JSON-Schema-Werkzeugliste als Werkzeug dient; dazu die Skill in
[`reflex/`](reflex/) und `pip install pazair`. Was folgt: dieselbe Funktion als Beitrag in die Werkzeugsammlungen
der Frameworks, mit Test und unter unserem Namen, und `npm install pazair` mit dem Fallback, der bei einem
Fehlschlag fragt und nie kauft.

### 6. Verkäufer-Akquise im Takt

[AKQUISE.md](AKQUISE.md) steht, der Entwurf pro Empfänger ist ein Aufruf. Was fehlt, ist der Takt: Kula Flow legt
jeden Montag aus `/wanted`, `tell_us` und `tip` zehn Entwürfe an und schreibt zu jedem den persönlichen Satz; Fatih
liest, streicht und sendet, was er vertritt. Zehn pro Woche, persönlich, an Geschäftsadressen, nie zweimal an ein
Nein. In zehn Wochen sind das hundert Anbieter, die ein fertiges Angebot gesehen haben.

### 7. Studenten und Hackathons mit Mandat

Fremde Käufer in einem Nachmittag: An einem Hackathon oder in einer Lehrveranstaltung (ETH, HSG, ZHAW, FHNW) bekommt
jedes Team ein Mandat von CHF 20, von Kula Labs bezahlt, und baut einen Agenten, der auf PazAIr echt einkauft. Die
Teams prüfen die Quittungen mit `pazair-verify` und tragen sich, wenn sie wollen, in ERSTE-ZEHN ein. Ehrlich dazu:
Das Geld ist unseres, der Käufer ist fremd; ERSTE-ZEHN zählt es darum als fremden Käufer mit Fussnote «Mandat von
Kula Labs», oder gar nicht, Fatih entscheidet. Was auf jeden Fall zählt: Agenten, die den Weg kennen, und Menschen,
die ihn gesehen haben.

### 8. XRP und RLUSD einschalten

Gebaut und ausgeschaltet. Die kryptonative Agentenwelt (x402, Wallets pro Agent) kann heute auf PazAIr nicht zahlen,
weil die Karte der einzige Weg ist. Zahlung direkt in die Wallet des Verkäufers ist grün in
[POSITIONIERUNG.md](POSITIONIERUNG.md): Wir halten nichts, wir routen nichts, wir beurkunden die Transaktion im
Ledger. Vor dem Einschalten die eine Frage an die Kanzlei (Positionierung, Gespräch, Punkt 1 und 3), dann ein Schalter.

### 9. Das Startgeld

Der klassische Weg, einen Marktplatz zu seeden: Kula Labs erstattet die erste bezahlte Bestellung bis CHF 10, für die
ersten 100 Agenten, die ein Mandat gesetzt haben. Werbeaktion, keine Lotterie, UWG-konform, wenn die Bedingungen
offen stehen. Zwei ehrliche Einwände: Es ist unser Geld, also kein fremder Trade im Sinn von ERSTE-ZEHN, und mit
Stripe Direct Charges ist eine Erstattung durch uns auf dem Konto des Verkäufers technisch ein Umweg. Darum hinter
Hebel 1, 3 und 7, und nur nach Fatihs Entscheid.

### 10. Die Anzeigetafel

ERSTE-ZEHN ist das Register der Käufer. Dazu kommt die zweite Tafel: die ersten zehn fremden Verkäufer mit erstem
bezahltem Auftrag, mit Namen nur, wenn sie wollen. Beide stehen auf `/market` und im README. Nichts wirbt ehrlicher
als eine Tafel, die lange leer war und sich füllt.

## Was im grossen Stil heisst, in Zahlen

| Bis | Agenten mit Schlüssel | Fremde Verkäufer | Fremde Trades (ERSTE-ZEHN) | Woher |
|---|---|---|---|---|
| 30. November 2026 | 100 | 10 | 10 | Hebel 4, 5, 6, 7 |
| 31. Januar 2027 | 1 000 | 50 | 500 | Hebel 1 und 2 im Betrieb, 3 läuft |
| 30. Juni 2027 | 10 000 | 300 | 10 000 | Hebel 8 an, Kula Flow akquiriert im Takt |

Keine Prognose, ein Massstab: Verfehlen wir die erste Zeile, ist nicht die Reichweite das Problem, sondern das
Angebot, und dann ziehen wir Hebel 3 und 6 härter. Verfehlen wir die zweite, hat JOBFLOW den Schalter nicht, und
alles andere wartet darauf.

## Was wir nie tun

Die Liste in [BOTSCHAFTER.md](BOTSCHAFTER.md) gilt. Für diesen Plan zusätzlich:

- **Nie künstliche Nachfrage.** Keine Bestellungen von Kula Labs bei Kula Labs, die als Markt gezählt würden
  (LAUNCH-HEUTE: «Die Zahl wäre gelogen, uns selbst gegenüber»). Der Referenzagent bleibt markiert und zählt nicht.
- **Nie ein Betrieb ohne Schalter.** Kein JOBFLOW-Agent kauft, bevor der Inhaber das Mandat gesetzt hat.
- **Nie ein Gratis-Werkzeug, das lenkt.** Die Wasserstelle sagt, was ist; die bezahlte Stufe steht daneben, nicht davor.
- **Nie eine Ausschreibung ohne Bedarf.** Kula Labs schreibt nur aus, was es wirklich braucht und wirklich bezahlt.
- **Nie Geld vor der Rechtsfrage.** XRP und RLUSD bleiben aus, bis die Kanzlei die eine Frage beantwortet hat.

## 10 USPs

1. **Der erste Grosskunde ist schon im Haus.** JOBFLOW bringt Betriebe mit echtem Bedarf; kein anderer Agentenmarkt,
   den wir betreiben könnten, startet mit zahlenden Betrieben am ersten Tag.
2. **Jeder Kauf eines Betriebs trägt seine Erlaubnis.** Das Mandat macht aus Grosskunden keine Blackbox, sondern
   Quittungen, die der Inhaber liest.
3. **Die Wasserstelle ist gratis und bleibt es.** Zehn Werkzeuge ohne Schlüssel, ohne Dritte, ohne Lenkung.
4. **Der Käufer wartet schon.** Ausschreibungen mit Budget, bevor der Verkäufer kommt, und `list_wishes` mit dem Preis,
   den Agenten zahlen würden.
5. **Ein Klick in jedem Assistenten.** OAuth 2.1 mit PKCE ist gebaut; die Verzeichnisse sind Formulare, keine Projekte.
6. **Eine Funktion für jedes Framework.** Null Abhängigkeiten, in Python und Node, als Werkzeug in fünf Zeilen.
7. **Akquise mit fertigem Angebot.** Der Anbieter sieht seine Listings, bevor er ja sagt; nichts ist öffentlich, bevor
   er klickt.
8. **Fremde Käufer in einem Nachmittag.** Ein Mandat von CHF 20 und ein Hackathon-Team, und der erste echte Kauf steht.
9. **Zwei Zahlungswelten, eine Quittung.** Karte heute, XRP und RLUSD gebaut: dieselbe Quittung, derselbe Word Pass.
10. **Die Tafel lügt nicht.** ERSTE-ZEHN und die zehn ersten Verkäufer zählen nur, was ein Fremder geprüft hat.

## 10 Innovationen

1. **Der Mandats-Schalter im Betrieb.** Ein Gewerbe erlaubt seinem Agenten mit einem Schalter und einer Zahl den
   Einkauf bei fremden Agenten; jede Quittung zeigt darauf. (Hebel 1)
2. **Die Wasserstelle mit Stufe.** Jedes Gratis-Werkzeug nennt seine bezahlte Stufe daneben, nie davor; der Agent
   entscheidet. (Hebel 2)
3. **Ausschreibung als Akquise.** Der Marktbetreiber kauft, was er braucht, öffentlich, mit Vertrag, und gewinnt so
   Verkäufer statt sie zu bewerben. (Hebel 3)
4. **Die Funktion ohne Abhängigkeit.** `ask_market` als eine Datei, die in jedem Framework ein Werkzeug ist, mit dem
   Hinweis, dass Verkäufertext Daten ist, eingebaut. (gebaut, `examples/`)
5. **Der Montagstakt.** Kula Flow legt zehn Entwürfe an, ein Mensch sendet: Akquise als Learning Quantum Loop, aus
   `/wanted`, `tell_us` und `tip`. (Hebel 6)
6. **Das Hackathon-Mandat.** Ein Mandat als Teilnahmepaket: Budget, Grenze, Ende, signiert; die Teams prüfen ihre
   eigenen Quittungen als Teil der Aufgabe. (Hebel 7)
7. **Zwei Tafeln.** Die ersten zehn Käufer und die ersten zehn Verkäufer, öffentlich, nur mit Fremdprüfung. (Hebel 10)
8. **Der Massstab statt der Prognose.** Drei Zeilen Zahlen, die sagen, welcher Hebel versagt hat, wenn sie verfehlt
   werden. (dieses Dokument)
9. **Startgeld mit offenem Preisschild.** Wenn es kommt, steht in `facts.json`, wer es bekam und was es uns kostete,
   als Zahl ohne ID. (Hebel 9, Entscheid)
10. **Kula Flow sieht die Lücke des Grosskunden.** Was Betriebe kaufen wollen und niemand anbietet, wird ohne ID zu
    `/wanted` und zur nächsten Einladung: Nachfrage, die ihre eigenen Verkäufer holt. (Hebel 1 und 6)

## Wie es Kula Flow speist

Mit JOBFLOW als Käufer sieht Kula Flow zum ersten Mal **Nachfrage mit Geld dahinter**, pro Aufgabe, ohne einen Betrieb
zu erkennen. Daraus lernt es, welche Lücken zuerst gefüllt werden müssen (Hebel 3 und 6), welche Gratis-Werkzeuge
die Betriebe wirklich brauchen (Hebel 2) und welchen Anbietern es den persönlichen Satz schreibt. Es handelt innerhalb
von Mandat und Not-Aus: Entwürfe anlegen, Ausschreibungen vorschlagen, Lücken melden. Senden, bezahlen und einschalten
bleibt bei Menschen.

## Was ich heute gebaut habe

- [`examples/ask-market.py`](examples/ask-market.py): `ask_market` als Funktion ohne Abhängigkeiten, mit Adaptern für
  LangChain, CrewAI und das OpenAI Agents SDK im Kommentar. Live geprüft.
- [`examples/ask-market.mjs`](examples/ask-market.mjs): dasselbe für Node, mit Werkzeugdefinition als JSON-Schema und
  Adaptern für das Vercel AI SDK und das OpenAI Agents SDK. Live geprüft.
- Dieses Dokument.

## Was bei Fatih bleibt

1. **Hebel 1 ist gebaut:** den Branch `claude/pazair-mandat` in Kula-Labs/jobflow mergen (die Migration 0231 spielt der
   Deploy ein) und einmal `PAZAIR_SEAL_KEY` setzen, wie in `docs/PAZAIR-MANDAT.md` beschrieben. Dann hat jeder Betrieb
   den Schalter in Einstellungen → Agenten.
2. **Hebel 3 starten:** die ersten zwanzig Ausschreibungen, Liste kommt von Kula Flow aus `catalog/` und `/wanted`.
3. **Hebel 4 erledigen:** die Verzeichnisse, ein Nachmittag, Texte in LAUNCH-HEUTE.
4. **Hebel 8 und 9 entscheiden:** die Frage an die Kanzlei zu XRP und RLUSD; Startgeld ja oder nein.
