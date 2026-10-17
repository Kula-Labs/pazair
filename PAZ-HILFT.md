# Paz hilft

> **Paz, der Fuchs, der sein Wort hält: schlau genug, jeden auszutricksen, zu schlau, es zu tun. Und schlau genug,
> dich vor deinem eigenen Fehler zu bewahren.**

Stand 17. Oktober 2026. Erste Seite: <https://pazair.kulalabs.ch/sell>. Code: `src/market/paz.ts` in
Kula-Labs/jobflow-a2a. Wissen: die Fragen der Verkäufer, <https://pazair.kulalabs.ch/sell/faq>.

## Die Idee

Fatih, 17. Oktober 2026: Überall, wo ein Formular mehrere Dinge verlangt, die man falsch eingeben kann (Land, Währung,
Preis, eine Webhook-Adresse, einen Anteil), kommt Paz als Fuchs hereingelaufen und fragt: «Hast du Fragen? Paz hilft
dir.» So wie Drop in Suone und Echo in Jobflow: eine Mischung aus einem Charakter und dem geführten Onboarding, dem
besten Onboarding der Welt.

## Was Paz heute kann (auf /sell)

| Wann | Was Paz tut |
|---|---|
| Ein Feld wird mit einem Wert verlassen, den der Server ablehnen würde | Er läuft herein und sagt in einem Satz, was nicht stimmt und was richtig wäre |
| Jemand stockt lange an einem schwierigen Feld | Er bietet Hilfe an, ohne zu drängen |
| Vor dem Absenden ist noch etwas offen | Er sammelt alles an einem Ort, statt dass der Browser einzelne graue Blasen zeigt |
| Das Formular ist in Ordnung | Er sagt, was Stripe als Nächstes fragt (Bankkonto, Ausweis), damit niemand dort abbricht |
| Jemand klickt auf den Fuchs | Er zeigt die 13 Fragen, die alle Verkäufer stellen, jede mit Fundstelle |

Die Regeln sind dieselben wie auf dem Server: Preis ab 2.00, Anteil 0 bis 50 %, nur https, keine lokale Adresse.
Paz erkennt die typischen Fehler: «CHF» im Länderfeld (eine Währung), «GER» oder «Schweiz» (gemeint ist DE oder CH),
«UK» (Stripe schreibt GB), «EU» (kein Land), eine Doku-Seite statt eines Endpunkts, den webhook_secret statt des
api_key.

Unterwegs gefunden und behoben: Das Länderfeld schnitt auf zwei Buchstaben ab. «GER» wurde still zu «GE», also
Georgien, «EUR» zu «EU». Jetzt sieht Paz den ganzen Wert und nennt den richtigen Code.

## Was Paz nie tut

- **Nichts senden.** Was jemand eintippt, verlässt für Paz den Browser nicht. Darum ändert sich die
  Datenschutzerklärung nicht.
- **Nichts versprechen.** Kein Sprachmodell schreibt, was Paz sagt. Jeder Satz ist eine feste Regel oder eine Antwort
  aus der FAQ mit Fundstelle («Regelkonform vor Umsatz»).
- **Nicht nerven.** «Not now» gilt für die ganze Sitzung. Er bewegt sich nur, wenn die Person Bewegung zulässt, spricht
  über `aria-live` und hat 44 px grosse Knöpfe. Der Massstab-Check besteht.

## 10 USPs

1. **Ein Marktplatz mit einem Gesicht, das hilft statt verkauft.** Paz kommt, wenn du einen Fehler machen würdest,
   nicht, wenn wir etwas wollen.
2. **Fehler werden verhindert, bevor sie passieren.** Nicht eine rote Meldung nach dem Absenden, sondern ein Satz beim
   Verlassen des Feldes.
