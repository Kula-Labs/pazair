# Umsatz ab heute: wo das Geld hängen blieb und wie es in die Kasse kommt

> **219'077 Anfragen sind kein Publikum. In 28 Tagen haben 135 Besucher ein Werkzeug aufgerufen, und wer als Mensch
> zahlen wollte, bekam ein JSON-Feld. Zuerst muss ein Mensch mit Karte kaufen können. Danach lohnt sich jeder weitere
> Besucher.**

Stand 28. November 2026. Antwort auf Fatih: «Wir haben so viel Traffic und keinen Umsatz. Suche Wege, wenn nötig
andere Produkte.» Dieses Dokument sagt, was gemessen ist, was am selben Tag behoben wurde, und welche Wege Geld
bringen, nach Tempo geordnet. Schätzungen sind als Schätzungen bezeichnet. Niemand kann einen Käufer versprechen;
versprechen lässt sich nur, dass ihm nichts mehr im Weg steht.

## Die Lage, gemessen

| | 29. Oktober bis 27. November 2026 | Quelle |
|---|---|---|
| Anfragen | 219'077 | `/advertise/audience.json` |
| Besuche (ein Besucher pro Tag) | 21'661 | ebenda |
| davon Verzeichnisse und ihre Crawler | 10'193 | ebenda |
| davon Agenten | 3'997 | ebenda |
| davon mit Browser («Menschen») | 7'471, 12'274 aller Besuche aus den USA, 188 aus der Schweiz | ebenda |
| Besucher, die ein Werkzeug aufriefen | 135 | ebenda, `tool_callers` |
| Verschiedene Suchende der drei meistgesuchten Aufgaben, seit 18. November | 26, 24 und 7 | ebenda, `searchers_by_search` |
| Agenten mit Schlüssel | 16 | `/v1/stats` |
| Bestellungen | 35, davon 35 Testkäufe | `/v1/stats` (`orders`, `test_orders`) |
| Bestellungen, die vor der Lieferung storniert wurden | 7 | `/transparency.json` |
| Bezahlte Bestellungen von Fremden | 0 | [ERSTE-ZEHN.md](ERSTE-ZEHN.md) |

Was die Zahlen sagen:

1. **Der Traffic ist vor allem Maschinenbegrüssung.** Zwei Drittel der Besuche sind Verzeichnisse und Agenten
   (14'190 von 21'661), und rund 156'000 der 219'077 Anfragen sind der Handschlag des Protokolls (`initialize`,
   `tools/list`, `prompts/list`, `resources/list` und ihre Bestätigungen): Verzeichnisse prüfen, ob der Server lebt.
   Das ist Reichweite, kein Bedarf.
2. **Die drei «meistgesuchten» Aufgaben sind unsere eigenen Beispielsätze.** «check a Swiss company before the first
   payment» ist wörtlich der Link «Ask it yourself» der Startseite, «create a Swiss QR bill» steht in `llms.txt`, im
   Connector-README und in den Beispielen. Wer sie sucht, probiert PazAIr aus: 24 und 26 verschiedene Besucher in zehn
   Tagen. Eine Nachfrage, die von selbst kommt, ist noch nicht gemessen. Aber diese Besucher sind der echte Trichter,
   und sie landeten auf einer Seite, auf der ein Mensch nicht kaufen konnte.
3. **Die Ware ist schweizerisch, das Publikum nicht.** QR-Rechnung, UID, SHAB, Mahnung nach OR: 188 Besuche aus der
   Schweiz in 28 Tagen, und seit dem 27. November ist jede Seite englisch.
4. **Bei CHF 2 bis 12 pro Kauf trägt kein Besucher Werbekosten.** Ein bezahlter Klick kostet mehr, als er bringt.
   Geld in spürbarer Höhe kommt aus Paketen und Abos, nicht aus Einzelkäufen.

## Wo das Geld hängen blieb (behoben am 28. November 2026)

