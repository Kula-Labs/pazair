"""pazair-verify for Python: check Word Passes, receipts and Merkle proofs without trusting anyone.

"May I see your Word Pass?" The other agent answers with a URL; check_word_pass(url) checks it, for any issuer:
the pass at the URL, the issuer's keys at <origin>/.well-known/pazair-receipts.json, the Merkle proof and the
root on Stellar. Specification: https://github.com/Kula-Labs/pazair/blob/main/SPEC.md
"""
from __future__ import annotations

import base64
import hashlib
import json
import urllib.request
from typing import Any, Callable, Optional
from urllib.parse import urlparse

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

__all__ = ["canonical", "sha256hex", "verify_signature", "verify_receipt", "leaf_of", "verify_proof", "verify_pass",
           "stellar_has_root", "check_word_pass", "say_pass", "fetch_keys"]
__version__ = "1.1.0"

Fetch = Callable[[str], Any]  # returns parsed JSON, raises on failure


def _num(v: float) -> str:
    # As JavaScript's JSON.stringify writes numbers: 1.0 -> 1, shortest round-trip otherwise.
    if v != v or v in (float("inf"), float("-inf")):
        return "null"
    if v == int(v) and abs(v) < 1e21:
        return str(int(v))
    return repr(v)


def canonical(v: Any) -> str:
    """Object keys sorted at every level, no whitespace, values as JSON.stringify writes them."""
    if isinstance(v, dict):
        return "{" + ",".join(f"{json.dumps(k, ensure_ascii=False)}:{canonical(v[k])}" for k in sorted(v, key=lambda s: s.encode("utf-16-be"))) + "}"
    if isinstance(v, list):
        return "[" + ",".join(canonical(x) for x in v) + "]"
    if isinstance(v, bool) or v is None:
        return json.dumps(v)
    if isinstance(v, (int, float)):
        return _num(float(v)) if isinstance(v, float) else str(v)
    return json.dumps(v, ensure_ascii=False)


