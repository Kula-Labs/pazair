# Läuterung von PazAIr: Prüfung der Geldwege

16. Oktober 2026. Geprüft wurde der Server-Code von PazAIr (`Kula-Labs/jobflow-a2a` @ `90f6338`), ohne ihn
anzufassen: in einem Zwilling aus echtem Code, echtem Datenbankschema und einer Stripe-Attrappe, mit einer Zeitmaschine
über 31 simulierte Nächte, einem Angriffs-Schwarm und einem Bruchtest. Kein echtes Geld, nichts auf dem Live-System
geschrieben. Live wurden nur öffentliche Seiten gelesen und die Werkzeugliste abgefragt.

## Urteil

Der Kern hält. Gefälschte Zahlungsereignisse, gleichzeitige Käufe, Riesen-Eingaben und Lieferungen ausserhalb des
Vertrags kosten niemanden Geld, und über einen simulierten Monat zahlt Kula Labs nie drauf. Live läuft genau der
geprüfte Code: alle 78 MCP-Werkzeuge stimmen mit dem Code überein.

Die Prüfung fand 25 Befunde mit 10 Ursachen; ein Teil stammt von einem zweiten, unabhängigen Prüfer ohne Vorwissen.
Sieben sind rot: Sie betreffen Geld, wenn die Infrastruktur ausfällt, PazAIr stark wächst oder jemand es darauf
anlegt. Bei der heutigen Menge ist keiner akut. Jeder Befund ist mit einem Test bewiesen, der heute fehlschlägt und
mit dem Fix grün wird.

## Befunde (öffentliche Fassung)

Sicherheitsbefunde stehen hier ohne Details, bis der Fix live ist.

| ID | Bereich | Befund | Grad | Stand |
|---|---|---|---|---|
| L-01 | Auszahlungen | Nach einem Ausfall im falschen Moment kann ein Anteil doppelt ausgezahlt werden | rot | offen |
| L-02 | Halten | Fällt der Nachtlauf zweimal aus, kann eine gehaltene Zahlung verfallen | rot | offen |
| L-03 | Lieferung | Ein abgebrochener Lauf meldet «nichts abgebucht», obwohl abgebucht wurde | rot | offen |
| L-12 | Nachtlauf | Sicherheitsbefund, hoch | rot | offen |
| Z2-02c | Halten | Nach bestandener Prüfung durch den Käufer kann ein Zahlungsfehler den Verkäufer leer ausgehen lassen | rot | offen |
| Z2-03 | Mandat | Ein Fehler nach der Autorisierung kann eine zweite Zahlung für denselben Kauf verlangen | rot | offen |
| Z2-05 | Halten | Sicherheitsbefund, hoch | rot | offen |
| L-04 | Lieferung | Ein Zahlungsfehler beim Einziehen verwirft eine fertige Lieferung | gelb | offen |
| L-05 | Nachtlauf | Eine verfallene, nicht gelieferte Bestellung wird nie geschlossen | gelb | offen |
| L-06 | Kauf | Wiederholt ein Agent einen Kauf, wird zweimal gekauft | gelb | offen |
| L-07 | Tests | Zwei Tests der Suite greifen aufs Internet zu | gelb | offen |
| L-08 | Gebühren | Gleichzeitige Freischaltungen können mehr als 100 Gründer ergeben | gelb | offen |
| L-09 | Empfehlungen | Sicherheitsbefund, mittel | gelb | offen |
| L-10 | Lieferung | Sehr lange Lieferungen werden gekürzt | gelb | offen |
| L-11 | Eingaben | Sicherheitsbefund, niedrig | gelb | offen |
| L-13 | Auszahlungen | Sicherheitsbefund, niedrig | gelb | offen |
| L-14 | Halten | Eine sehr kurze Haltefrist hält nicht | gelb | offen |
| L-15 | Lieferung | Sicherheitsbefund, mittel | gelb | offen |
| Z2-07 | Boost | Ein doppelt zugestelltes Zahlungsereignis verlängert einen Boost doppelt | gelb | offen |
| Z2-08 | Belege | Eine signierte Abrechnung kann einen Ausgang zu früh bezeugen | gelb | offen |
| Z2-09 | Word Pass | Sicherheitsbefund, mittel | gelb | offen |
| Z2-10 | Word Pass | Sicherheitsbefund, mittel | gelb | offen |
| Z2-11 | Lieferung | Sicherheitsbefund, mittel | gelb | offen |
| Z2-12 | Gebühren | Die Volumenstufe greift schon genau an der Grenze und zählt Währungen gleich | gelb | offen |
| Z2-13 | APS | Die Tagesobergrenze der Gebühr hält gleichzeitige Aufrufe nicht ganz auf | gelb | offen |

## Stand

16. Oktober 2026. Stufe 1, die Prüfung, ist abgeschlossen. Stufe 2 schützt, ohne am Verhalten etwas zu ändern. Dafür
liegen drei Änderungen zur Freigabe bereit, noch nicht live:

- ein Not-Aus für den nächtlichen Geldlauf: Er hält Überweisungen an, solange es nötig ist, das Einziehen nur kurz,
  und keine Kartenreservierung verfällt seinetwegen;
- ein Test, der die öffentliche Schnittstelle festhält (Werkzeuge, Bedingungen, Gebühren), damit sie sich nie
  unbemerkt ändert;
- nach jedem Deploy eine Prüfung, wie ein Agent PazAIr trifft, mit einem Testkauf ohne Geld, und ein Weg zurück zur
  vorherigen Version in einem Schritt.

## Wie es weitergeht

Zuerst wird geschützt, dann geheilt, mit einem PR pro Ursache, Geld zuletzt. Ein Geld-Fix geht erst live, wenn er im
Zwilling und im Stripe-Testmodus die ganze Kette durchlaufen hat. Wo ein Fix ändert, wie PazAIr mit Geld oder Daten
umgeht, ändern `/terms` und `/privacy` im selben PR. Diese Seite trägt den Stand nach.
