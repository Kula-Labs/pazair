# Das Vereinspaket: QR-Rechnungen für alle Mitglieder in einem PDF

Stand 28. November 2026. Gebaut auf Fatihs «baue es». Der Code liegt in
[Kula-Labs/jobflow-a2a](https://github.com/Kula-Labs/jobflow-a2a) (`src/market/verein.ts`, `src/agents/kit/sepa.ts`,
`src/agents/kit/pdf.ts`), die Seite ist `pazair.ch/verein`.

## Was es ist

Ein Kassier fügt die Mitgliederliste aus Excel ein. Er bekommt ein PDF: pro Mitglied ein Brief mit Schweizer
QR-Rechnung, bereit zum Drucken. Bis 300 Mitglieder pro Versand, CHF 19.00, bezahlt mit Karte über Stripe, belastet
erst, wenn die Datei geliefert ist. Kein Konto, kein Abo.

Das ist Weg 4 aus [UMSATZ-AB-HEUTE.md](UMSATZ-AB-HEUTE.md) und der erste Weg, der nicht auf Maschinen wartet. Der
Verkehr auf PazAIr sind vor allem Verzeichnisse, Prüfer und Handschläge von Agenten; keiner davon hat ein Bedürfnis und
eine Karte. Ein Kassier, der im Januar 150 Rechnungen schreiben muss, hat beides.

## Was vorher kaputt war

Das Produkt `bulk_collection` stand seit Oktober für CHF 10 im Regal und versprach «bis 300». Geliefert werden konnte es
nie für mehr als 16 Mitglieder. Gemessen am 28. November 2026:

| Was | Vorher | Jetzt |
|---|---|---|
| Datei für 300 Mitglieder | 18,4 Millionen Zeichen; eine Lieferung fasst 1 Million | rund 620'000 Zeichen (PDF 446 kB) |
| Grösste lieferbare Liste | 16 Mitglieder | 300 Mitglieder, auch mit einem Brief von 3000 Zeichen |
| Eingabe einer Bestellung | 20'000 Zeichen, das sind rund 119 Mitglieder | 120'000 Zeichen für dieses eine Produkt |
| Gratis-Aufruf | die ganze Datei, dreimal am Tag | ein Muster: alle Adressen geprüft, 2 Rechnungen gebaut, gekennzeichnet |
| Eingabe für Menschen | ein JSON-Feld | Liste einfügen oder Excel-Datei wählen |
| Falsche IBAN | gescheiterte Lieferung; drei in Folge nehmen das Angebot aus der Suche | «Eingabe abgelehnt» mit Grund, nichts belastet, zählt nicht gegen das Angebot |

Wie die Datei klein wurde: Der QR-Code ist ein Bild statt ein Rechteck pro Modul (vier Bildpunkte pro Modul, damit er
auch in Betrachtern scharf bleibt, die Bilder glätten). Jede Seite ist komprimiert. Und was auf vielen Seiten gleich
ist, also der Brief, die Beschriftung des Zahlteils und die Angaben des Vereins, steht einmal in der Datei; jede Seite
zeigt darauf. Geprüft: Ausserhalb des QR-Codes sind die Seiten Bildpunkt für Bildpunkt gleich wie vorher, und ein
QR-Leser liest auf Seite 1 und Seite 297 genau die Zahldaten des jeweiligen Mitglieds, auch in Druckauflösung.

## Der Weg des Kassiers

1. **Verein:** Name, Adresse, IBAN oder QR-IBAN. Die Seite prüft die IBAN sofort.
2. **Mitglieder:** aus Excel einfügen, oder eine .xlsx- oder CSV-Datei wählen. Die Datei wird im Browser gelesen und
   nicht hochgeladen. Die Seite erkennt die Spalten (Überschriften auf Deutsch, Französisch, Englisch, oder ohne
   Überschrift am Inhalt), zeigt die Zuordnung zum Ändern und nennt jede Zeile, aus der keine gültige QR-Rechnung wird,
   mit Zeilennummer und Grund auf Deutsch.
3. **Brief:** Betreff, Text mit `{name}` und `{amount}`, Betrag für alle oder aus der Liste, Sprache (Deutsch,
   Französisch, Italienisch, Englisch), Datum.
