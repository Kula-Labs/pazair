# Der Verweis: mit einem Link verdienen, hundertmal grösser gedacht

> **Der Link zahlt, der Agent noch nicht. Jedes Programm bezahlt nur den freiwilligen Klick eines Menschen. Der Faktor
> 100 entsteht darum nicht aus mehr Links auf pazair.ch, sondern aus den Menschen hinter fremden Agenten, und wie oft
> ein Mensch kauft, nachdem sein Agent eine gekennzeichnete Empfehlung weitergereicht hat, hat noch niemand gemessen.
> Diese Zahl ist der erste Schritt.**

Stand 28. November 2026. Antwort auf Fatih: «Prüfe Webseiten, die Dropshipping anbieten, wo man nur verlinken muss,
vielleicht sogar im Multi-Level-Marketing. Wir müssen nichts verpacken, nichts verkaufen. Nimm die Idee und erweitere
sie um Faktor 100.» Dahinter steht eine Recherche vom selben Tag mit 194 Quellen; sie liegt bei Fatih, nicht in
diesem Repo. Hier steht, was daraus für PazAIr folgt. Zahlen ohne Quelle sind Rechnungen mit genannten Annahmen.
Das ist keine Rechts- und keine Steuerberatung.

## Drei Antworten vorweg

1. **«Dropshipping nur mit Link» gibt es nicht.** Beim Dropshipping ist der Shop-Betreiber der Verkäufer: Shopify
   schreibt seinen Dropshipping-Händlern, sie müssten die Gesetze einhalten «as if you're a retailer», mit
   Rückgaberegelung und Produkthaftung ([Shopify Help](https://help.shopify.com/en/manual/compliance/legal/dropshipping)).
   Was Fatih meint, heisst Affiliate: Der Händler verkauft, PazAIr verweist und erhält pro Kauf eine Provision.
2. **Multi-Level: nein, aus drei Gründen.**
   - Das Schweizer Recht zählt keine Stufen. Unlauter ist nach Art. 3 Abs. 1 lit. r UWG, was «hauptsächlich durch die
     Anwerbung weiterer Personen einen Vorteil» bedeutet; es verlangt keine Eintrittszahlung und trifft auch den, der
     solche Bedingungen nur «in Aussicht stellt» ([UWG](https://www.fedlex.admin.ch/eli/cc/1988/223_223_223/de)).
   - Stripe, über das bei PazAIr jede Zahlung läuft, führt «Multilevel marketing services offering commission or
     recruitment-based sales» und «"Get rich quick" schemes» auf seiner Liste eingeschränkter Geschäfte
     ([Stripe](https://stripe.com/legal/restricted-businesses)).
   - PazAIr verspricht öffentlich und signiert genau eine Stufe: `"levels": 1`, und unter `never` steht «a second
     level» (`/.well-known/pazair-facts.json`, Bedingungen 6). Eine eigene zweite Stufe machte das Versprechen
     unwahr; an Zwei-Stufen-Programmen anderer nimmt PazAIr darum auch nicht teil.
3. **Affiliate: ja, aber nicht mit Waren und nicht mit Maschinen.** Amazon zahlt 1 bis 4,5 % auf die meisten Waren
   ([Amazon](https://affiliate-program.amazon.com/help/node/topic/GRXPHT8U84RAYDXZ)); Software für Agent-Builder zahlt
   15 bis 50 % über meist zwölf Monate. Und kein gelesenes Regelwerk zahlt für einen Maschinenklick: Sovrn verlangt
   «a human Reader» ([Sovrn](https://www.sovrn.com/service-policies/commerce-publisher-code-of-conduct/)), CJ zahlt
   nichts für Transaktionen über «any device, program, robot» ([CJ](https://www.cj.com/legal/psa-us)).

## Die Rechnung, ohne Schönfärberei

| | Zahl | Woher |
|---|---|---|
| Besuche in 28 Tagen | 21'661, davon 14'190 Maschinen und 7'471 mit Browser | `/advertise/audience.json` |
| Warenlinks auf pazair.ch | rund USD 3 bis 55 pro 28 Tage | Rechnung: 1 bis 5 % klicken, 1 bis 3 % kaufen, 3 bis 4 % Provision auf USD 123 Warenkorb ([impact.com](https://impact.com/affiliate/affiliate-marketing-benchmark/)) |
| Software-Programme auf pazair.ch | bis rund USD 540 pro Monatskohorte, verteilt über 12 Monate | Rechnung: 5 % klicken, 0,8 % kaufen, USD 50 im Monat, 30 % für 12 Monate ([Rewardful 2026](https://rewardful.com/articles/state-of-saas-affiliate-programs-report)) |
| Wie viele Affiliates je einen Verkauf erzielen | 1,28 % | [Rewardful 2026](https://rewardful.com/articles/state-of-saas-affiliate-programs-report), 2'847 Programme |
| Ein Kauf über einen Lieferanten für Agenten | rund USD 2.46 für PazAIr und USD 2.46 für den Besitzer des Agenten | Rechnung: angenommen 8 % Händlersatz auf USD 123, der Lieferant behält die Hälfte ([Channel3](https://channel3.ai/docs/faq/commissions.md)), PazAIr teilt hälftig |
| Tausend solche Käufe im Monat | rund USD 2'460 | dieselbe Rechnung |
| Besucher, die heute ein Werkzeug aufrufen | 135 in 28 Tagen | `/advertise/audience.json` |

Zwei Sätze dazu. Mit Waren verdient PazAIr auf dem heutigen Besuch nach dieser Rechnung weniger, als die
Auszahlungsschwellen der Netzwerke verlangen. Und zwischen 135 Werkzeug-Aufrufern und tausend zugeordneten Käufen im Monat liegt kein
Programm, sondern ein Publikum: die Menschen hinter den Agenten, die PazAIr fragen.

## Was die Programme vorgeben

Die Regeln der Programme bestimmen den Bau, nicht umgekehrt.

- **Nur der Mensch klickt.** Ein Agent, der einen Tracking-Link abruft, um das Angebot zu prüfen, erzeugt das Muster,
  das zur Sperre führt. Awin definiert den Klick als «intentional and voluntary following of a Link» durch eine Person
  ([Awin-Bedingungen 2026](https://www.awin.com/docs.awin.com/Legal/Publisher+Terms/2026/EN+%28UK%29_Awin+Ltd+Publisher+terms_2026.pdf)).
- **Kein Umweg über die eigene Domain.** Amazon disqualifiziert Käufe über eine Zwischenseite
  ([Amazon Program Policies](https://affiliate-program.amazon.com/help/operating/policies)), Shopify schreibt, wer den
  Link «behind your own domain» maskiere, breche die Zuordnung
  ([Shopify](https://shopify.dev/docs/agents/catalog/promoted-placement)). Der Link des Programms steht also direkt
  und sichtbar auf einer Seite von PazAIr.
- **Links in Agent-Antworten erlaubt kein klassisches Programm ausdrücklich.** Keines der gelesenen Affiliate-Programme
  und Netzwerke nennt Chatbots, MCP-Server oder Agenten als Werbefläche, keines verbietet sie beim Namen. Wer dort
  einen Link von einem Agenten weiterreichen lassen will, braucht vorher eine schriftliche Freigabe. Für Agenten
  geschrieben sind nur die Regeln weniger Lieferanten (Stufe 2).
- **Provision teilen heisst Sub-Netzwerk.** Awin verlangt dafür die Zulassung, volle Haftung für jeden Sub-Publisher
  und dessen Kennung bei jedem Verkauf, und verbietet Sub-Netzwerke unter Sub-Netzwerken
  ([Awin Subnetwork Code of Conduct](https://resources.awin.com/code-of-conduct-subnetwork/en-gb/)). Das ist dieselbe
  eine Stufe, die PazAIr schon verspricht.
- **Die Kennzeichnung steht am Link.** Die FTC hält die Worte «affiliate link» allein für ungenügend und «paid link»
  direkt am Link für richtig ([FTC FAQ](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking));
  das OLG München liess am 30. Oktober 2025 einen allgemeinen Provisionshinweis nicht genügen
  ([29 U 2633/24 e](https://www.gesetze-bayern.de/Content/Document/Y-300-Z-GRURRS-B-2025-N-38058)); die Schweizer
  Lauterkeitskommission verlangt, dass kommerzielle Kommunikation «als solche eindeutig erkennbar» ist
  ([Grundsatz B.15](https://www.faire-werbung.ch/wp-content/uploads/2025/01/SLK-Grundsaetze_DE-1.1.2025.pdf)).
- **Amazon und eBay passen nicht.** Amazon erlaubt Links nur auf der eigenen Site und keine Belohnung für Dritte; eBay
  verbietet, Partnerdaten ohne Zustimmung «to any foundation model, LLM, or generative AI service» zu geben
  ([eBay Partner Network Agreement](https://partnernetwork.ebay.com/legal)).

## Die vier Stufen

Jede Stufe hat ein Tor: Sie beginnt erst, wenn die Stufe davor ihre Zahl geliefert hat.

| Stufe | Was | Was sie vervielfacht | Braucht | Tor zur nächsten |
|---|---|---|---|---|
| 1 | **Der Verweis für Menschen.** Gekennzeichnete Links zu fünf bis sieben Programmen, die zu den Seiten passen | den Ertrag pro Kunde: USD 100 bis 500 statt USD 4 pro Warenkauf | Fatihs Ja zum neuen Einnahmeweg, seine Anmeldung bei den Programmen, Bedingungen 7f, Datenschutz | 30 Tage gemessen: wie viele Menschen klicken, wie viele kaufen |
| 2 | **Die leere Suche antwortet.** Findet `ask_market` kein Angebot, trägt die Antwort im eigenen Feld einen gekennzeichneten Verweis auf die echte Welt, aus einem Katalog, der für Agenten geschrieben ist | das Regal: von 57 Angeboten auf Millionen Produkte | einen Lieferanten, dessen Regeln für Agenten geschrieben sind | die erste öffentliche Zahl Agent zu Mensch |
| 3 | **Der Agent verdient mit.** Der Besitzer des Agenten, der einen Verweis weitergereicht hat, erhält einen Anteil, eine Stufe, über Stripe, erst wenn das Programm bezahlt hat | die Reichweite: jeder Agent mit Schlüssel wird ein Kanal | die schriftliche Erlaubnis des Lieferanten, Provision weiterzugeben, oder die Zulassung als Sub-Netzwerk; Kanzlei und Steuerberatung zu den Fragen unten | Anteile fliessen, Stornos werden verrechnet |
| 4 | **Das eigene Netz.** Jede Firma, die von Agenten empfohlen werden will, eröffnet auf PazAIr ihr Partnerprogramm und zahlt die Provision über Stripe: Bedingungen 6a, heute nur für JOBFLOW, für alle | die Marge und die Unabhängigkeit: PazAIr ist das Netzwerk, nicht dessen Sub-Publisher | Firmen, die es wollen; die Zahl aus Stufe 2 als Beweis | |

### Stufe 1: der Verweis für Menschen

Die Programme, die zum Publikum passen und eine Seite ohne grosse Reichweite aufnehmen, alle von den eigenen Seiten
der Anbieter gelesen:

| Programm | Provision | Passt zu | Quelle |
|---|---|---|---|
| Firecrawl | 25 % für 12 Monate, danach 15 % (der Marktplatz von Dub zeigt für dasselbe Programm abweichend 15 %) | Agent-Builder; nennt «tool directories» als erwünschten Kanal | [Firecrawl](https://www.firecrawl.dev/affiliates) |
| n8n | 30 % für 12 Monate | die n8n-Beispiele im Schaufenster | [n8n](https://n8n.io/affiliates/) |
| Make | 35 % für 12 Monate | Automationen | [Make](https://www.make.com/en/affiliate) |
| Apify | 20 %, ab dem vierten Monat 30 %, höchstens USD 2'500 pro Kunde | Werkzeuge für Agenten | [Apify](https://docs.apify.com/legal/affiliate-program-terms-and-conditions) |
| Railway | 15 % jeder Rechnung für 12 Monate, bar über Stripe Connect | wer einen Agenten hostet | [Railway](https://railway.com/affiliate-program) |
| Payrexx | 30 % dauerhaft auf jedes vermittelte Abo | Schweizer KMU, die Zahlungen annehmen | [Payrexx](https://payrexx.com/en/partner/solution-partners) |
| Infomaniak | 25 % im ersten Jahr, steigend bis 50 % | Schweizer KMU; Domains und klassisches Hosting sind ausgenommen | [Infomaniak](https://www.infomaniak.com/en/support/faq/2247/discover-infomaniaks-affiliate-commission-system) |
| bexio | CHF 200 pro vermitteltem Kunden, CHF 350 ab dem 11., CHF 500 ab dem 31. | wer Rechnungen schreibt; steht neben JOBFLOW, darum ein eigener Entscheid | [bexio](https://www.bexio.com/de-CH/lead-partnerprogramm) |

So wird es gebaut:

- **Eine Seite pro Verweis** auf pazair.ch, mit dem, was das Werkzeug kann, für wen es passt und wofür nicht. Der Link
  des Programms steht direkt darauf. Am Link steht «Ad» und der ganze Satz: «PazAIr earns a commission if you buy
  through this link.» Nicht im Fuss, nicht hinter einem Zeichen.
- **Ein Agent bekommt nie den Tracking-Link.** Die Antwort an einen Agenten trägt im eigenen Feld, neben dem heutigen
  `advertisement` (Bedingungen 7a), die Adresse der PazAIr-Seite, die nackte Adresse des Anbieters, das Kennzeichen
  `paid: true`, den Zahler und den fertigen Satz für den Menschen. Den Link des Programms löst erst der Klick eines
  Menschen auf der Seite aus.
- **Crawler sehen die nackte Adresse.** Bekannte Crawler und Agenten erhalten dieselbe Seite mit der nackten Adresse
  des Anbieters statt des Programm-Links, weil die Netzwerke einen Filter gegen Maschinenklicks verlangen. Die
  Trennung von Maschine und Mensch zählt PazAIr schon (`census.ts`).
- **Die Reihenfolge kennt keine Provision.** Ein Verweis steht nie unter den Suchergebnissen und nie, wenn es
  Angebote gibt, wie die Anzeige heute. Ein Test hält fest, dass die Sortierung keine Provisionsdaten liest.
- **Gezählt wird ohne Person:** Verweise gezeigt, an Agenten gegeben, von Menschen geöffnet, Klicks auf den Link des
  Programms, bestätigte Käufe laut Programm. Die Zahlen stehen in `/transparency`.

### Stufe 2: die leere Suche antwortet

Heute endet eine Suche ohne Angebot bei einer gebuchten Anzeige oder bei nichts. Mit einem Katalog der echten Welt
endet sie bei drei gekennzeichneten Verweisen. Ehrlich dazu: Solche Suchen sind heute selten. Der Publikumsbericht
führt für 30 Tage eine einzige Suche ohne Verkäufer, die mindestens zweimal vorkam; gefragt werden vor allem die
eigenen Beispiele. Die Stufe trägt erst, wenn Agenten PazAIr nach mehr fragen, und ein volles Regal ist ein Grund
dafür. Zwei Lieferanten kommen in Frage, deren Regeln für Agenten geschrieben sind:

- **Channel3:** Produktsuche per API und MCP, «Channel3 keeps 50% of the merchant commission», Auszahlung über Stripe
  ab USD 5 nach der Rückgabefrist, der Hinweis gehört «clearly and conspicuously near the links on every page, screen,
  or message» ([Channel3](https://channel3.ai/docs/faq/commissions.md)).
- **Shopify Promoted Placements:** 0,3 % auf zugeordnete Käufe, 7 Tage Zuordnung, Kennzeichnung in der Antwort
  Pflicht, nur auf Einladung ([Shopify](https://shopify.dev/docs/agents/catalog/promoted-placement)). Auf USD 123 sind
  das rund 37 Cent: ein Zugang, kein Geschäft.

Daneben gibt es eine Provision, die auch zählt, wenn ein Agent auslöst: Firecrawl beteiligt Plattformen, die sein
Werkzeug einbauen, an der bezahlten Nutzung ([Firecrawl Partner Program](https://www.firecrawl.dev/firecrawl-for-platforms/partner-program)),
und im Apify Store zahlt der Kunde pro Lauf eines Werkzeugs, ausdrücklich auch über MCP
([Apify](https://apify.com/partners/actor-developers)). Der Actor «Swiss Company Dossier» liegt fertig in
`jobflow-a2a/apify/` (Weg 8 in [UMSATZ-AB-HEUTE.md](UMSATZ-AB-HEUTE.md)).

### Stufe 3: der Agent verdient mit

Was ein Netzwerk von einem Sub-Netzwerk verlangt (gefolgert aus dem Subnetwork Code of Conduct von Awin), hat
PazAIr für seine Agenten schon:

| Verlangt | Vorhanden |
|---|---|
| eine stabile Kennung pro Sub-Publisher bei jedem Verkauf | die Agent-ID; als Kennung pro Agent, nie pro Mensch |
| eine öffentliche, einsehbare Platzierung | der Laden jedes Agenten, `/shop/<agent>` |
| eine Eingangsprüfung | der Anteil geht nur an ein Stripe-Konto auf den Namen des Empfängers (Bedingungen 6) |
| ein Sperrverfahren | Meldungen gegen Agenten werden gezählt und geprüft, der Not-Aus stoppt die Geldschritte (Bedingungen 2d) |
| genau eine Stufe | Bedingungen 6: «One level only» |
| das Rückbuchungsrisiko beim Betreiber | Anteile frühestens 14 Tage nach dem Geldeingang, ab 10.00, bei Storno zurück |

Offen ist die Erlaubnis selbst: Ob ein Lieferant für Agenten das Weitergeben von Provision an Dritte gestattet,
steht auf keiner gelesenen Seite. Das klärt eine schriftliche Anfrage, nicht der Code.

### Stufe 4: das eigene Netz

Bedingungen 6a sind ein Partnerprogramm: Ein Agent empfiehlt JOBFLOW, der Betrieb abonniert, die App meldet jede
bezahlte Rechnung signiert, der Agent erhält zwölf Monate einen Anteil über Stripe. Dasselbe kann PazAIr jeder Firma
anbieten, die von Agenten empfohlen werden will. Dann ist PazAIr das Netzwerk: Die Provision kommt über Stripe herein
und geht über Stripe hinaus, und keine fremde Klausel steht dazwischen. Der Preis dafür ist der dritte Kaltstart nach
Käufern und Verkäufern. Darum steht diese Stufe am Schluss und nicht am Anfang: Sie braucht die Zahl aus Stufe 2 als
Beweis, dass Empfehlungen von Agenten zu Käufen führen.

## Geprüft gegen die eigenen Regeln

| Regel | Befund |
|---|---|
| Stripe ist Pflicht (24. Oktober) | Auf PazAIr wird nichts verkauft: Der Kauf geschieht beim Händler. Die Provision kommt aber ausserhalb von Stripe herein (Bank, PayPal, Wise, vereinzelt Stripe Connect). Das ist ein neuer Einnahmeweg und braucht Fatihs ausdrückliches Ja. Anteile an Agenten gehen weiter nur über Stripe. |
| Kein Angebot ohne von Stripe freigegebenen Verkäufer | Ein Verweis ist kein Angebot: eigenes Feld, eigene Seite, nie unter den Ergebnissen, kein Beleg, keine Schlichtung. Das steht neu in den Bedingungen (Entwurf unten). |
| Werbung ist immer gekennzeichnet | «Ad» und der Satz am Link; im Feld für Agenten als Daten. |
| Eine Stufe, nie eine zweite | Stufe 3 ist eine Stufe. Zwei-Stufen-Programme anderer werden nicht genutzt. |
| Kein fremdes Skript | Links entstehen auf dem Server oder stehen fest in der Seite. |
| Kula Labs zahlt nie drauf | Ein Anteil wird erst fällig, wenn das Programm bezahlt hat und seine Stornofrist vorbei ist. |
| Regelkonform vor Umsatz | Kein Programm, dessen Bedingungen den Kanal nicht tragen; Agent-Antworten nur mit schriftlicher Freigabe. |

Der Entwurf für die Bedingungen, als neuer Absatz 7f, englisch wie der Rest:

> **7f · Paid links.** A page of PazAIr, and the field «referral» in an answer to an agent, may name a product of a
> third party for which that third party or its partner programme pays Kula Labs a commission when a person buys or
> subscribes after following the link. Every such link carries the mark «Ad» and the sentence «PazAIr earns a
> commission if you buy through this link», at the link. Such a product is not a listing: it is not sold on PazAIr,
> its seller is not verified through PazAIr, Kula Labs has not checked it, no receipt is issued for it, and sections
> 2 to 2k do not apply; the contract is between the buyer and the third party, on the third party's terms. A
> commission never changes the order of search results or listings, and a paid link is never shown among them. An
> agent that passes a paid link on passes its mark and its sentence with it. Nothing is charged on PazAIr for a paid
> link.

Die Datenschutzerklärung nennt dazu die Empfänger (das Programm und der Händler), den Zweck, die Staaten und dass
PazAIr selbst kein Cookie setzt; die Kennung im Link bezeichnet nie einen Menschen.

## Was Fachleute klären, bevor Anteile fliessen

Für Stufe 1 genügen die ersten drei. Die übrigen gelten ab Stufe 3.

1. Genügt «Ad» mit dem Satz am Link nach Grundsatz B.15, und welches Lauterkeitsrecht erreicht eine Schweizer Seite
   mit Publikum in den USA und der EU? (Kanzlei)
2. Wer holt für Besucher aus der EU die Einwilligung ein, die der Europäische Datenschutzausschuss für
   Affiliate-Links verlangt ([EDPB, Leitlinien 2/2023](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf))?
   Vorschlag: Bis das geklärt ist, sehen Besucher aus der EU keinen Verweis. (Datenschutzrecht)
3. Provision aus dem Ausland trägt keine Schweizer MWST, zählt aber zu den CHF 100'000 Umsatz «im In- und Ausland»
   ([MWSTG](https://www.fedlex.admin.ch/eli/cc/2009/615/de), Art. 8 und 10). (Steuerberatung)
4. Anteile an Empfänger im Ausland lösen ab CHF 10'000 im Jahr die Bezugsteuer aus (Art. 45 MWSTG). (Steuerberatung)
5. Anteile an Personen in der Schweiz können als Lohn gelten: Das AHV-Merkblatt nennt «Agentinnen und Agenten»
   grundsätzlich unselbständig ([Merkblatt 2.02](https://www.ahv-iv.ch/p/2.02.d)). (Ausgleichskasse)
6. Bleibt das Teilen der eigenen Provision gewöhnliches Geschäft, oder wird es Finanzintermediation? Die Texte
   sprechen für das Erste, solange PazAIr kein fremdes Geld hält ([GwG](https://www.fedlex.admin.ch/eli/cc/1998/892_892_892/de),
   Art. 2 Abs. 3). (Finanzmarktrecht)
7. Bleibt ein kostenloser Anteil auf einer Stufe sicher ausserhalb von Art. 3 Abs. 1 lit. r UWG? (Kanzlei)

## Was wir nie tun

- **Nie Multi-Level, nie eine zweite Stufe,** auch nicht als Teilnehmer in einem fremden Programm.
- **Nie Dropshipping.** Kula Labs wird nicht Verkäufer von Waren.
- **Nie eine Maschine durch einen Tracking-Link.** Kein Agent, kein Crawler, kein eigener Test.
- **Nie ein bezahlter Link ohne «Ad» und den Satz am Link.**
- **Nie Provision in der Reihenfolge.**
- **Nie ein Programm gegen seine eigenen Regeln:** kein Amazon, kein eBay, kein Link in einer Agent-Antwort ohne
  schriftliche Freigabe.
- **Nie «schnell reich»:** keine Trading-Kurse, keine Krypto-Programme, keine Marktplätze für Digitalprodukte mit
  Urteilen wegen intransparenter Verträge.
- **Nie ein Anteil, bevor das Programm bezahlt hat.**

## 10 USPs

1. **Maschinen und Menschen sind getrennt gezählt:** 10'193 Verzeichnisse, 3'997 Agenten, 7'471 Browser. Programme
   verlangen diese Trennung; PazAIr hat sie. (gebaut)
2. **Werbung steht im eigenen, beschrifteten Feld,** nie unter den Ergebnissen. (gebaut, Bedingungen 7a)
3. **Genau eine Stufe,** deckungsgleich mit dem, was Netzwerke von einem Sub-Netzwerk verlangen. (gebaut)
4. **Nichts wird ausbezahlt, bevor das Geld da ist:** 14 Tage, ab 10.00, Storno zurück. (gebaut)
5. **Kein fremdes Skript, kein eigenes Cookie.** (gebaut)
6. **Anteile nur über Stripe an ein Konto mit geprüftem Namen.** (gebaut)
7. **Jeder Empfehlende hat eine öffentliche Seite und eine Bilanz:** Laden und Word Pass. (gebaut)
8. **Signierte Quittungen, täglich in Bitcoin und Stellar verankert:** das Werkzeug für einen Beleg der Offenlegung
   ist da. (gebaut)
9. **Ein Schweizer Rechtsträger mit Namen, Adresse und UID.**
10. **Zwei Publika unter einem Dach:** Agent-Builder in den USA und KMU in der Schweiz.

## 10 Innovationen

1. **Der Menschenklick als Bauprinzip.** Der Link des Programms entsteht erst durch den Klick eines Menschen; Agenten
   tragen eine Seite und eine nackte Adresse. (Stufe 1)
2. **Kennzeichnung als Daten.** «Bezahlt», der Zahler und der fertige Satz reisen im selben Objekt wie der Link, durch
   jede Kette von Agenten. (Stufe 1)
3. **Die signierte Offenlegung.** Jeder Verweis, den PazAIr ausgibt, bekommt einen signierten, verankerten Eintrag:
   was, wann, mit welchem Satz. Wer ihn weitergibt, kann belegen, dass er offengelegt hat. (Stufe 2)
4. **Die erste öffentliche Zahl Agent zu Mensch.** Wie viele Verweise Agenten weiterreichen, wie viele Menschen
   öffnen, klicken, kaufen: in `/transparency`, als Summen. In einer Umfrage von impact.com unter 1'128 Käufern in
   den USA schlossen nur 31 % derer, die einer KI-Empfehlung folgten, über einen messbaren Link ab
   ([impact.com](https://impact.com/resources/reports/ai-attribution-gap/)); eine Messung fehlt. (Stufe 1)
5. **Die Reihenfolge ohne Provision, als Test.** Die Sortierung liest keine Provisionsdaten, und ein Test bricht,
   wenn sie es je tut. (Stufe 1)
6. **Die Kennung pro Agent, nie pro Mensch,** vom Link über den Vertrag bis zur Datenschutzerklärung. (Stufe 1)
7. **Der Agentenladen als Sub-Publisher.** Der Laden ist die öffentliche Platzierung, die ein Netzwerk pro
   Sub-Publisher verlangt. (Stufe 3)
8. **Der Anteil nach der Frist des Programms.** Stornos des Programms werden im selben Buch verrechnet wie
   Erstattungen im Markt. (Stufe 3)
9. **Nutzungs- statt Klickprovision.** Ein Werkzeug auf PazAIr, das auf der Plattform eines Partners läuft, verdient
   an der bezahlten Nutzung, auch wenn ein Agent auslöst. (Stufe 2)
10. **6a für alle.** Jede Firma eröffnet in einer Stunde ein Partnerprogramm für Agenten, mit Provision über Stripe,
    einer Stufe und einem Beleg pro Auszahlung. (Stufe 4)

## Wie es Kula Flow speist

Jede bestätigte Provision ist ein von dritter Seite geprüfter Beleg, dass eine Empfehlung zu einem echten Kauf
geführt hat. Kula Flow lernt daraus, welche Verweise zu welchen Suchen passen, sieht in den Suchen ohne Angebot,
wofür ein Programm fehlt, und schlägt es als Karte in Vision vor. Es meldet sich bei keinem Programm an, ändert
keinen Satz und zahlt nichts aus: Das bleibt bei Fatih.

## Was bei Fatih bleibt

1. **Die eine Frage:** Darf PazAIr Provision für Verweise als neuen Einnahmeweg aufnehmen, zunächst nur Stufe 1
   (gekennzeichnete Links für Menschen, die Software-Programme der Tabelle, keine Anteile an Dritte), obwohl diese
   Provision nicht über Stripe auf PazAIr hereinkommt, sondern von den Programmen selbst ausbezahlt wird?
2. **Bei einem Ja:** Fatih meldet sich bei den Programmen an (Firecrawl, n8n, Make, Apify, Railway; Payrexx und
   Infomaniak für die Schweiz) und füllt bei US-Programmen das Formular W-8BEN aus. Claude baut Stufe 1 mit
   Bedingungen 7f, Datenschutz und Tests.
3. **Ein Nebenentscheid:** bexio neben JOBFLOW auf der Rechnungsseite, ja oder nein. CHF 200 einmal stehen gegen
   ein eigenes Abo ab CHF 69 im Monat.
4. **Nach 30 Tagen:** die Zahl ansehen und über Stufe 2 entscheiden.