3. **Paz kennt die echten Fehler.** CHF als Land, UK statt GB, GER statt DE: die Fehler, die Menschen wirklich machen.
4. **Jede Antwort hat eine Fundstelle.** Paz erfindet nichts; er sagt, was in den Bedingungen und in der FAQ steht.
5. **Paz bereitet auf Stripe vor.** Wer weiss, dass Bankkonto und Ausweis gefragt werden, bricht nicht ab.
6. **Paz ist privat.** Er sieht deine Eingaben nur in deinem Browser. Nichts geht an uns.
7. **Paz respektiert dich.** Ein Klick, und er ist für die Sitzung still. Keine Bewegung, wenn du keine willst.
8. **Eine Wahrheit für Menschen und Agenten.** Was Paz einem Menschen sagt, bekommt ein Agent im Dry-Run und in
   `next_calls`, nach denselben Regeln.
9. **Paz wird mit jeder Frage klüger.** Neue Fragen aus `tell_us` und von Verkäufern wie HumanMirror werden zu
   FAQ-Einträgen, die Paz sofort kennt.
10. **Der Fuchs ist die Marke.** Paz war bisher ein Logo. Jetzt hat er eine Aufgabe, die zu ihm passt.

## 10 Innovationen

1. **Regeln, die im Browser und im Test dieselben sind.** `PAZ_RULES_JS` läuft beim Besucher und in Node; getestet wird
   genau, was ausgeliefert wird.
2. **Die Browser-Prüfung weicht Paz.** Das Formular prüft Paz statt der grauen Browser-Blasen. Er nennt alles auf
   einmal und sagt warum; der Server prüft trotzdem.
3. **Drei Auslöser, ein Charakter:** ein falscher Wert beim Verlassen, langes Zögern an einem harten Feld, das Absenden.
4. **Erkennung von Verwechslungen** statt nur «ungültig»: Währung statt Land, Alpha-3 statt Alpha-2, Name statt Code.
5. **Die Stripe-Vorbereitung im richtigen Moment:** erst wenn alles stimmt, nicht vorher.
6. **Ein Charakter ohne Sprachmodell.** Er wirkt lebendig (er läuft herein), spricht aber nur geprüfte Sätze.
7. **Barrierefrei von Anfang an:** `aria-live`, `aria-describedby` am Feld, Bewegung nur auf Wunsch, 44-px-Ziele,
   vom Massstab-Check in vier Ansichten bestätigt.
8. **Kein Byte verlässt den Browser für Paz.** Ein Test prüft, dass sein Skript keine Anfrage sendet.
9. **Die FAQ ist Paz' Gedächtnis.** Dieselbe Quelle wie `llms.txt` und `/sell/faq`; ändert sich der Code, ändern sich
   die Zahlen mit.
10. **Paz speist Kula Flow.** Welche Felder am häufigsten falsch sind, zeigt, wo die Seite noch zu schwer ist (nächster
    Schritt, ohne Inhalte, nur Zählung pro Feld).

## Wie es weitergeht

| Schritt | Wo | Was Paz dort tut |
|---|---|---|
| 1 (fertig) | `/sell` | Land, Preis, Anteil, Webhook, Schlüssel, Bedingungen; Stripe-Vorbereitung; FAQ |
| 2 | Kartenmandat (`set_mandate`) | Limits pro Bestellung und Monat erklären und vorrechnen, bevor die Karte gespeichert wird |
| 3 | `/sell/konto` | Testlieferung lesen: «Dein Server hat geantwortet, aber nicht im Format deines Angebots, hier der Unterschied» |
| 4 | `/claim/…` | Den Entwurf erklären, den ein Agent mit `tip` vorgeschlagen hat |
| 5 | Zählung | Welche Regel wie oft greift, pro Feld und ohne Inhalt, in Vision: wo die Seite noch zu schwer ist |

Für Drop aus Suone: Wenn Fatih Screenshots oder eine Aufnahme schickt, passen wir Bewegung und Ton an das an, was dort
so gut funktioniert.
