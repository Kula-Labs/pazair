# Akquise: «Ihr Angebot ist schon fertig»

Wir bereiten die Listings eines Entwicklers aus seinem öffentlichen Dienst vor (MCP-Server, OpenAPI, x402-Endpunkt)
und schicken einen privaten Link. Er schaut, akzeptiert die Bedingungen, klickt einmal und ist Verkäufer. Vor diesem
Klick ist nichts öffentlich; der Entwurf läuft nach 30 Tagen von selbst ab.

## 1. Entwurf anlegen (pro Empfänger einmal)

```
curl -s -X POST https://agents.kulalabs.ch/admin/pazair/drafts -H "authorization: Bearer DEIN_ADMIN_TOKEN" -H "content-type: application/json" -d "{\"url\":\"https://DIENST-DES-ENTWICKLERS/mcp\",\"name\":\"NAME DES DIENSTES\"}"
```

Die Antwort enthält `claim_url` und die vorbereiteten Listings mit Preis. Vor dem Versand den Link selbst öffnen und
prüfen, ob Titel und Preise passen.

## 2. Die Mail (Deutsch)

**Betreff:** Ihr Dienst auf PazAIr ist vorbereitet, Sie müssen nur noch freigeben

> Grüezi [Name]
>
> Ich habe [Dienst] gesehen und für Sie auf PazAIr vorbereitet, dem Marktplatz, auf dem KI-Agenten bei anderen
> Agenten einkaufen. Die Listings sind fertig, aber privat: Niemand sieht sie, bevor Sie zustimmen.
>
> Hier ansehen und mit einem Klick freigeben: [claim_url]
>
> Was Sie davon haben:
> - **Bezahlt wird erst bei Lieferung**, direkt auf Ihr eigenes Stripe-Konto. PazAIr hält kein Geld.
> - **Käufer mit Nachweis:** Agenten mit Mandat zeigen Ihnen vor der Lieferung, dass ihr Mensch den Kauf erlaubt hat.
> - **Jede Lieferung baut Ihren Word Pass**, eine Reputation, die man nicht kaufen kann.
> - **Schweizerisch und neutral:** Kula Labs, Wallisellen, Handelsregister CHE-453.469.432. Kein eigenes
>   Zahlungsprotokoll, Ihr bestehendes bleibt.
>
> Die ersten 100 Verkäufer zahlen für immer 1 % pro Verkauf. Kein Interesse? Dann ignorieren Sie diese Mail einfach,
> der Link läuft nach 30 Tagen ab und es wird nichts veröffentlicht.
>
> Freundliche Grüsse
> Fatih Kula, Kula Labs

## 3. The mail (English)

**Subject:** Your service is ready on PazAIr, it only needs your approval

> Hi [Name],
>
> I came across [service] and prepared it on PazAIr, the marketplace where AI agents buy from other agents. The
> listings are ready but private: nobody sees them until you approve.
>
> Look and approve with one click: [claim_url]
>
> - **Paid on delivery**, straight to your own Stripe account. PazAIr never holds the money.
> - **Buyers with proof:** agents with a mandate show you, before you deliver, that their human allowed the purchase.
> - **Every delivery builds your Word Pass**, a track record nobody can buy.
> - **Swiss and neutral:** Kula Labs, Wallisellen, Swiss commercial register CHE-453.469.432. No payment protocol of
>   our own; keep yours.
>
> The first 100 sellers pay 1 % per sale, for good. Not interested? Just ignore this; the link expires in 30 days and
> nothing is published.
>
> Best,
> Fatih Kula, Kula Labs

## 4. Regeln für den Versand

- **Jede Mail persönlich**, an eine öffentliche geschäftliche Adresse des Entwicklers, mit einem Satz, der zeigt, dass
  wir seinen Dienst wirklich angeschaut haben. Keine Massenmail: Das Schweizer UWG verbietet Massenwerbung per E-Mail
  ohne Einwilligung, und eine persönliche Anfrage wirkt ohnehin besser.
- Abmeldung respektieren: Wer «nein» sagt, bekommt keine zweite Mail.
- Nur versprechen, was live ist. «Käufer mit Nachweis» erst nach dem Deploy von SPEC 3.2 (8. Oktober 2026) verwenden.
- Den Zähler ansehen: Vision (`https://agents.kulalabs.ch/admin/vision`) zeigt pro Link vorbereitet, geöffnet,
  freigegeben, live, Auszahlung verbunden, abgelaufen.
