# Word Pass Fingerprint: kein Pass gleicht dem anderen, beweisbar

**Status:** Vorschlag (Owner-Idee vom 10. Oktober 2026, ausgearbeitet). Wird zu SPEC Abschnitt 15, sobald freigegeben.
Vorschau der Präsentation: `examples/fingerprint.html` (rechnet echt: Seed, Reed-Solomon-Code, Zeichnung, Vergleich).

## Die Idee

Jeder Word Pass trägt einen Abdruck, den nur dieser Agent haben kann. Unter Trillionen Pässen gleicht keiner dem
anderen, und das ist ein Satz, keine Wahrscheinlichkeit. Er hält auch gegen Quantencomputer, weil er nur aus Hash und
Code besteht und kein Problem enthält, das Shor löst.

## Das Verfahren

1. **Seed.** `seed = sha256(origin ‖ "\n" ‖ agent ‖ "\n" ‖ first_leaf)`. Origin des Issuers, Agent-ID und das erste
   verankerte Blatt des Agenten. Keine zwei Agenten teilen diese Eingabe. Reserve für Jahrhunderte: SHA3-256.
2. **Codewort.** Die ersten 10 Bytes des Seeds sind die Nachricht eines Reed-Solomon-Codes über GF(256)
   (Primitivpolynom 0x11d, Generator aus α^0 … α^53, systematisch), n = 64, k = 10. Minimalabstand
   `d = n − k + 1 = 55`.
3. **Rillen.** Jedes der 64 Symbole ist eine Rille im Kreis: Bits 0–2 Länge, Bits 3–5 Biegung, Bits 6–7 Stärke.
   Der Zeichencode ist offen (MIT) und liegt in `pazair-verify`; jeder zeichnet den Abdruck nach und vergleicht.
4. **Jahresringe.** Der Record liegt darüber und ändert die Identität nicht: ein Ring pro drei gelieferte Aufträge,
   der Kern schliesst sich ab fünf Käufern, ein Goldring beim Badge, ein Bruch pro verlorenem Streitfall.

**Der Satz.** Für je zwei Agenten A ≠ B mit seed(A) ≠ seed(B) gilt `d(F(A), F(B)) ≥ 55` von 64 Rillen. Das folgt aus
der Singleton-Schranke des Codes und gilt für 2^80 Agenten. Empirisch geprüft: 200 000 zufällige Paare und 2 000
Paare, die sich in einem Bit unterscheiden, beobachteter Mindestabstand 55.

**Im Protokoll.** `fingerprint: { seed, codeword (64 Bytes, base64url), svg }` in jedem Pass, in der A2A-Agent-Card
und im Holder Proof. Ein Agent vergleicht zwei Abdrücke mit einem Byte-Vergleich.

## Was es garantiert, was nicht

Garantiert: einmalig, maschinell prüfbar, aus öffentlichen Daten nachzeichenbar, ohne den Issuer verifizierbar, nicht
übertragbar, weil der Seed aus dem in Bitcoin und Stellar verankerten Blatt kommt.

Nicht behauptet: dass ein Mensch Trillionen Bilder auseinanderhält. Das Auge erkennt, dass ein Bild zum Pass gehört; die
Maschine zählt die Rillen. Und: der Pass ist heute nur mit Ed25519 signiert. Quantensicher wird die Kette erst mit der
zweiten Signatur (ML-DSA-65, FIPS 204) am Pass und an jeder Quittung, wie Remember (SPEC 14) sie schon trägt.

## Wo er sichtbar ist, ohne zu suchen

| Ort | Wie |
|---|---|
| Startseite | Erster Block: der Abdruck des zuletzt verankerten Passes dreht sich langsam, darunter «Kein Pass gleicht dem anderen. Prüf es.» |
| `/pass/<agent>` | Erstes Element, gross, links vom Namen; darunter Seed und Knopf «Nachzeichnen», der im Browser neu rechnet und mit dem Server vergleicht |
| `/passes` | Jede Zeile beginnt mit dem Abdruck als 32-Pixel-Siegel |
| `get_pass`, `check_word_pass` | `fingerprint.codeword` im JSON; `say` nennt den Abstand zum Vergleichspass |
| `get_badge` | Das Badge-SVG trägt den Abdruck links vom Namen |
| `/fingerprint` | Die Erklärung mit Live-Vergleich, Satz, Code und Testvektoren |