4. **Gratis prüfen:** Das Werkzeug prüft jede Adresse nach den Regeln der QR-Rechnung, baut zwei Rechnungen als Muster
   und misst, ob die ganze Datei lieferbar ist.
5. **Kaufen:** Karte bei Stripe, direkt an Kula Labs. Die Karte wird nur reserviert.
6. **Abholen:** zurück auf der deutschen Seite. PDF und Kontrollliste (CSV: Seite, Name, Betrag, Referenz) zum
   Herunterladen, 30 Tage lang im selben Browser.

Jede Rechnung trägt eine eigene Referenz: mit normaler IBAN eine Creditor Reference (RF…), mit QR-IBAN eine
QR-Referenz. Sie steht bei jeder Zahlung im E-Banking. So sieht der Kassier, wer bezahlt hat. Abgleichen muss er
selbst; wir sehen kein Konto.

## Die Rechnung, ehrlich

Ein Verkauf bringt CHF 19.00, abzüglich der Kartengebühr von Stripe. Kosten pro Verkauf: Rechenzeit, sonst nichts (im
Test war die Datei für 297 Mitglieder 1,7 Sekunden nach der Zahlung da); es gibt kein Modell und keinen Dritten dahinter.

| Verkäufe in der Saison (Dezember bis Februar) | Umsatz |
|---|---|
| 10 Vereine | CHF 190 |
| 50 Vereine | CHF 950 |
| 200 Vereine | CHF 3'800 |

Das sind Rechenbeispiele, keine Prognose. Niemand kann zusagen, dass ein Verein kauft. Was sich zusagen lässt: Der
Weg von der Liste bis zur bezahlten Datei ist im Browser durchgespielt (23 Prüfungen, Desktop und Handy) und in 16
eigenen Tests festgehalten. Ob er verkauft, zeigen die Zahlen unten nach den ersten zehn Besuchen.

Ein Verein kommt jedes Jahr wieder, und die Liste hat er dann schon. Das ist der Unterschied zu einem Einzelkauf für
CHF 5.

## Wie es zu Käufern kommt

Die Seite allein verkauft nichts, solange sie niemand kennt. In dieser Reihenfolge:

1. **Persönlich, diese Woche (Fatih):** Fünf bis zehn Menschen, die du kennst und die eine Vereinskasse führen oder
   jemanden kennen: Turnverein, Fussballclub, Musikgesellschaft, Elternverein, Stockwerkeigentümer. Text unten.
   Persönlich und an Bekannte, kein Massenversand (UWG).
2. **Suche (läuft von selbst):** Die Seite ist deutsch, steht in der Sitemap und wird nach dem Deploy an Bing und die
   Suchdienste dahinter gemeldet (IndexNow). Titel und Beschreibung tragen «Mitgliederbeiträge», «QR-Rechnung»,
   «Verein». Das braucht Wochen, nicht Tage.
3. **Bestehender Besuch:** Verweis von der Gratis-Rechnung (`/invoice`), von den Gratis-Werkzeugen (`/free`) und von
   der Leiste für Menschen auf der Startseite.
4. **Später, als Entscheidung:** Vereinsverbände und Treuhänder, die viele Vereine betreuen, als Wiederverkäufer mit
   Anteil (Bedingungen 6, eine Stufe). Erst wenn die ersten zehn Verkäufe zeigen, dass der Weg trägt.

### Der Text, per Du, zum Kopieren

Erst senden, wenn der Preis live ist (Schritt 2 unter «Was bei Fatih bleibt»). Jede Aussage steht auf der Seite oder in
den Bedingungen (2g, 2h, 2l).

```
Betreff: Mitgliederbeiträge 2027: alle QR-Rechnungen in einem PDF

Hoi [Name]

Du machst doch die Kasse bei [Verein]. Ich habe etwas für die Jahresrechnungen gebaut:

https://pazair.ch/verein

Du fügst die Mitgliederliste aus Excel ein und bekommst ein PDF mit einem Brief und einer QR-Rechnung pro Mitglied, bereit zum Drucken. Bis 300 Mitglieder pro Versand.

Prüfen ist gratis: Die Seite zeigt dir jede Adresse, die nicht stimmt, und zwei fertige Rechnungen als Muster. Die ganze Datei kostet CHF 19, bezahlt mit Karte, und belastet wird erst, wenn die Datei da ist. Kein Konto, kein Abo.

Jede Rechnung hat eine eigene Referenz, und du bekommst eine Kontrollliste dazu. So siehst du im E-Banking, wer bezahlt hat.

Magst du es mit eurer Liste ausprobieren und mir sagen, wo es hakt? Deine ehrliche Antwort hilft mir mehr als ein Kauf.

Liebe Grüsse
Fatih
```

