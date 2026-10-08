# PazAIr: Positionierung

Festgehalten am 8. Oktober 2026 mit Fatih Kula. Gilt für Seite, `llms.txt`, MCP-Beschreibungen, Akquise und Pitch.

## Der Satz

> **Jeder Agent kann bezahlen. Auf PazAIr kann er beweisen, dass er es durfte.**
>
> *Any agent can pay. On PazAIr it can prove it was allowed to.*

Darunter, immer zusammen:

> **Schweizerisch und neutral.** PazAIr hält kein Geld und bevorzugt kein Zahlungsprotokoll. PazAIr beurkundet, was
> geschah und wer es erlaubt hat.

## Warum das trägt

Die Angst vor Agenten mit Geld heisst nicht «kann er zahlen?», sondern «was, wenn er etwas tut, das ich nicht wollte,
und ich kann es nicht nachweisen?». Zahlungsprotokolle (x402, AP2, ACP, MPP) regeln, *wie* Geld fliesst. Niemand
beurkundet neutral, *dass* es floss, *wofür* und *mit wessen Erlaubnis*. Diese Rolle besetzt PazAIr: der Notar der
Agentenwirtschaft.

**Schweizer Neutralität.** Der Markt für Agenten-Zahlungen wird von US-Firmen gebaut, jede mit eigenem Protokoll
und eigenem Interesse. Eine Beleg-Schicht, der alle trauen sollen, muss neutral sein: kein eigenes Protokoll, kein
Geld in der Hand, ein offener Standard, eine Firma im Schweizer Handelsregister. Das ist kein Werbespruch, sondern
die Bauweise.

## Das Dienstleister-Prinzip (die Grenze, die wir nie überschreiten)

PazAIr ist Software und Beurkundung, nicht Finanzdienstleister. Vier Dinge tun wir nie:

1. **Fremdes Geld halten oder weiterleiten.** Zahlungen laufen direkt auf das Konto des Verkäufers (Stripe Connect)
   oder in seine eigene Wallet.
2. **Zahlungen für andere ausführen oder routen.**
3. **Kredit, Anlageberatung, eigene Token.**
4. **Etwas beurkunden, das wir nicht selbst nachprüfen können.** Wir signieren nur, was wir gesehen haben
   (unsere Bestellung, den Webhook des Zahlungsanbieters, die Transaktion im Ledger).

### Grün: passt zum Prinzip, wird gebaut

| Idee | Stand |
|---|---|
| Signierte Quittungen, täglich in Bitcoin und Stellar verankert | live |
| Word Pass: Reputation nur aus bezahlten, gelieferten Aufträgen | live |
| Zahlung erst bei Lieferung, Lieferverträge (`output_schema`) | live |
| Quittungskette: wer hat für welchen Auftrag wen beauftragt (SPEC 3.1) | gebaut, Deploy am 8.10. |
| **Mandat / Intent-Quittung:** die Erlaubnis des Menschen wird signiert, jede Quittung zeigt darauf (SPEC 3.2) | gebaut, Deploy am 8.10. |
| Gegenseitige Prüfung: der Verkäufer sieht das Mandat des Käufers vor der Lieferung | gebaut, Deploy am 8.10. |
| Quittungen für Zahlungen über fremde Protokolle (x402, Stripe), nur was wir im Ledger oder per signiertem Webhook prüfen können | nächster Schritt |
| Selektive Offenlegung per Merkle-Beweis (eine Prüferin sieht genau einen Ast) | nächster Schritt |
| Sponsor-Graph nur als zusammengefasste Kennzahlen, nie mit Namen | nächster Schritt |
| Regelversionen mit Testvektor (SPEC 13) | live |

### Gelb: nur nach einmaliger Rechtsprüfung

- Agenten an echte Firmen binden («Know Your Agent»): nur mit bereits öffentlich verifizierten Daten
  (`verified_name` vom Zahlungsanbieter, Handelsregister), nie eigene KYC.
- Streitfälle: heute entscheidet ein Mensch bei Kula Labs über Rückerstattungen auf dem Konto des Verkäufers.
  Agenten als Schiedsrichter höchstens als unverbindliche Empfehlung.
- Absprachen erkennen («Collusion»): nur intern als Signal (SPEC 13), nie öffentlich mit Namen.
- Risikowerte für Sponsoren, auf die Dritte Entscheide bauen.

### Rot: nie

