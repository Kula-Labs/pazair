// Generated from policy/rejection-reasons.json by scripts/build-reasons.mjs. Do not edit here.
/** Every code the gate can answer with: its question (0 = the gate itself, 1 to 5), layer, who can act, whether a retry helps, one sentence in German and English. */
export default {
  "POLICY_INVALID": {
    "question": 0,
    "layer": "gate",
    "actor": "gateway",
    "retry": "fix_policy",
    "de": "Die Gateway-Policy ist kein gültiges gateway_policy-Objekt",
    "en": "the gateway policy is not a valid gateway_policy object"
  },
  "REQUEST_TIME_INVALID": {
    "question": 0,
    "layer": "gate",
    "actor": "gateway",
    "retry": "new_request",
    "de": "Die Anfrage nennt keine lesbare Zeit des Transfers: nicht geraten, abgelehnt",
    "en": "the request states no readable transfer time: not guessed, rejected"
  },
  "REQUEST_TIME_SKEW": {
    "question": 0,
    "layer": "gate",
    "actor": "gateway",
    "retry": "new_request",
    "de": "Die Transferzeit der Anfrage weicht weiter von der Uhr des Gateways ab als die Policy erlaubt",
    "en": "the request's transfer time is further from the gateway's clock than the policy allows"
  },
  "REQUEST_HISTORY_INVALID": {
    "question": 0,
    "layer": "gate",
    "actor": "gateway",
    "retry": "new_request",
    "de": "Das Ledger der Anfrage (history) ist keine Liste gültiger Einträge: ohne Ledger keine Limite, also kein Transfer",
    "en": "the request's ledger (history) is not a list of valid entries: no ledger, no limits, no transfer"
  },
  "RBAC_DENIED": {
    "question": 0,
    "layer": "gate",
    "actor": "gateway",
    "retry": "fix_policy",
    "de": "Keine Regel erlaubt diesem Agenten dieses Werkzeug",
    "en": "no rule allows this agent this tool"
  },
  "IDENTITY_MISSING": {
    "question": 1,
    "layer": "identity",
    "actor": "agent",
    "retry": "new_request",
    "de": "Keine signierte Agent-Identität",
    "en": "no signed agent identity"
  },
  "IDENTITY_SIGNATURE": {
    "question": 1,
    "layer": "identity",
    "actor": "issuer",
    "retry": "never",
    "de": "Die Signatur der Agent-Identität stimmt nicht",
    "en": "the agent identity's signature does not verify"
  },
  "PRINCIPAL_MISSING": {
    "question": 1,
    "layer": "identity",
    "actor": "issuer",
    "retry": "never",
    "de": "Die Identität nennt keinen Principal",
    "en": "the identity names no principal"
  },
  "IDENTITY_EXPIRED": {
    "question": 1,
    "layer": "identity",
    "actor": "issuer",
    "retry": "new_request",
    "de": "Die Agent-Identität ist abgelaufen oder hat kein Ablaufdatum",
    "en": "the agent identity has expired or has no expiry"
  },
  "IDENTITY_NOT_YET_VALID": {
    "question": 1,
    "layer": "identity",
    "actor": "gateway",
    "retry": "new_request",
    "de": "Die Agent-Identität wurde nach dem Transfer ausgestellt",
    "en": "the agent identity was issued after the transfer"
  },
  "RUNTIME_PROOF_MISSING": {
    "question": 1,
    "layer": "identity",
    "actor": "agent",
    "retry": "new_request",
    "de": "Kein Laufzeitnachweis (SPIFFE-Peer oder Schlüsselsignatur)",
    "en": "no runtime proof (SPIFFE peer or key signature)"
  },
  "RUNTIME_MISMATCH": {
    "question": 1,
    "layer": "identity",
    "actor": "agent",
    "retry": "never",
    "de": "Der Laufzeitnachweis passt nicht zur Laufzeitidentität der Agent-Identität",
    "en": "the runtime proof does not match the identity's runtime"
  },
  "COUNTERPARTY_IDENTITY_MISSING": {
    "question": 1,
    "layer": "identity",
    "actor": "counterparty",
    "retry": "new_request",
    "de": "Die Gegenpartei hat keine signierte Identität, die Policy verlangt eine",
    "en": "the counterparty has no signed identity and the policy requires one"
  },
  "COUNTERPARTY_IDENTITY_INVALID": {
    "question": 1,
    "layer": "identity",
    "actor": "counterparty",
    "retry": "never",
    "de": "Die Identität der Gegenpartei ist ungültig oder gehört nicht dem Verkäufer",
    "en": "the counterparty identity is invalid or not the seller's"
  },
  "TASK_MISSING": {
    "question": 2,
    "layer": "task",
    "actor": "agent",
    "retry": "new_request",
    "de": "Keine vereinbarte Aufgabe",
    "en": "no agreed task"
  },
  "TASK_PROTOCOL_NOT_ALLOWED": {
    "question": 2,
    "layer": "task",
    "actor": "agent",
    "retry": "new_request",
    "de": "Das Aufgabenprotokoll ist nicht erlaubt (MCP trägt Werkzeuge, nie Zahlung)",
    "en": "the task protocol is not allowed (MCP carries tools, never payment)"
  },
  "TASK_NOT_AGREED": {
    "question": 2,
    "layer": "task",
    "actor": "agent",
    "retry": "new_request",
    "de": "Die Aufgabe hat keine Task-ID oder keinen Hash des vereinbarten Inhalts",
    "en": "the task has no task id or no hash of what was agreed"
  },
  "DEAL_MISSING": {
    "question": 3,
    "layer": "deal",
    "actor": "agent",
    "retry": "new_request",
    "de": "Kein Deal-Objekt",
    "en": "no deal object"
  },
  "DEAL_KIND_NOT_ALLOWED": {
    "question": 3,
    "layer": "deal",
    "actor": "gateway",
    "retry": "fix_policy",
    "de": "Diese Deal-Art ist nicht erlaubt",
    "en": "this kind of deal is not allowed"
  },
  "DEAL_NOT_FIXED": {
    "question": 3,
    "layer": "deal",
    "actor": "counterparty",
    "retry": "new_request",
    "de": "Der Deal ist nicht per Hash festgelegt",
    "en": "the deal is not fixed by hash"
  },
  "DEAL_NO_TERMS": {
    "question": 3,
    "layer": "deal",
    "actor": "counterparty",
    "retry": "never",
    "de": "Der Deal hat keine maschinenlesbaren Bedingungen (output_schema oder terms)",
    "en": "the deal has no machine-readable terms (output_schema or terms)"
  },
  "DEAL_COUNTERPARTY_MISSING": {
    "question": 3,
    "layer": "deal",
    "actor": "agent",
    "retry": "new_request",
    "de": "Der Deal nennt keinen Verkäufer oder der Agent kauft bei sich selbst",
    "en": "the deal names no seller, or the agent buys from itself"
  },
  "DEAL_PRICE_MISSING": {
    "question": 3,
    "layer": "deal",
    "actor": "counterparty",
    "retry": "new_request",
    "de": "Der Deal hat keinen Preis in Minor-Einheiten und Währung",
    "en": "the deal has no price in minor units and currency"
  },
  "DEAL_PRICE_MISMATCH": {
    "question": 3,
    "layer": "deal",
    "actor": "gateway",
    "retry": "new_request",
    "de": "Settlement-Betrag oder -Währung weichen vom Deal ab",
    "en": "settlement amount or currency differ from the deal"
  },
  "DEAL_FX_MISSING": {
    "question": 3,
    "layer": "deal",
    "actor": "gateway",
    "retry": "new_request",
    "de": "Settlement in einem anderen Asset als der Deal-Währung ohne gebundenen Wechselkurs (fx)",
    "en": "settlement in another asset than the deal's currency without a bound exchange rate (fx)"
  },
  "MANDATE_MISSING": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Kein Mandat: kein Wallet ohne Vollmacht",
    "en": "no mandate: no wallet without authority"
  },
  "MANDATE_SIGNATURE": {
    "question": 4,
    "layer": "mandate",
    "actor": "issuer",
    "retry": "never",
    "de": "Die Signatur des Mandats stimmt nicht",
    "en": "the mandate's signature does not verify"
  },
  "MANDATE_AGENT_MISMATCH": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Das Mandat gilt für einen anderen Agenten",
    "en": "the mandate is for another agent"
  },
  "MANDATE_PRINCIPAL_MISMATCH": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "never",
    "de": "Mandat und Identität nennen verschiedene Principals",
    "en": "mandate and identity name different principals"
  },
  "MANDATE_NOT_YET_VALID": {
    "question": 4,
    "layer": "mandate",
    "actor": "gateway",
    "retry": "new_request",
    "de": "Das Mandat wurde nach dem Transfer ausgestellt",
    "en": "the mandate was issued after the transfer"
  },
  "MANDATE_NO_EXPIRY": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Das Mandat hat kein Ablaufdatum",
    "en": "the mandate has no expiry"
  },
  "MANDATE_EXPIRED": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Das Mandat ist abgelaufen",
    "en": "the mandate has expired"
  },
  "MANDATE_END_INVALID": {
    "question": 4,
    "layer": "mandate",
    "actor": "issuer",
    "retry": "never",
    "de": "Die Beendigung des Mandats ist ungültig",
    "en": "the mandate end statement is invalid"
  },
  "MANDATE_ENDED": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Das Mandat wurde beendet",
    "en": "the mandate has been ended"
  },
  "MANDATE_CURRENCY": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Die Währung des Deals ist nicht die des Mandats",
    "en": "the deal's currency is not the mandate's"
  },
  "MANDATE_OVER_ORDER_CAP": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Der Betrag liegt über der Limite pro Auftrag",
    "en": "the amount is over the cap per order"
  },
  "MANDATE_OVER_MONTHLY_CAP": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Der Betrag überschreitet die Monatslimite mit dem bereits Abgerechneten",
    "en": "the amount exceeds the monthly cap together with what was already settled"
  },
  "MANDATE_COUNTERPARTY_NOT_ALLOWED": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Der Verkäufer steht nicht auf der Gegenpartei-Allowlist des Mandats",
    "en": "the seller is not on the mandate's counterparty allowlist"
  },
  "MANDATE_NO_COUNTERPARTIES": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Das Mandat hat keine Gegenpartei-Allowlist, die Policy verlangt eine",
    "en": "the mandate has no counterparty allowlist and the policy requires one"
  },
  "MANDATE_NO_PURPOSE_CODES": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Das Mandat hat keine Zweck-Codes, die Policy verlangt sie",
    "en": "the mandate has no purpose codes and the policy requires them"
  },
  "MANDATE_PURPOSE_MISMATCH": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Der Zweck-Code des Deals ist im Mandat nicht erlaubt",
    "en": "the deal's purpose code is not allowed by the mandate"
  },
  "MANDATE_PRINCIPAL_SIGNATURE_REQUIRED": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "new_request",
    "de": "Die Policy verlangt die eigene Signatur des Principals auf dem Mandat",
    "en": "the policy requires the principal's own signature on the mandate"
  },
  "MANDATE_PRINCIPAL_KEY_MISMATCH": {
    "question": 4,
    "layer": "mandate",
    "actor": "issuer",
    "retry": "never",
    "de": "Der Schlüssel der Principal-Signatur ist nicht der, den die Identität für diesen Principal nennt",
    "en": "the key of the principal's signature is not the one the identity names for this principal"
  },
  "STEP_UP_AMOUNT": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "with_step_up",
    "de": "Der Betrag liegt über der Step-up-Schwelle: der Principal bestätigt diesen Transfer einzeln",
    "en": "the amount is above the step-up band: the principal confirms this transfer individually"
  },
  "STEP_UP_HUMAN_REQUIRED": {
    "question": 4,
    "layer": "mandate",
    "actor": "principal",
    "retry": "with_step_up",
    "de": "Das Mandat erlaubt kein Handeln ohne anwesenden Menschen",
    "en": "the mandate does not allow acting without a human present"
  },
  "SETTLEMENT_MISSING": {
    "question": 5,
    "layer": "settlement",
    "actor": "gateway",
    "retry": "new_request",
    "de": "Kein Settlement-Plan (Rail, Betrag, Währung, Gebühr)",
    "en": "no settlement plan (rail, amount, currency, fee)"
  },
  "RAIL_NOT_ALLOWED": {
    "question": 5,
    "layer": "settlement",
    "actor": "gateway",
    "retry": "fix_policy",
    "de": "Dieses Settlement-Rail ist nicht erlaubt",
    "en": "this settlement rail is not allowed"
  },
  "FEE_EATS_CALL": {
    "question": 5,
    "layer": "settlement",
    "actor": "gateway",
    "retry": "new_request",
    "de": "Die Gebühr frisst den Call: Defekt, nicht Preis",
    "en": "the fee eats the call: a defect, not a price"
  },
  "EVIDENCE_MISSING_PRIOR": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "after_evidence",
    "de": "Ein früherer Transfer dieser Kette wurde abgerechnet, hat aber kein Evidence-Objekt: Vorfall, keine zweite Zahlung",
    "en": "an earlier transfer on this chain was settled without an evidence object: an incident, no second payment"
  },
  "EVIDENCE_SIGNATURE": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "never",
    "de": "Die Signatur des Evidence-Objekts stimmt nicht",
    "en": "the evidence object's signature does not verify"
  },
  "EVIDENCE_NOT_FINAL": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "never",
    "de": "Das Settlement ist nicht final oder hat keine ID: kein Erfolg",
    "en": "the settlement is not final or has no id: no success"
  },
  "EVIDENCE_PRICE_MISMATCH": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "never",
    "de": "Abgerechnet wurde nicht der Preis des Deals",
    "en": "what was settled is not the deal's price"
  },
  "EVIDENCE_NO_RESULT": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "never",
    "de": "Das Evidence-Objekt nennt kein Ergebnis",
    "en": "the evidence names no result"
  },
  "EVIDENCE_INCOMPLETE": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "never",
    "de": "Das Evidence-Objekt nennt Identität, Mandat oder Deal nicht per Hash",
    "en": "the evidence does not name identity, mandate or deal by hash"
  },
  "EVIDENCE_NAMES_OTHER_IDENTITY": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "never",
    "de": "Das Evidence-Objekt nennt eine andere Identität",
    "en": "the evidence names another identity"
  },
  "EVIDENCE_NAMES_OTHER_MANDATE": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "never",
    "de": "Das Evidence-Objekt nennt ein anderes Mandat",
    "en": "the evidence names another mandate"
  },
  "EVIDENCE_NAMES_OTHER_TASK": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "never",
    "de": "Das Evidence-Objekt nennt eine andere Aufgabe",
    "en": "the evidence names another task"
  },
  "EVIDENCE_NAMES_OTHER_DEAL": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "never",
    "de": "Das Evidence-Objekt nennt einen anderen Deal oder eine andere Gegenpartei",
    "en": "the evidence names another deal or counterparty"
  },
  "EVIDENCE_WITHOUT_ALLOW": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "never",
    "de": "Dem Evidence-Objekt ging kein Allow dieses Gates voraus",
    "en": "no allow of this gate preceded the evidence"
  },
  "EVIDENCE_NAMES_OTHER_RECEIPT": {
    "question": 5,
    "layer": "evidence",
    "actor": "issuer",
    "retry": "never",
    "de": "Das Evidence-Objekt nennt eine andere Quittung",
    "en": "the evidence names another receipt"
  },
  "DISPUTE_SIGNATURE": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Die Signatur des Streit-Objekts stimmt nicht",
    "en": "the dispute's signature does not verify"
  },
  "DISPUTE_DECISION_SIGNATURE": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Die Signatur des Entscheids stimmt nicht",
    "en": "the decision's signature does not verify"
  },
  "DISPUTE_DECISION_NAMES_OTHER": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Der Entscheid nennt einen anderen Streit",
    "en": "the decision names another dispute"
  },
  "DISPUTE_NO_CLAIM": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Der Streit hat keinen Grund-Code oder keinen Hash der Beanstandung",
    "en": "the dispute has no reason code or no hash of the claim"
  },
  "DISPUTE_DECIDED_BEFORE_OPENED": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Entschieden, bevor der Streit eröffnet wurde",
    "en": "decided before the dispute was opened"
  },
  "DISPUTE_NO_OUTCOME": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Der Entscheid nennt kein Ergebnis oder nicht, wer trägt",
    "en": "the decision states no outcome or not who bears it"
  },
  "DISPUTE_REFUND_MISSING": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Für den Käufer entschieden, aber keine Rückerstattung mit Rail-ID",
    "en": "decided for the buyer, but no refund with the rail's id"
  },
  "DISPUTE_REFUND_UNEXPECTED": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Für den Verkäufer entschieden, aber eine Rückerstattung genannt",
    "en": "decided for the seller, but a refund is named"
  },
  "DISPUTE_NAMES_OTHER_RECEIPT": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Der Streit nennt eine andere Quittung",
    "en": "the dispute names another receipt"
  },
  "DISPUTE_WRONG_PARTIES": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Nicht vom Käufer gegen den Verkäufer der Quittung eröffnet",
    "en": "not opened by the buyer against the seller of the receipt"
  },
  "DISPUTE_OPENED_BEFORE_DELIVERY": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Eröffnet, bevor geliefert wurde",
    "en": "opened before the delivery"
  },
  "DISPUTE_REFUND_OVER_PAID": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Rückerstattung über dem bezahlten Betrag oder in anderer Währung",
    "en": "refund above what was paid, or in another currency"
  },
  "DISPUTE_ANSWER_MISMATCH": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Der Entscheid sah eine andere Antwort des Verkäufers als die gezeigte",
    "en": "the decision saw another answer from the seller than the one shown"
  },
  "DISPUTE_ANSWER_OUT_OF_ORDER": {
    "question": 5,
    "layer": "dispute",
    "actor": "issuer",
    "retry": "never",
    "de": "Die Antwort liegt nicht zwischen Eröffnung und Entscheid",
    "en": "the answer is not between opening and decision"
  }
};