## Woran wir es messen

Unter `own_offers.products.bulk_collection` in `/admin/market.json`, pro Tag gezählt, ohne Personen:

| Zahl | Bedeutet |
|---|---|
| `view` | die Seite `/verein` wurde in einem Browser geöffnet (oder das Angebot von einem Agenten) |
| `free` | ein Muster wurde erstellt: jemand hat eine echte Liste eingefügt |
| `tried` | die Prüfung vor dem Kauf lief durch: jemand hat auf «erstellen» gedrückt |
| `buy` | die Bestellung wurde angelegt, Stripe geöffnet |
| `delivered` | geliefert und belastet: Umsatz |

Die Lesart: `view` ohne `free` heisst, die Seite überzeugt nicht oder die Liste einzufügen ist zu mühsam. `free` ohne
`buy` heisst, das Muster überzeugt nicht oder der Preis. `buy` ohne `delivered` heisst, Stripe oder die Lieferung.

## Regeln

- **Stripe ist Pflicht:** bezahlt wird nur über Stripe, direkt an Kula Labs. Ohne freigegebenes Stripe-Konto zeigt die
  Seite nur das Muster und keinen Kaufknopf.
- **Bedingungen und Datenschutz im selben PR**, Version 2026-11-28c: 2h (das Muster), neu 2l (das Vereinspaket: Preis
  pro Versand, Lieferung, was nicht geprüft wird), Datenschutz «The collection for a club».
- **Mitgliederlisten sind Daten Dritter.** Wer die Liste sendet, bleibt verantwortlich; wir bearbeiten sie in seinem
  Auftrag und nur, um die Datei zu bauen. Beim Muster wird nichts gespeichert. Bei einem Kauf bleiben Liste und Datei
  30 Tage bei der Bestellung und werden dann gelöscht, wie bei jeder Bestellung.
- **Keine Zusage ohne Fundstelle:** Die Seite sagt nicht, wer bezahlt hat, versendet nichts und reicht nichts bei
  einer Bank ein, und sie sagt das.
- **Kula Labs zahlt nie drauf:** Es gibt keinen Geldfluss hinaus. Wird nichts geliefert, wird nichts belastet.
- **Wer kaufen darf**, steht unverändert in den Bedingungen (3): Unternehmen, oder Personen ab 18 ausserhalb der EU.
  Das Kästchen auf der Seite sagt genau das.

## 10 USPs

1. **Aus der Liste, die schon da ist.** Excel einfügen oder Datei wählen. Keine Vorlage, kein Import-Assistent.
2. **Zuerst gratis die Wahrheit.** Jede Adresse wird vor dem Kauf nach den Regeln der QR-Rechnung geprüft, mit
   Zeilennummer und Grund auf Deutsch.
3. **Bezahlt wird bei Lieferung.** Die Karte wird reserviert und erst belastet, wenn die Datei da ist.
4. **Wer hat bezahlt?** Eigene Referenz pro Rechnung und eine Kontrollliste für Excel.
5. **Kein Konto, kein Abo.** Ein Preis pro Versand, gleich für 30 oder 300 Mitglieder.
6. **Die Datei verlässt den Browser nicht.** Die Excel-Datei wird im Browser gelesen; gesendet wird nur die Liste, die
   die Seite zeigt.
7. **Normale IBAN oder QR-IBAN.** Beides geht, die Seite erkennt es und wählt die richtige Referenz.
8. **Vier Sprachen für Brief und Zahlteil**, auf einer deutschen Seite.
9. **Fenstercouvert.** Die Adresse steht dort, wo das Fenster ist.
10. **Signierte Quittung** wie bei jedem Kauf auf PazAIr, für die Revision.