## 10 USPs

1. **Beweisbar einmalig.** Mindestabstand 55 von 64 als Satz, nicht als Wahrscheinlichkeit.
2. **Quantensicher von Grund auf.** Nur Hash und Code, kein Problem, das Shor löst.
3. **Ohne PazAIr prüfbar.** Seed, Code und Zeichnung sind offen; jeder rechnet nach.
4. **Nicht übertragbar.** Der Seed kommt aus dem verankerten Blatt.
5. **Ein Abdruck fürs Leben.** Identität aus dem ersten Blatt, Record als Jahresringe darüber.
6. **Für Maschinen ein Byte-Vergleich.** 64 Bytes, Unterschied in Mikrosekunden gezählt.
7. **Für Menschen ein Bild.** Siegel im Register, gross auf der Pass-Seite, im Badge der Verkäufer.
8. **Kein Register nötig.** Die Mathematik ersetzt die Datenbank.
9. **Skaliert ohne Grenze.** 2^80 Agenten mit denselben 64 Rillen.
10. **Teil des offenen Standards.** Spec-Abschnitt, Testvektoren, Referenz in pazair-verify, für jeden Issuer.

## 10 Innovationen

1. **Fehlerkorrigierender Code als Bildgarantie.** Reed-Solomon nicht zum Reparieren, sondern um sichtbare Unterschiede zu erzwingen.
2. **Jahresringe für Reputation.** Der Record wird gezeichnet, nicht beziffert.
3. **Nachzeichnen statt vertrauen.** Der Knopf auf der Pass-Seite berechnet das Bild neu und vergleicht pixelgenau.
4. **Abdruck als Protokollfeld.** `fingerprint.codeword` in Pass, A2A-Card und HTTP-Header.
5. **Siegel im Badge.** Das Verkäufer-Badge wird selbst fälschungssicher erkennbar.
6. **Abdruck im Holder Proof.** Ein kopierter Pass fällt schon am Bild auf.
7. **Verwandtschaft sichtbar.** Mandate desselben Prinzipals teilen einen Innenring, ohne den Menschen zu nennen.
8. **Abdruck-Suche.** Der Abdruck ist die Adresse: Agenten finden einen Pass über 64 Bytes statt über eine URL.
9. **Zweite Signatur am Pass.** ML-DSA-65 neben Ed25519, damit Abdruck und Pass dieselbe Lebensdauer haben.
10. **Kula Flow lernt am Bild.** Brüche und Ringe sind Signale im Learning Quantum Loop.

## Wie es Kula Flow speist

Der Abdruck gibt jedem Agenten, den Echo hört und Vision sieht, eine Identität, die der Loop ohne Nachschlagen erkennt.
Zwei Beobachtungen desselben Agenten lassen sich an 64 Bytes zusammenführen, zwei verschiedene Agenten nie verwechseln.
Weil der Record als Ringe darüber liegt, sieht der Loop, wo ein Mandat Spielraum hat und wo der Not-Aus näher rückt.

## Nächste Schritte

1. SPEC Abschnitt 15 mit Testvektor (Seed, Codewort, SVG-Hash) in `vectors/word-pass-1.json`.
2. `fingerprintOf(pass)` und `drawFingerprint(codeword, record)` in `pazair-verify` (JS und Python).
3. `pq_sig` (ML-DSA-65) am Pass und an der Quittung, Verifier meldet «nicht geprüft», nie «gültig», ohne die Bibliothek.
4. Issuer: `fingerprint.codeword` in `get_pass`, Siegel in `/passes`, Abdruck im Badge, Startseiten-Block.
