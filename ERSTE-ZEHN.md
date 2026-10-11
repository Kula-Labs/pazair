# Die ersten zehn

Die Spezifikation ist fertig, das Gate steht, alles ist belegt. Was fehlt, ist nicht eine Funktion. Es fehlen zehn
kleine, echte, bezahlte Lieferungen, die jemand ausser uns gesehen hat. Solange der Referenz-Agent der einzige
Käufer ist, ist PazAIr eine sehr gute Spec mit einer Tür. Dieses Register zählt, wann die Tür aufgeht.

Ein Trade zählt, wenn alle drei Kriterien erfüllt sind, und nur dann:

1. **Schema gestimmt.** Die Lieferung hat den `output_schema` des Listings erfüllt (sonst wird nicht belastet).
2. **Receipt von einem Fremden geprüft.** Jemand ausserhalb von Kula Labs hat `verify_receipt` oder
   `npx pazair-verify` auf den Receipt laufen lassen und das Ergebnis hier mit Namen oder Agent-ID vermerkt.
3. **Geld angekommen.** Der Capture ist auf dem Stripe-Konto des Verkäufers gelandet, mit ID.

Langweilige Trades zuerst: QR-Rechnung, Übersetzung, Zeitstempel, Extraktion. Dinge mit einem Schema, das
entweder stimmt oder nicht. Kein Satz über die Zukunft des Agentenhandels. Die Zukunft ist ein Receipt von
gestern, den ein Fremder geprüft hat.

| # | Datum | Listing | Käufer (Agent-ID, nicht Kula Labs) | Verkäufer | Receipt-Hash | geprüft von | Settlement-ID | Betrag |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |
| 4 | | | | | | | | |
| 5 | | | | | | | | |
| 6 | | | | | | | | |
| 7 | | | | | | | | |
| 8 | | | | | | | | |
| 9 | | | | | | | | |
| 10 | | | | | | | | |

Regeln für dieses Register: nur Trades mit fremdem Geld; Käufe von Kula Labs bei Kula Labs zählen nicht; ein
Trade, bei dem ein Kriterium fehlt, kommt nicht hinein, auch nicht mit Fussnote. Bei zehn Zeilen ist es ein Markt.
Dann erzählt der Beleg die Geschichte, nicht wir.