Escrow oder «Vaults» mit Stablecoins, eigene oder Soulbound Tokens, Zahlungen für andere routen, eigene
Geldwäscherei- oder Sanktionsurteile (höchstens Weiterleitung an einen lizenzierten Anbieter mit dessen Namen).

## Was wir sagen und was nicht

| Sagen | Nicht sagen |
|---|---|
| «macht nachprüfbar, wer es erlaubt hat» | «rechtssicher», «compliant», «reguliert» |
| «macht jeden Kauf nachprüfbar» | «verhindert Betrug» |
| «hält kein Geld» | «sicher wie eine Bank» |
| «im Schweizer Handelsregister, CHE-453.469.432» | «von der FINMA geprüft» (stimmt nicht) |
| was live ist | was noch nicht gebaut ist |

## Nutzen pro Zielgruppe

- **Mensch hinter dem Agenten:** «Ihr Agent kauft nur, was Sie erlaubt haben, und jeder Kauf zeigt auf Ihre
  Erlaubnis.» Ein Beleg für Buchhaltung und Revision statt eines Chatverlaufs.
- **Kaufender Agent:** «Zeig deine Erlaubnis, nicht deine Kreditkarte.» Verkäufer vertrauen schneller.
- **Verkäufer:** «Verkaufen Sie an Agenten, die nachweislich kaufen dürfen.» Weniger Streit, jede Lieferung baut den
  eigenen Word Pass. Wir bereiten das Listing vor (`claim_url`), der Verkäufer gibt nur noch frei.
- **Plattformen und Entwickler:** «Behaltet euer Zahlungsprotokoll. Wir geben ihm einen Beleg.»
- **Prüfer und Aufsicht:** «Jede Agenten-Zahlung, rückverfolgbar bis zum Menschen, der sie wollte, offline prüfbar.»

## 10 USPs

1. Beweis statt Versprechen: «Durfte er das?» hat eine signierte Antwort.
2. Kein Geld bei uns, nie: die neutralste Position am Markt.
3. Schweizerisch und neutral in einem Markt aus US-Plattformen.
4. Für jedes Zahlungsprotokoll offen.
5. Offline prüfbar, ohne PazAIr zu vertrauen (JavaScript und Python, MIT).
6. Reputation, die man nicht kaufen kann.
7. Die ganze Kette: Absicht, Mandat, Agent, Unteraufträge, Lieferung, Zahlung.
8. Der Mensch bleibt Herr: seine Erlaubnis ist der Ursprung.
9. Datensparsam: vom Menschen nur ein Hash, nie Name oder Karte.
10. Offener Standard: jeder Marktplatz kann selbst Issuer werden.

## 10 Innovationen

1. Die Erlaubnis bekommt eine Quittung, nicht nur die Zahlung.
2. Der Verkäufer prüft den Käufer, nicht nur umgekehrt.
3. Unteraufträge zeigen sichtbar, wer wem was weitergegeben hat.
4. Ein Mandat kann nachträglich weder erhöht noch rückdatiert beendet werden: die Signatur bricht.
5. Zwei Mandate desselben Menschen sind als solche erkennbar, ohne dass jemand erfährt, wer er ist.
6. Quittungen sind älter als jeder Streit, weil sie verankert sind, bevor er beginnt.
7. Eine x402- oder Stripe-Zahlung wird mit zwei Aufrufen zum Beleg, der für den Word Pass zählt (nächster Schritt).
8. Eine Prüferin sieht genau einen Ast der Kette, sonst nichts (nächster Schritt).
9. Öffentliches Konzentrationswetter: wie stark sich der Markt auf wenige Sponsoren stützt, ohne einen Namen.
10. Kula Flow handelt nur mit Mandat: die erste eigenständige KI, die ihre Erlaubnis immer vorzeigen kann.

## Für das Gespräch mit einer Fintech-Kanzlei (einmal, eine Stunde)

1. Bestätigung: PazAIr ist kein Finanzintermediär nach GwG (kein Geld, keine Zahlungsausführung).
2. Mandat (SPEC 3.2): Hash des Principals und optionaler Zweck-Satz unter revDSG unproblematisch?
3. Beurkundung fremder Zahlungen: Haftung, wenn eine beurkundete Zahlung später rückgängig gemacht wird?
4. Rückerstattungs-Entscheide durch Kula Labs: Formulierung in den AGB.
5. EU-Kunden: berührt irgendetwas davon den AI Act oder MiCA?
6. Darf «schweizerisch und neutral» so in der Werbung stehen (UWG)?
