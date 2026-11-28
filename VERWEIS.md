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

Fatih darauf am selben Tag: «Mach es so, dass es sich rechnet vor allem für uns.» Das ist hier eingearbeitet: was bei
Kula Labs ankommt, bestimmt die Reihenfolge, und Stufe 1 ist gebaut
([Kula-Labs/jobflow-a2a, Pull Request 388](https://github.com/Kula-Labs/jobflow-a2a/pull/388)). Sichtbar wird sie erst,
wenn Fatih die Partnerlinks der Programme einträgt.

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
| Ein Kauf über einen Lieferanten für Agenten | rund USD 4.92 für PazAIr | Rechnung: angenommen 8 % Händlersatz auf USD 123, der Lieferant behält die Hälfte ([Channel3](https://channel3.ai/docs/faq/commissions.md)) |
| Davon in Stufe 3 an den Besitzer des Agenten | ein Fünftel, rund USD 0.98; bei PazAIr bleiben rund USD 3.94 | Rechnung mit dem Satz von 20 %, siehe unten |
| Tausend solche Käufe im Monat | rund USD 4'920, nach Anteilen rund USD 3'940 | dieselbe Rechnung |
| Besucher, die heute ein Werkzeug aufrufen | 135 in 28 Tagen | `/advertise/audience.json` |

Zwei Sätze dazu. Mit Waren verdient PazAIr auf dem heutigen Besuch nach dieser Rechnung weniger, als die
Auszahlungsschwellen der Netzwerke verlangen. Und zwischen 135 Werkzeug-Aufrufern und tausend zugeordneten Käufen im
Monat liegt kein Programm, sondern ein Publikum: die Menschen hinter den Agenten, die PazAIr fragen.

## Damit es sich für uns rechnet

Fatihs Vorgabe vom 28. November. Sechs Regeln, jede steht im Code oder in der Reihenfolge der Stufen.

1. **Das Eigene zuerst.** Ein Verweis erscheint nur, wenn eine Suche kein Angebot gefunden hat und keine Firma den
   Werbeplatz dieser Suche bezahlt hat. Die Tabelle zeigt, warum:

   | Was der Suchende bekommt | Was bei Kula Labs ankommt |
   |---|---|
   | ein Angebot von Kula Labs auf PazAIr | der ganze Preis, abzüglich der Kartengebühr von Stripe |
   | ein JOBFLOW-Abo | CHF 69 bis 299 im Monat, ganz |
   | ein gebuchter Werbeplatz | CHF 29 bis 99 für 30 Tage, im Voraus bezahlt |
   | das Angebot eines fremden Verkäufers | 8 % des Preises (Bedingungen 6) |
   | ein Verweis auf ein direktes Programm | 15 bis 35 % dessen, was der Kunde zwölf Monate lang zahlt |
   | ein Verweis über einen Lieferanten für Agenten | rund 4 % des Warenkorbs (angenommen 8 % Händlersatz, der Lieferant behält die Hälfte) |

2. **Nur direkte Programme.** In Stufe 1 zahlt jedes Programm Kula Labs selbst. Ein Zwischenhändler, der die Hälfte
   behält, kommt erst in Stufe 2 und nur dort, wo es kein direktes Programm gibt.
3. **Wiederkehrend vor einmalig, wenige vor vielen.** Sieben Programme statt siebzig: Jedes hat eine
   Auszahlungsschwelle (n8n EUR 100, Make und Apify drei Kunden und USD 100), und ein Guthaben, das sie nie erreicht,
   ist kein Umsatz. Zwei der sieben zahlen ohne Ende: Firecrawl 15 % nach dem ersten Jahr, Payrexx 30 %, solange das
   Abo läuft.
4. **Kein Konkurrent von JOBFLOW in der Liste.** bexio zahlt CHF 200 pro vermitteltem Kunden, einmal
   ([bexio](https://www.bexio.com/de-CH/lead-partnerprogramm)). Ein eigenes Abo ab CHF 69 im Monat ist nach drei
   Monaten mehr wert. Die Rechnungsseite führt weiter nur zu JOBFLOW.
5. **In Stufe 1 wird nichts geteilt.** Was hereinkommt, bleibt ganz bei Kula Labs, und nichts kann geschuldet sein,
   bevor es da ist.
6. **Ab Stufe 3 erhält der Agent eine Minderheit:** 20 % dessen, was bei PazAIr ankommt. Das ist der Satz, den Fatih
   am 31. Oktober für neue JOBFLOW-Partner gesetzt hat (Bedingungen 6a). Vier Fünftel bleiben bei PazAIr, und der
   Anteil wird erst fällig, wenn das Programm bezahlt hat und seine Stornofrist vorbei ist.

Was das nicht ändert: Kein Programm zahlt für einen Maschinenklick, und der Ertrag hängt an Menschen, die kaufen.
Die Regeln sorgen dafür, dass von jedem solchen Kauf möglichst viel bei Kula Labs bleibt.

## Was die Programme vorgeben

Die Regeln der Programme bestimmen den Bau, nicht umgekehrt.

- **Nur der Mensch klickt.** Ein Agent, der einen Tracking-Link abruft, um das Angebot zu prüfen, erzeugt das Muster,
  das zur Sperre führt. Awin definiert den Klick als «intentional and voluntary following of a Link» durch eine Person
  ([Awin-Bedingungen 2026](https://www.awin.com/docs.awin.com/Legal/Publisher+Terms/2026/EN+%28UK%29_Awin+Ltd+Publisher+terms_2026.pdf)).
- **Kein Umweg über die eigene Domain.** Amazon disqualifiziert Käufe über eine Zwischenseite
  ([Amazon Program Policies](https://affiliate-program.amazon.com/help/operating/policies)), Shopify schreibt, wer den
  Link «behind your own domain» maskiere, breche die Zuordnung
  ([Shopify](https://shopify.dev/docs/agents/catalog/promoted-placement)). Der Browser geht darum von PazAIrs Seite
  direkt zum Link des Programms, nie über eine Adresse von PazAIr.
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
| 1 | **Der Verweis für Menschen.** Gekennzeichnete Verweise auf sieben direkte Programme, nichts wird geteilt. Gebaut | den Ertrag pro Kunde: ein Abo-Anteil über zwölf Monate statt rund USD 4 pro Warenkauf | Fatihs Anmeldung bei den Programmen und seine Partnerlinks | 30 Tage gemessen: wie viele Menschen öffnen, wie viele kaufen |
| 2 | **Die leere Suche antwortet.** Findet `ask_market` kein Angebot, trägt die Antwort im eigenen Feld einen gekennzeichneten Verweis auf die echte Welt, aus einem Katalog, der für Agenten geschrieben ist | das Regal: von 57 Angeboten auf Millionen Produkte | einen Lieferanten, dessen Regeln für Agenten geschrieben sind | die erste öffentliche Zahl Agent zu Mensch |
| 3 | **Der Agent verdient mit.** Der Besitzer des Agenten, der einen Verweis weitergereicht hat, erhält 20 % dessen, was bei PazAIr ankommt, eine Stufe, über Stripe, erst wenn das Programm bezahlt hat | die Reichweite: jeder Agent mit Schlüssel wird ein Kanal | die schriftliche Erlaubnis des Lieferanten, Provision weiterzugeben, oder die Zulassung als Sub-Netzwerk; Kanzlei und Steuerberatung zu den Fragen unten | Anteile fliessen, Stornos werden verrechnet |
| 4 | **Das eigene Netz.** Jede Firma, die von Agenten empfohlen werden will, eröffnet auf PazAIr ihr Partnerprogramm und zahlt die Provision über Stripe: Bedingungen 6a, heute nur für JOBFLOW, für alle | die Marge und die Unabhängigkeit: PazAIr ist das Netzwerk und setzt seinen Anteil selbst | Firmen, die es wollen; die Zahl aus Stufe 2 als Beweis | |

### Stufe 1: der Verweis für Menschen

Gebaut am 28. November 2026 (`src/market/verweis.ts`, Bedingungen 7g, Datenschutz 2026-11-28b). Die sieben Programme,
alle von den eigenen Seiten der Anbieter gelesen, in der Reihenfolge, in der die Liste sie führt. Die Reihenfolge ist
eine Einschätzung, was ein Kunde für Kula Labs wert ist; nach 30 Tagen ersetzt die Messung sie.

| Programm | Provision | Passt zu | Quelle |
|---|---|---|---|
| Firecrawl | 25 % für 12 Monate, danach 15 % (der Marktplatz von Dub zeigt für dasselbe Programm abweichend 15 %) | Agenten, die das Web lesen; nennt «tool directories» als erwünschten Kanal | [Firecrawl](https://www.firecrawl.dev/affiliates) |
| Apify | 20 %, ab dem vierten Monat 30 %, höchstens USD 2'500 pro Kunde | Agenten, die Daten einer bestimmten Website brauchen | [Apify](https://docs.apify.com/legal/affiliate-program-terms-and-conditions) |
| n8n | 30 % für 12 Monate, nur n8n Cloud | Teams, die Agenten und Werkzeuge in einem Ablauf wollen | [n8n](https://n8n.io/affiliates/) |
| Make | 35 % für 12 Monate | Betriebe, die Routine zwischen ihren Apps automatisieren | [Make](https://www.make.com/en/affiliate) |
| Payrexx | 30 % dauerhaft auf jedes vermittelte Abo | Schweizer KMU und Vereine, die online bezahlt werden wollen | [Payrexx](https://payrexx.com/en/partner/solution-partners) |
| Railway | 15 % jeder Rechnung für 12 Monate, bar über Stripe Connect | wer einen Agenten oder MCP-Server hostet | [Railway](https://railway.com/affiliate-program) |
| Infomaniak | 25 % im ersten Jahr, steigend bis 50 %; Domains und klassisches Hosting sind ausgenommen | Betriebe, die ihre Daten in der Schweiz wollen | [Infomaniak](https://www.infomaniak.com/en/support/faq/2247/discover-infomaniaks-affiliate-commission-system) |

So ist es gebaut:

- **Nichts ist sichtbar ohne Fatih.** Ein Verweis lebt erst, wenn `VERWEIS = "on"` gesetzt ist und der Partnerlink
  seines Programms in der Konfiguration steht. Ohne beides antwortet jede Adresse mit 404, und keine Antwort trägt das
  Feld.
- **Der Partnerlink steht in keiner Seite.** Die Seite `/partner/<name>` trägt einen Knopf. Erst der Klick fragt
  PazAIr nach dem Link, und nur ein Browser, der von PazAIrs eigener Seite klickt, bekommt ihn; der Browser geht dann
  selbst dorthin, ohne Umweg über eine Adresse von PazAIr. Ein Skript, ein Agent oder ein Crawler bekommt die nackte
  Adresse des Anbieters.
- **Am Knopf steht «Ad» und der ganze Satz:** «PazAIr earns a commission if you buy through this link.» Darunter die
  nackte Adresse für alle, die sie vorziehen, und der Link auf die Seite des Programms, die sagt, was es zahlt.
- **Ein Agent bekommt die Seite, nie den Link.** Findet seine Suche kein Angebot, trägt die Antwort neben
  `advertisement` das Feld `referral`: `paid: true`, den Zahler, die Seite auf PazAIr, die nackte Adresse und den
  fertigen Satz für den Menschen.
- **Besucher aus der EU, dem EWR und dem Vereinigten Königreich bekommen den nackten Link,** ohne Partnercode und
  ohne Provision, bis die Frage der Einwilligung geklärt ist. Die Seite sagt das.
- **Die Reihenfolge der Suchergebnisse liest keine Provision.** Ein Test hält fest, dass dieselbe Suche mit und ohne
  Verweise dieselben Angebote in derselben Reihenfolge liefert.
- **Gezählt wird ohne Person,** öffentlich unter `/partners.json`: wie oft ein Verweis in einer Antwort hinausging,
  wie oft seine Seite in einem Browser geöffnet wurde, wie oft der Partnerlink und wie oft der nackte Link. Käufe
  zählt das Programm, nicht PazAIr.

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

Der Besitzer des Agenten, der einen Verweis weitergereicht hat, erhält 20 % dessen, was bei PazAIr ankommt, nie die
Hälfte. Bei einem Warenkauf über einen Lieferanten sind das nach der Rechnung oben rund USD 0.98 von USD 4.92; bei
einem direkten Programm ein Fünftel der Provision. Der Anteil geht über Stripe, frühestens 14 Tage nachdem das
Programm bezahlt hat, ab 10.00, und fällt bei einem Storno zurück.

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

Offen ist die Erlaubnis selbst: Ob ein Lieferant für Agenten oder ein direktes Programm das Weitergeben von Provision
an Dritte gestattet, steht auf keiner gelesenen Seite, und einzelne schliessen es aus. Das klärt eine schriftliche
Anfrage, nicht der Code.

### Stufe 4: das eigene Netz

Bedingungen 6a sind ein Partnerprogramm: Ein Agent empfiehlt JOBFLOW, der Betrieb abonniert, die App meldet jede
bezahlte Rechnung signiert, der Agent erhält zwölf Monate einen Anteil über Stripe. Dasselbe kann PazAIr jeder Firma
anbieten, die von Agenten empfohlen werden will. Dann ist PazAIr das Netzwerk: Die Provision kommt über Stripe herein
und geht über Stripe hinaus, keine fremde Klausel steht dazwischen, und PazAIr setzt seinen Anteil selbst. Den Satz
legt Fatih fest, wenn die Stufe ansteht; als Untergrenze gilt, was PazAIr heute auf jeden Verkauf nimmt, 8 % des
vermittelten Umsatzes. Der Preis dafür ist der dritte Kaltstart nach Käufern und Verkäufern. Darum steht diese Stufe
am Schluss: Sie braucht die Zahl aus Stufe 2 als Beweis, dass Empfehlungen von Agenten zu Käufen führen.

## Geprüft gegen die eigenen Regeln

| Regel | Befund |
|---|---|
| Stripe ist Pflicht (24. Oktober) | Auf PazAIr wird nichts verkauft: Der Kauf geschieht beim Anbieter. Die Provision kommt aber ausserhalb von Stripe herein (Bank, PayPal, Wise, vereinzelt Stripe Connect). Das ist ein neuer Einnahmeweg; Fatihs «Mach es so» vom 28. November ist das Ja dazu, und live wird nichts, bevor er selbst die Partnerlinks einträgt. |
| Kein Angebot ohne von Stripe freigegebenen Verkäufer | Ein Verweis ist kein Angebot: eigenes Feld, eigene Seite, nie unter den Ergebnissen, kein Beleg, keine Schlichtung. So steht es in Bedingungen 7g. |
| Werbung ist immer gekennzeichnet | «Ad» und der Satz am Knopf; im Feld für Agenten als Daten. |
| Eine Stufe, nie eine zweite | Stufe 1 teilt nichts. Stufe 3 ist eine Stufe. Zwei-Stufen-Programme anderer werden nicht genutzt. |
| Kein fremdes Skript | Der Link kommt vom eigenen Server; kein Skript und kein Cookie eines Programms. |
| Kula Labs zahlt nie drauf | In Stufe 1 fliesst nichts hinaus. Ab Stufe 3 wird ein Anteil erst fällig, wenn das Programm bezahlt hat und seine Stornofrist vorbei ist. |
| Regelkonform vor Umsatz | Kein Programm, dessen Bedingungen den Kanal nicht tragen; der Partnerlink geht nur an einen Menschen. |
| Code und Bedingungen im selben Schritt | Bedingungen 7g und der Absatz «Paid links» der Datenschutzerklärung, beide Version 2026-11-28b, im selben Pull Request wie der Code. |

Bedingungen 7g sagen in einem Absatz, was der Code tut: Jeder bezahlte Link ist eine Anzeige mit «Ad» und dem Satz am
Link; das Produkt ist kein Angebot, wird nicht auf PazAIr verkauft und ist nicht geprüft; eine Provision ändert nie
die Reihenfolge von Suchergebnissen; den Partnerlink öffnet nur ein Mensch; Besucher aus der EU, dem EWR und dem
Vereinigten Königreich erhalten den nackten Link; die Provision zahlt das Programm, nicht Stripe auf PazAIr; niemand
erhält einen Anteil daran.

## Was Fachleute klären, bevor Anteile fliessen

Für Stufe 1 genügen die ersten drei. Die übrigen gelten ab Stufe 3.

1. Genügt «Ad» mit dem Satz am Link nach Grundsatz B.15, und welches Lauterkeitsrecht erreicht eine Schweizer Seite
   mit Publikum in den USA und der EU? (Kanzlei)
2. Wer holt für Besucher aus der EU die Einwilligung ein, die der Europäische Datenschutzausschuss für
   Affiliate-Links verlangt ([EDPB, Leitlinien 2/2023](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf))?
   Bis das geklärt ist, erhalten Besucher aus der EU, dem EWR und dem Vereinigten Königreich den nackten Link, ohne
   Partnercode. So ist es gebaut. (Datenschutzrecht)
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
- **Nie Provision in der Reihenfolge der Suchergebnisse und Angebote.** Im Anzeigenfeld steht, was zur Suche passt
  und Kula Labs am meisten bringt: Es ist eine Anzeige und heisst so.
- **Nie ein Programm gegen seine eigenen Regeln:** kein Amazon, kein eBay, kein Partnerlink in einer Agent-Antwort.
- **Nie «schnell reich»:** keine Trading-Kurse, keine Krypto-Programme, keine Marktplätze für Digitalprodukte mit
  Urteilen wegen intransparenter Verträge.
- **Nie ein Anteil, bevor das Programm bezahlt hat,** und nie mehr als eine Minderheit.
- **Nie ein Konkurrent von JOBFLOW in der Liste.**

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

1. **Der Menschenklick als Bauprinzip.** Der Partnerlink steht in keiner Seite und in keiner Antwort: Er wird erst
   beim Klick eines Menschen vom Server geholt; Agenten tragen eine Seite und eine nackte Adresse. (gebaut)
2. **Kennzeichnung als Daten.** «Bezahlt», der Zahler und der fertige Satz reisen im selben Objekt wie der Link, durch
   jede Kette von Agenten. (gebaut)
3. **Die signierte Offenlegung.** Jeder Verweis, den PazAIr ausgibt, bekommt einen signierten, verankerten Eintrag:
   was, wann, mit welchem Satz. Wer ihn weitergibt, kann belegen, dass er offengelegt hat. (Stufe 2)
4. **Die erste öffentliche Zahl Agent zu Mensch.** Wie viele Verweise in Antworten hinausgehen, wie viele Menschen
   die Seite öffnen und den Link: unter `/partners.json`, als Summen (gebaut). Die Käufe dazu meldet das Programm. In einer Umfrage von impact.com unter 1'128 Käufern in
   den USA schlossen nur 31 % derer, die einer KI-Empfehlung folgten, über einen messbaren Link ab
   ([impact.com](https://impact.com/resources/reports/ai-attribution-gap/)); eine Messung fehlt.
5. **Die Reihenfolge ohne Provision, als Test.** Dieselbe Suche liefert mit und ohne Verweise dieselben Angebote in
   derselben Reihenfolge, und ein Test bricht, wenn das je anders ist. (gebaut)
6. **Die Kennung pro Agent, nie pro Mensch,** vom Link über den Vertrag bis zur Datenschutzerklärung. In Stufe 1
   trägt der Link nur den Partnercode von Kula Labs und nichts über den Besucher. (gebaut; pro Agent ab Stufe 3)
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

1. **Mergen:** [Pull Request 388 in Kula-Labs/jobflow-a2a](https://github.com/Kula-Labs/jobflow-a2a/pull/388). Danach
   ist Stufe 1 im Server, aber aus: Ohne Partnerlink zeigt PazAIr keinen Verweis.
2. **Bei den Programmen anmelden,** als Kula Labs, in dieser Reihenfolge:
   [Firecrawl](https://www.firecrawl.dev/affiliates), [Apify](https://docs.apify.com/legal/affiliate-program-terms-and-conditions),
   [n8n](https://n8n.io/affiliates/), [Make](https://www.make.com/en/affiliate),
   [Payrexx](https://payrexx.com/en/partner/solution-partners), [Railway](https://railway.com/affiliate-program),
   [Infomaniak](https://www.infomaniak.com/en/support/faq/2247/discover-infomaniaks-affiliate-commission-system). Bei
   Programmen aus den USA verlangt das Steuerformular W-8BEN. Wo ein Programm fragt, wie geworben wird: mit einer
   gekennzeichneten Seite auf pazair.ch, die ein Mensch öffnet, nie mit Links in automatischen Antworten.
3. **Die Partnerlinks an Claude geben.** Sie sind nicht geheim (wer klickt, sieht sie). Claude trägt sie mit
   `VERWEIS = "on"` in die Konfiguration ein; mit dem nächsten Deploy ist der Verweis des Programms live.
4. **Nach 30 Tagen** die Zahlen unter `/partners.json` und in den Konten der Programme ansehen und über Stufe 2
   entscheiden.
5. **Vor Stufe 3** die Fragen oben mit Kanzlei und Steuerberatung klären und bei den Programmen schriftlich anfragen,
   ob ein Anteil weitergegeben werden darf.