Im Server gebaut und getestet, [Kula-Labs/jobflow-a2a, Pull Request 388](https://github.com/Kula-Labs/jobflow-a2a/pull/388).
Live, sobald er gemergt ist.

| Stelle | Vorher | Jetzt |
|---|---|---|
| «Buy it yourself» auf der Angebotsseite | Auf 50 von 78 Kula-Labs-Angeboten ein JSON-Feld, auch auf den drei meistgesuchten. Die QR-Rechnung begann mit `{"creditor": {}}`, der Zeitstempel verlangte einen SHA-256. | Ein Formular aus dem Schema jedes Angebots: Adressen als Gruppen, Zeilen zum Hinzufügen, Datum, Auswahl. 66 von 78 ganz ohne JSON, bei 12 ein einzelnes Feld für Tabellenzeilen oder ein Dokument. Wer einen Vertrag stempeln will, wählt die Datei: der Fingerabdruck entsteht im Browser, die Datei verlässt ihn nicht. |
| Fehler in der Eingabe | Ein Satz mit Feldpfad und Zod-Meldung | Am Feld, in Worten: «This needs at least 15 characters.» |
| Vom Gratis-Versuch zum Kauf | Die Eingabe war weg, das Formular leer | Was getippt ist, bleibt im Tab und steht im Kaufformular, auch zurück von Stripe |
| Seite nach der Zahlung | Die bezahlte QR-Rechnung als JSON mit dem Code als Text darin; ein Knopf «Download the PDF», der auch ohne PDF erschien | Das Bild mit Download als PNG und SVG; PDF, Excel, Kalender, Bitcoin-Beweis je als Knopf; die Fakten als Liste; darunter, was das Produkt nicht prüft |
| Startseite | Das Live-Feld lag offen auf jeder Breite von 1280 bis 2560 px über dem Suchfeld und dem Knopf «Buy a service» | Es öffnet von selbst nur, wo es nichts verdeckt; sonst eingeklappt mit der Zahl sichtbar. Wer es öffnet, behält es offen. |
| Messung | Zwischen «angesehen» und «gekauft» nichts | Zwei neue Zähler pro Produkt: `tried` und `try_refused` (`/admin/market.json`, `own_offers`). Wir sehen ab jetzt, ob Leute es versuchen und woran sie scheitern. |

Geprüft: die ganze Testreihe des Servers (1676 Tests, kein Fehler), dazu im echten Browser gegen den echten Markt-Code
22 Schritte vom Formular bis zur Übergabe an Stripe und die Lieferung einer QR-Rechnung; das lief lokal, mit
nachgestelltem Stripe. Nicht geprüft, weil es eine echte Bestellung in der Live-Datenbank anlegen und die öffentlichen
Zahlen verändern würde: die Karteneingabe bei Stripe auf pazair.ch. Der Probekauf auf der Live-Seite meldet die
Angebote als kaufbereit (`ready: true`, der Verkäufer ist von Stripe freigegeben). Der erste echte Käufer ist der
Test des letzten Schritts.

Eine Abwägung, die Fatih umstossen kann: Das Live-Feld sollte «immer zu sehen» sein (27. November). Es ist es weiter,
aber auf der Startseite eingeklappt, weil es dort den Kauf verdeckte. Zurück geht es mit einer Zeile in
`src/market/livedock.ts`.

## Die Wege, nach Tempo geordnet

| # | Weg | Wann Geld | Schätzung | Aufwand | Regeln | Wer | Stand |
|---|---|---|---|---|---|---|---|
| 1 | **Menschen kaufen selbst** auf dem vorhandenen Besuch | ab dem Merge | einzelne Käufe pro Woche, CHF 2 bis 12; der Wert ist der erste Franken und die Zahl `tried` | erledigt | Bedingungen 2g, Datenschutz 2026-11-28a | Claude | gebaut |
| 2 | **Zehn persönliche Einladungen** an Leute mit dem Bedarf: Treuhand, Buchhaltung, Einkauf, Vereinskasse | diese Woche, nach dem Merge | 1 bis 3 Käufe und, wichtiger, zehn ehrliche Antworten | 30 Minuten | UWG: persönlich, an Bekannte und Geschäftsadressen, kein Massenversand; jede Aussage steht auf der Angebotsseite | Fatih sendet, Text unten | bereit |
| 3 | **JOBFLOW-Betriebe als Käufer** (Hebel 1 in [ERSTER-UMLAUF.md](ERSTER-UMLAUF.md)): der Mandats-Schalter ist seit 21. Oktober gebaut | sobald der Branch `claude/pazair-mandat` in Kula-Labs/jobflow live ist | pro Betrieb höchstens sein Mandat, als Vorschlag CHF 20 im Monat | ein Merge, ein Secret | Opt-in des Inhabers, Mandat mit Grenze | Fatih | prüfen, ob gemergt |
| 4 | **Das Vereinspaket**: Mitgliederbeiträge 2027 für alle Mitglieder aus einer Liste, ein PDF mit QR-Rechnung pro Person (`bulk_collection`, bis 300) | Dezember bis Februar, die Saison der Jahresrechnungen | CHF 19 bis 29 pro Verein statt CHF 10; zehn Vereine sind CHF 190 bis 290 | 1 bis 2 Tage: Liste als CSV oder Excel hochladen statt Zeilen tippen, eine Seite dafür | Preis in `KULA_OFFERS`, Marge nach `docs/COSTS.md`; nichts geht an eine Bank | Claude baut, Fatih gibt den Preis frei | offen |
| 5 | **Deutsche Kaufseiten** für die Schweizer Ware (QR-Rechnung, Firmencheck, Mahnung, Vereinspaket) | zwei bis acht Wochen, Suchmaschinen brauchen Zeit | die Voraussetzung, dass Schweizer Käufer überhaupt ankommen | 1 Tag | derselbe Text, dieselben Bedingungen; Englisch bleibt verbindlich | Claude | Entscheid: am 27. November wurde alles englisch |
| 6 | **Der KI-Sichtbarkeits-Check** als neues Produkt für das Publikum, das schon da ist: «Findet und versteht ein Agent deine Firma?» Ein Bericht aus `ai_usage_check`, `domain_facts`, dem Check der Agentenkarte und der Suche auf PazAIr, mit dem Werbeplatz als nächstem Schritt | zwei bis drei Wochen | CHF 49 pro Bericht; zehn im Monat sind CHF 490 | 2 bis 3 Tage | nur prüfbare Befunde mit Quelle, keine Zusage von Besuchen (Bedingungen 7a) | Claude baut, Fatih gibt frei | offen |
| 7 | **Werbeplätze** (CHF 29, 49, 99) | wenn Weg 6 Käufer bringt | einzelne Buchungen | gebaut | nur mit dem gezählten Publikumsbericht verkaufen: es sind vor allem Maschinen | Fatih | gebaut, 0 Buchungen |
| 8 | **Marktplätze mit eigener Kundschaft**: der Apify-Actor «Swiss Company Dossier» liegt fertig in `apify/`, dazu RapidAPI | zwei bis vier Wochen nach Einreichung | offen, dort zahlen Entwickler schon heute pro Ergebnis | je ein halber Tag | **neuer Zahlweg**: Apify zahlt aus, nicht Stripe. Braucht Fatihs ausdrückliches Ja | Fatih | Entscheid |
| 9 | **Bezahlte Anzeigen** für Einzelkäufe | nie | negativ: ein Klick kostet geschätzt CHF 0.50 bis 1.50, ein Kauf bringt CHF 5, und nur ein kleiner Teil der Klicks kauft | | | | nicht tun; erst mit Weg 4 oder einem JOBFLOW-Abo dahinter rechnen |

Die Reihenfolge, die ich empfehle: 1 mergen, 2 gleich danach senden, 3 prüfen, dann 4 vor 5 vor 6. Weg 4 hat ein Datum, das
nicht wartet: Vereine stellen ihre Jahresrechnungen im Januar.

### Zu Weg 2: der Text, per Du, zum Kopieren

Für jemanden, der Lieferanten oder Kunden prüft. Jede Aussage steht auf der Angebotsseite oder in den Bedingungen
(2, 2g, 2h).

```
Hoi [Name]

Kurze Frage aus der Praxis: Prüfst du einen neuen Lieferanten oder Kunden, bevor die erste Zahlung rausgeht?

Ich habe dafür etwas gebaut. Du gibst die UID ein, wenn du willst auch IBAN und Adresse, und bekommst in Sekunden: den Stand im UID-Register des Bundes, die Handelsregister- und Konkursmeldungen im SHAB, die Adresse gegen das Gebäuderegister und die Prüfziffern der IBAN. Dazu ein Urteil: nichts gefunden oder genauer hinschauen. Keine Bonitätsauskunft und keine Sanktionsprüfung, das steht auch so drin.

CHF 9 pro Check, ohne Konto. Die Karte wird erst belastet, wenn das Ergebnis da ist. Ausprobieren geht gratis mit dem Knopf daneben, ein paar Mal am Tag.

https://pazair.ch/v1/listings/ls_294p4j260b2d090#buy-yourself

Die Seite ist auf Englisch. Mich interessiert vor allem, ob dir das im Alltag etwas bringt und was fehlt.

Gruss
Fatih
```

Für eine Vereinskasse derselbe Aufbau mit der QR-Rechnung (CHF 5):
`https://pazair.ch/v1/listings/ls_29650k151x110m6#buy-yourself`.

## Was wir nie tun

Die Liste in [BOTSCHAFTER.md](BOTSCHAFTER.md) und in [ERSTER-UMLAUF.md](ERSTER-UMLAUF.md) gilt. Für diesen Plan dazu:

- **Nie ein eigener Kauf als Umsatz.** Fatih kauft nicht bei Kula Labs, um den ersten Verkauf zu sehen
  (`REFERENCE_PURCHASES = "off"`, 14. November). Zum Proben gibt es den Testkauf ohne Geld.
- **Nie ein Massenversand.** Weg 2 sind zehn Menschen, die Fatih kennt oder deren Geschäftsadresse er hat, je einmal.
- **Nie ein Werbeplatz mit Publikum, das wir nicht gezählt haben.** Wer bucht, sieht vorher, dass die Mehrheit der
  Besuche Maschinen sind.
- **Nie ein neuer Zahlweg ohne Ja.** Apify und RapidAPI bleiben Vorschläge, bis Fatih sie freigibt.
- **Nie eine Zusage ohne Fundstelle.** Der Sichtbarkeits-Check sagt, was er gefunden hat, mit Quelle. Er verspricht
  keinen Rang und keinen Besuch.

## 10 USPs

1. **Jedes Angebot ist in einer Minute von einem Menschen kaufbar.** Kein Konto, kein Schlüssel, kein JSON: Felder,
   Karte, Ergebnis. (gebaut)
2. **Bezahlt wird erst bei Lieferung, auch im Browser.** Die Karte wird bei Stripe nur reserviert; scheitert die
   Lieferung, wird nichts belastet. (gebaut, Bedingungen 2)
3. **Das Dokument bleibt beim Menschen.** Für den Zeitstempel verlässt nur der Fingerabdruck den Browser. (gebaut)
4. **Was gekauft ist, sieht aus wie das, was es ist.** Ein QR-Code ist ein Bild, ein Dossier ein PDF, ein Beweis eine
   Datei. (gebaut)
5. **Jede Lieferung sagt, was sie nicht prüft.** Die Grenzen des Produkts stehen unter dem Ergebnis. (gebaut)
6. **Derselbe Weg für Mensch und Agent.** Das Formular baut genau das Objekt, das ein Agent als `input` sendet; ein
   Vertrag, eine Quittung, eine Schlichtung für beide. (gebaut)
7. **Gratis probieren, mit derselben Eingabe kaufen.** Der Versuch kostet nichts, und der Kauf fragt nichts zweimal.
   (gebaut)
8. **Ein Verein rechnet 300 Mitglieder in einem Auftrag ab.** Eine Liste hinein, ein PDF mit QR-Rechnungen heraus,
   nichts geht an eine Bank. (Weg 4)
9. **Amtsquellen mit Beweis.** UID-Register, SHAB und Gebäuderegister live, jede Antwort mit Zeit und SHA-256.
   (gebaut)
10. **Schweizerisch und nachprüfbar.** Kula Labs, Wallisellen, CHE-453.469.432; jede Quittung signiert und täglich in
    Bitcoin und Stellar verankert. (gebaut)

## 10 Innovationen

1. **Das Formular aus dem Vertrag.** Kein Angebot hat ein eigenes Formular: Es entsteht aus dem Schema, gegen das die
   Lieferung geprüft wird. Ein neues Angebot ist am selben Tag für Menschen kaufbar. (`src/market/buyform.ts`)
2. **Der Fingerabdruck im Browser.** Ein Mensch stempelt einen Vertrag in Bitcoin, ohne ihn jemandem zu zeigen und
   ohne zu wissen, was ein Hash ist. (gebaut)
3. **Der Fehler am Feld, vom selben Prüfer.** Der Probekauf, den jeder Agent macht, markiert im Browser das Feld; es
   gibt keine zweite Validierung, die abweichen könnte. (gebaut)
4. **Die Eingabe reist mit.** Vom Gratis-Versuch der Startseite ins Kaufformular und zurück von Stripe, ohne dass sie
   unseren Server berührt. (gebaut)
5. **Die Lieferung, die sich selbst zeigt.** Die Seite nach der Zahlung erkennt Bild, PDF, Tabelle, Termin und
   Beweisdatei in jeder Lieferung, auch fremder Verkäufer, und zeichnet nur, was nichts ausführen kann. (gebaut)
6. **Zwei Zähler für das Zögern.** `tried` und `try_refused` trennen «wollte nicht» von «konnte nicht», pro Produkt,
   ohne eine Person zu kennen. (gebaut)
7. **Das Feld, das Platz macht.** Das Live-Feld misst, ob neben dem Inhalt Raum ist, und öffnet nur dort. (gebaut)
8. **Die Saison als Produkt.** Ein Angebot mit Datum: Mitgliederbeiträge im Januar, Mahnlauf im März, Steuerkurs zum
   Jahresende. Kula Flow schlägt das Angebot vor, bevor die Suche kommt. (Weg 4)
9. **Der Sichtbarkeits-Check, der sein eigenes Regal füllt.** Wer prüft, ob Agenten seine Firma finden, sieht die
   Lücke und den Platz, der sie schliesst. (Weg 6)
10. **Der Massstab vor der Massnahme.** Jeder Weg steht mit seiner Rechnung da; wo sie negativ ist, steht «nicht
    tun». (dieses Dokument)

## Wie es Kula Flow speist

Bis heute sah Kula Flow Besuche und Suchen, aber zwischen «angesehen» und «gekauft» nichts. Mit `tried` und
`try_refused` sieht es pro Produkt, wo Menschen und Agenten umkehren, und kann den Engpass als Karte in Vision melden:
ein Feld, an dem viele scheitern; ein Produkt, das viele ansehen und niemand versucht; ein Preis, bei dem der Versuch
endet. Jeder Kauf eines Menschen ist zudem die erste Nachfrage mit Geld dahinter, die Kula Flow als Lücke lesen kann:
Was Vereine und Treuhänder kaufen, ist das, wofür JOBFLOW-Betriebe ihr Mandat brauchen. Kula Flow schlägt vor und
misst; senden, Preise und neue Zahlwege bleiben bei Fatih.

## Was bei Fatih bleibt

1. **Mergen:** [Pull Request 388 in Kula-Labs/jobflow-a2a](https://github.com/Kula-Labs/jobflow-a2a/pull/388). Der
   Deploy läuft danach von selbst.
2. **Nach dem Merge zehn Einladungen senden** (Weg 2), Text oben. Vorher zeigt die Seite noch das JSON-Feld.
3. **Eine Entscheidung:** Soll Claude als Nächstes das Vereinspaket bauen (Weg 4: Liste hochladen, deutsche Seite,
   Preis CHF 19 bis 300 Mitglieder), ja oder nein? Das Ja schliesst ein, dass diese eine Seite deutsch ist.
4. **Später entscheiden:** Apify und RapidAPI als Zahlweg neben Stripe (Weg 8).