## 10 Innovationen

1. **Das Muster misst die ganze Datei.** Es baut alle Seiten, gibt zwei heraus und sagt, ob die Bestellung lieferbar
   ist. Niemand erfährt erst nach dem Zahlen, dass der Brief zu lang war.
2. **Ein PDF, das gleiche Seitenteile selbst findet.** Der Baustein gruppiert Zeichenbefehle nach den Seiten, auf denen
   sie stehen, und speichert jede Gruppe einmal. Ein Brief von 3000 Zeichen kostet seine Bytes einmal, nicht 300-mal.
3. **Ein QR-Code als ein Bild mit einem Bit pro Punkt**, vier Punkte pro Modul: klein, und scharf auch dort, wo ein
   Betrachter Bilder glättet.
4. **Excel lesen ohne Bibliothek und ohne Upload:** das Zip-Verzeichnis, die Texte und das erste Blatt, mit dem, was
   der Browser selbst kann.
5. **Spalten am Inhalt erkennen:** Ohne Überschrift findet die Seite PLZ, Ort, Strasse, Namen und Betrag daran, was
   in den Zellen steht.
6. **Die Seite lügt nicht über das Produkt:** Ein Test hält fest, dass jede Zeile, die die Seite «in Ordnung» nennt,
   eine Rechnung ist, die das Werkzeug baut.
7. **Eine Referenz, die jeder nachrechnen kann:** ISO 11649 im Browser erzeugt, vom Werkzeug geprüft.
8. **«Eingabe abgelehnt» statt «Lieferung gescheitert»:** Ein Tippfehler des Käufers ist kein gebrochenes Wort des
   Verkäufers. Nichts wird belastet, und das Angebot bleibt in der Suche.
9. **Ein Produkt, zwei Kunden:** Dieselbe Bestellung macht ein Mensch auf `/verein` und ein Agent mit `buy`. Der Agent
   eines Treuhänders kann für zwanzig Vereine bestellen.
10. **Der Rückweg auf Deutsch:** Nach Stripe landet der Kassier wieder auf der Seite, von der er kam, mit Datei,
    Kontrollliste und dem Hinweis, wie er druckt.

## Wie es Kula Flow speist

Das Vereinspaket ist die erste Stelle, an der Menschen mit einem echten Bedarf durch einen gezählten Trichter gehen.
Kula Flow bekommt daraus, was ihm bisher fehlte: ein Signal mit Geld dahinter. `view`, `free`, `tried`, `buy` und
`delivered` sagen pro Tag, wo der Weg reisst. Daraus kann Kula Flow Vorschläge als Karte in Vision ableiten: den Text
ändern, wenn `free` fehlt; den Preis prüfen, wenn `buy` fehlt; das nächste Paket für dieselbe Kundschaft bauen
(Mahnlauf für die, die nicht bezahlt haben; Spendenbescheinigung; Kursrechnungen für Schulen), wenn `delivered` kommt.
Kula Flow schlägt vor und misst. Preise, Texte an Kunden und neue Zahlwege bleiben bei Fatih.

## Was bei Fatih bleibt

1. **Mergen:** [Pull Request 390 in Kula-Labs/jobflow-a2a](https://github.com/Kula-Labs/jobflow-a2a/pull/390). Der
   Deploy läuft danach von selbst. Die Seite ist dann live und zeigt den Preis, den das Angebot im Moment hat (CHF 10.00).
2. **Preis live setzen**, nach dem Deploy. Das Skript fragt nach dem PazAIr-Schlüssel von Kula Labs und zieht Preis
   (CHF 19.00) und Text des Angebots nach:

   ```
   cd jobflow-a2a-deploy
   git pull
   powershell -ExecutionPolicy Bypass -File pazair\scripts\listings.ps1
   ```

3. **Einmal selbst durchspielen** mit einer echten Liste, bis und mit Zahlung: `https://pazair.ch/verein`. Das ist der
   erste Franken, und du siehst, was der Kassier sieht.
4. **Fünf bis zehn Nachrichten senden**, Text oben.
5. **Nach zehn Besuchen** die Zahlen ansehen (oben) und entscheiden, was als Nächstes kommt.