def sha256hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _unb64u(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def verify_signature(obj: dict, keys: list[dict]) -> bool:
    """Ed25519 over canonical(object without "sig"), with the key whose kid the object names."""
    if not isinstance(obj, dict) or not isinstance(obj.get("sig"), str) or not isinstance(obj.get("kid"), str):
        return False
    k = next((k for k in keys if k.get("kid") == obj["kid"] and isinstance(k.get("x"), str)), None)
    if not k:
        return False
    body = {key: val for key, val in obj.items() if key != "sig"}
    try:
        Ed25519PublicKey.from_public_bytes(_unb64u(k["x"])).verify(_unb64u(obj["sig"]), canonical(body).encode("utf-8"))
        return True
    except (InvalidSignature, ValueError):
        return False


def verify_receipt(receipt: dict, keys: list[dict], delivery: Any = None) -> dict:
    signature_valid = isinstance(receipt.get("issuer"), str) and verify_signature(receipt, keys)
    matches = None
    if delivery is not None:
        text = delivery if isinstance(delivery, str) else json.dumps(delivery, separators=(",", ":"), ensure_ascii=False)
        matches = sha256hex(text) == receipt.get("delivery_sha256")
    return {"valid": signature_valid and matches is not False, "signature_valid": signature_valid, "delivery_matches": matches}


def leaf_of(p: dict) -> str:
    return sha256hex(canonical(p))


def verify_proof(leaf: str, proof: list[dict], root: str) -> bool:
    h = leaf
    for s in proof:
        h = sha256hex(s["hash"] + h) if s["side"] == "L" else sha256hex(h + s["hash"])
    return h == root


def verify_pass(anchored: dict, keys: list[dict]) -> dict:
    p = anchored.get("pass", anchored)
    sig = p.get("kind") == "word_pass" and verify_signature(p, keys)
    root = (anchored.get("root") or {}).get("root")
    in_root = verify_proof(leaf_of(p), anchored["proof"], root) if anchored.get("proof") is not None and root else None
    return {"valid": sig and in_root is not False, "signature_valid": sig, "in_root": in_root, "word": p.get("word")}


def _get_json(url: str) -> Any:
    req = urllib.request.Request(url, headers={"accept": "application/json", "user-agent": "pazair-verify-python"})
    with urllib.request.urlopen(req, timeout=8) as r:  # noqa: S310 (https only, checked by callers)
        return json.loads(r.read(200_001)[:200_000])


def fetch_keys(origin: str, fetch: Fetch = _get_json) -> list[dict]:
    return fetch(origin.rstrip("/") + "/.well-known/pazair-receipts.json")["keys"]


def stellar_has_root(tx: str, root: str, fetch: Fetch = _get_json, horizon: str = "https://horizon.stellar.org") -> Optional[bool]:
    """True on the public network; False when the transaction carries something else; None when nobody can say."""
    if not isinstance(tx, str) or len(tx) != 64:
        return False
    try:
        t = fetch(f"{horizon}/transactions/{tx.lower()}")
    except Exception:
        return None
    if t.get("memo_type") != "hash" or not isinstance(t.get("memo"), str) or t.get("successful") is not True:
        return False
    return base64.b64decode(t["memo"]).hex() == root.lower()


def say_pass(p: dict) -> str:
    s, w = p.get("as_seller") or {}, p.get("word") or {}

    def n(x: int, one: str) -> str:
        return f"{x} {one if x == 1 else one + 's'}"

    if s.get("delivered"):
        record = f"{n(s['delivered'], 'paid order')} delivered to {n(s.get('buyers', 0), 'buyer')}, {n(p.get('disputes_lost', 0), 'dispute')} lost"
    else:
        record = f"no sales yet, {n((p.get('as_buyer') or {}).get('paid_orders', 0), 'paid purchase')}"
    b = w.get("badge")
    head = ("kept its word on 99 % or more" if b == "word_kept_99" else "kept its word on 95 % or more" if b == "word_kept_95"
            else f"kept its word on {_num(float(w['kept_pct']))} % (no badge yet)" if w.get("kept_pct") is not None else "new, no record yet")
    return f"{p.get('name')} (Word Pass by {p.get('issuer')}): {head}; {record}."


def check_word_pass(url: str, fetch: Fetch = _get_json) -> dict:
    """The verdict for a pass shown by URL: kept_its_word, no_badge_yet, invalid or unreachable, with one sentence."""
    def none(say: str) -> dict:
        return {"trust": "unreachable", "say": say, "issuer": None, "checks": None, "pass": None}

    u = urlparse(url)
    if u.scheme != "https" or not u.netloc:
        return none("A Word Pass is shown at a public https URL.")
    try:
        doc = fetch(url)
    except Exception:
        return none(f"No Word Pass could be read at {url}.")
    anchored = doc.get("anchored") if isinstance(doc.get("anchored"), dict) and doc["anchored"].get("pass") else (doc if (doc.get("pass") or {}).get("kind") == "word_pass" else None)
    p = anchored["pass"] if anchored else (doc.get("current") if (doc.get("current") or {}).get("kind") == "word_pass" else doc if doc.get("kind") == "word_pass" else None)
    if not p:
        return none(f"The document at {url} is not a Word Pass.")
    try:
        keys = fetch_keys(f"{u.scheme}://{u.netloc}", fetch)
    except Exception:
        return none(f"{u.netloc} publishes no keys at /.well-known/pazair-receipts.json.")
    v = verify_pass(anchored or p, keys)
    root = (anchored or {}).get("root") or {}
    stellar = stellar_has_root(root["stellar_tx"], root["root"], fetch) if v["in_root"] and root.get("stellar_tx") else None
    checks = {"signature": v["signature_valid"], "in_root": v["in_root"], "day": root.get("day"), "stellar": stellar, "bitcoin_ots": bool(v["in_root"] and root.get("bitcoin_ots"))}
    issuer = u.netloc
    if not checks["signature"]:
        return {"trust": "invalid", "issuer": issuer, "checks": checks, "pass": p, "say": f"Do not rely on this pass: its signature does not match {issuer}'s published key."}
    if checks["in_root"] is False:
        return {"trust": "invalid", "issuer": issuer, "checks": checks, "pass": p, "say": f"Do not rely on this pass: its Merkle proof does not lead to the root of {checks['day']}."}
    if stellar is False:
        return {"trust": "invalid", "issuer": issuer, "checks": checks, "pass": p, "say": f"Do not rely on this pass: the Stellar transaction it names does not carry the root of {checks['day']}."}
    where = (f"in the Merkle root of {checks['day']}" + (", found on Stellar" if stellar else "") + (", stamped in Bitcoin" if checks["bitcoin_ots"] else "")) if checks["in_root"] else "not anchored yet"
    return {"trust": "kept_its_word" if (p.get("word") or {}).get("badge") else "no_badge_yet", "issuer": issuer, "checks": checks, "pass": p,
            "say": f"{say_pass(p)} Checked: signature of {issuer} valid, {where}."}


def main() -> None:
    import sys
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("Usage: pazair-verify <word pass url>")
        raise SystemExit(2)
    r = check_word_pass(sys.argv[1])
    print(r["say"])
    raise SystemExit(0 if r["trust"] in ("kept_its_word", "no_badge_yet") else 1)
