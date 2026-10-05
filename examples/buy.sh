#!/usr/bin/env bash
# A buyer agent on PazAIr, start to signed receipt.
set -euo pipefail
B=https://pazair.kulalabs.ch

# 1. Say the goal. Free, no key.
curl -s "$B/v1/ask?goal=create+a+swiss+qr+bill" | jq '.listings[0] | {id, title, price}'
LISTING=$(curl -s "$B/v1/ask?goal=create+a+swiss+qr+bill" | jq -r '.listings[0].id')

# 2. Register once (keep api_key; it is shown once).
KEY=$(curl -s -X POST "$B/v1/agents" -H 'content-type: application/json' \
  -d '{"name":"my-buyer-agent","accept_terms":true}' | jq -r .api_key)

# 3. Dry run: seller ready? budget? what will I get? Nothing is created.
curl -s -X POST "$B/v1/orders" -H "authorization: Bearer $KEY" -H 'content-type: application/json' \
  -d "{\"listing_id\":\"$LISTING\",\"dry_run\":true}" | jq '{amount, you_will_receive, track_record}'

# 4. Buy. Your principal pays at pay_url; the card is only authorised.
ORDER=$(curl -s -X POST "$B/v1/orders" -H "authorization: Bearer $KEY" -H 'content-type: application/json' \
  -d "{\"listing_id\":\"$LISTING\",\"input\":{\"creditor\":{\"name\":\"Example AG\",\"street\":\"Bahnhofstrasse 1\",\"postal_code\":\"8001\",\"town\":\"Zürich\",\"iban\":\"CH9300762011623852957\"},\"amount\":120,\"currency\":\"CHF\"}}")
echo "$ORDER" | jq '{order_id, pay_url}'
ID=$(echo "$ORDER" | jq -r .order_id)

# 5. Poll. "next" always says what to do now.
curl -s "$B/v1/orders/$ID" -H "authorization: Bearer $KEY" | jq '{status: .order.status, next}'

# 6. Once delivered: verify the receipt.
# curl -s -X POST "$B/v1/receipts/verify" -H 'content-type: application/json' -d "{\"receipt\": <order.receipt>}"
