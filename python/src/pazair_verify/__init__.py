"""pazair-verify for Python: check Word Passes, receipts and Merkle proofs without trusting anyone.

"May I see your Word Pass?" The other agent answers with a URL; check_word_pass(url) checks it, for any issuer:
the pass at the URL, the issuer's keys at <origin>/.well-known/pazair-receipts.json, the Merkle proof and the
root on Stellar. Specification: https://github.com/Kula-Labs/pazair/blob/main/SPEC.md
"""
from __future__ import annotations

import base64
from decimal import Decimal
import hashlib
import math
import json
import urllib.request
from typing import Any, Callable, Optional
from urllib.parse import urlparse

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

__all__ = ["canonical", "sha256hex", "verify_signature", "verify_receipt", "leaf_of", "verify_proof", "verify_pass",
           "word_of", "stellar_has_root", "bitcoin_has_root", "read_ots", "check_word_pass", "say_pass", "fetch_keys", "fetch_keys_document", "verify_holder_proof",
           "receipt_hash", "verify_receipt_chain", "verify_mandate", "verify_award",
           "FINGERPRINT", "rs_encode", "fingerprint_of", "fingerprint_distance", "fingerprint_svg", "record_of", "ridges_of"]
__version__ = "1.8.0"

Fetch = Callable[[str], Any]  # returns parsed JSON, raises on failure


def _num(v: float) -> str:
    # As JavaScript's JSON.stringify writes numbers: 1.0 -> 1, shortest round-trip otherwise.
    if v != v or v in (float("inf"), float("-inf")):
        return "null"
    if v == 0:
        return "0"
    sign, digits, exp = Decimal(repr(abs(v))).normalize().as_tuple()
    ds, n = "".join(map(str, digits)), len(digits) + exp  # value = 0.ds × 10^n, ds the shortest round-trip digits
    k, s = len(ds), "-" if v < 0 else ""
    if k <= n <= 21:
        return s + ds + "0" * (n - k)
    if 0 < n <= 21:
        return s + ds[:n] + "." + ds[n:]
    if -6 < n <= 0:
        return s + "0." + "0" * -n + ds
    e = n - 1
    return s + ds[0] + ("." + ds[1:] if k > 1 else "") + "e" + ("+" if e > 0 else "-") + str(abs(e))


def canonical(v: Any) -> str:
    """Object keys sorted at every level, no whitespace, values as JSON.stringify writes them."""
    if isinstance(v, dict):
        return "{" + ",".join(f"{json.dumps(k, ensure_ascii=False)}:{canonical(v[k])}" for k in sorted(v, key=lambda s: s.encode("utf-16-be"))) + "}"
    if isinstance(v, list):
        return "[" + ",".join(canonical(x) for x in v) + "]"
    if isinstance(v, bool) or v is None:
        return json.dumps(v)
    if isinstance(v, (int, float)):
        # JSON.parse reads every number as a double: integers beyond 2^53 are written as JavaScript would.
        return _num(float(v)) if isinstance(v, float) or abs(v) > 2**53 else str(v)
    return json.dumps(v, ensure_ascii=False)


def sha256hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _unb64u(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def verify_signature(obj: dict, keys: list[dict], anchored_before: Optional[str] = None) -> bool:
    """Ed25519 over canonical(object without "sig"), with the key whose kid the object names.
    A revoked key (revoked_at) signs nothing new: only what anchored_before (a root day) proves older counts."""
    if not isinstance(obj, dict) or not isinstance(obj.get("sig"), str) or not isinstance(obj.get("kid"), str):
        return False
    k = next((k for k in keys if k.get("kid") == obj["kid"] and isinstance(k.get("x"), str)), None)
    if not k or sha256hex(k["x"])[:16] != k["kid"]:  # SPEC section 1: kid = sha256(x)[0:16]
        return False
    if k.get("revoked_at") and not (anchored_before and anchored_before < str(k["revoked_at"])[:10]):
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


def receipt_hash(receipt: dict) -> str:
    """Section 3.1: the hash a parent receipt names in `inputs`, the child receipt with its signature."""
    return sha256hex(canonical(receipt))


def verify_receipt_chain(top: dict, receipts: list[dict], keys: list[dict], max_depth: int = 8) -> dict:
    """Section 3.1: every input of `top` (and theirs, down the chain) present, signed, placed by the parent's
    seller for the parent's order and delivered no later than it. Returns the first broken link."""
    by_hash = {receipt_hash(r): r for r in receipts}
    st = {"links": 0, "depth": 0, "total_minor": {}}

    def walk(p: dict, d: int) -> Optional[str]:
        if not verify_signature(p, keys):
            return f"{p.get('order') if isinstance(p, dict) else None}: signature"
        if "inputs" not in p:
            return None
        if not isinstance(p["inputs"], list):
            return f"{p['order']}: inputs"
        if p["inputs"] and d >= max_depth:
            return f"{p['order']}: deeper than {max_depth}"
        for h in p["inputs"]:
            c = by_hash.get(h)
            if c is None:
                return f"{p['order']}: input {str(h)[:12]}… missing"
            if c.get("parent_order") != p.get("order"):
                return f"{c.get('order')}: parent_order is not {p.get('order')}"
            if c.get("buyer") != p.get("seller"):
                return f"{c.get('order')}: bought by {c.get('buyer')}, not by {p.get('seller')}"
            if not str(c.get("delivered_at")) <= str(p.get("delivered_at")):
                return f"{c.get('order')}: delivered after {p.get('order')}"
            st["links"] += 1
            st["depth"] = max(st["depth"], d + 1)
            st["total_minor"][c["currency"]] = st["total_minor"].get(c["currency"], 0) + c["amount_minor"]
            bad = walk(c, d + 1)
            if bad:
                return bad
        return None

    broken = walk(top, 0)
    return {"valid": broken is None, **st, "broken": broken}


def verify_mandate(receipt: dict, mandate: dict, keys: list[dict], end: Optional[dict] = None) -> dict:
    """Section 3.2: was this receipt bought within this mandate? Returns valid, covers (what held), reasons (what did not)."""
    covers: list[str] = []
    reasons: list[str] = []

    def ok(cond: bool, yes: str, no: str) -> None:
        (covers if cond else reasons).append(yes if cond else no)

    sc = (mandate or {}).get("scope") or {}
    ok(isinstance(mandate, dict) and mandate.get("kind") == "mandate" and verify_signature(mandate, keys), "mandate signed", "mandate signature")
    ok(verify_signature(receipt, keys), "receipt signed", "receipt signature")
    ok(receipt.get("mandate") == receipt_hash(mandate), "receipt names this mandate", "receipt names another mandate")
    ok(receipt.get("buyer") == mandate.get("agent"), "bought by the mandated agent", f"bought by {receipt.get('buyer')}, not by {mandate.get('agent')}")
    ok(receipt.get("currency") == sc.get("currency"), "currency within the mandate", f"currency {receipt.get('currency')}, mandate {sc.get('currency')}")
    amt, cap = receipt.get("amount_minor"), sc.get("max_order_minor")
    ok(isinstance(amt, int) and isinstance(cap, int) and amt <= cap, "amount within the cap per order", f"amount {amt} over the cap {cap}")
    ok(str(mandate.get("issued_at")) <= str(receipt.get("delivered_at")), "mandate older than the delivery", "delivered before the mandate existed")
    if end is not None:
        ok(end.get("kind") == "mandate_end" and end.get("mandate") == receipt.get("mandate") and verify_signature(end, keys), "end statement signed", "end statement")
        ok(str(receipt.get("delivered_at")) <= str(end.get("at")), "delivered before the mandate ended", "delivered after the mandate ended")
    return {"valid": not reasons, "covers": covers, "reasons": reasons}


def verify_award(receipt: dict, tender: dict, award: dict, keys: list[dict], qa: Optional[list[dict]] = None) -> dict:
    """Section 3.3: was this receipt paid under this award, for this tender? Returns valid, covers (what held), reasons (what did not)."""
    covers: list[str] = []
    reasons: list[str] = []

    def ok(cond: bool, yes: str, no: str) -> None:
        (covers if cond else reasons).append(yes if cond else no)

    tender, award = tender or {}, award or {}
    tender_hash = receipt_hash(tender)
    ok(tender.get("kind") == "tender" and verify_signature(tender, keys), "tender signed", "tender signature")
    ok(award.get("kind") == "award" and verify_signature(award, keys), "award signed", "award signature")
    ok(verify_signature(receipt, keys), "receipt signed", "receipt signature")
    ok(award.get("tender") == tender_hash, "award names this tender", "award names another tender")
    ok(receipt.get("award") == receipt_hash(award), "receipt names this award", "receipt names another award")
    ok(receipt.get("buyer") == tender.get("buyer"), "paid by the tendering agent", f"paid by {receipt.get('buyer')}, not by {tender.get('buyer')}")
    ok(receipt.get("seller") == award.get("seller") and award.get("seller") != tender.get("buyer"), "delivered by the awarded seller",
       f"delivered by {receipt.get('seller')}, awarded to {award.get('seller')}")
    ok(receipt.get("currency") == tender.get("currency"), "currency of the tender", f"currency {receipt.get('currency')}, tender {tender.get('currency')}")
    price, budget = award.get("price_minor"), tender.get("budget_max_minor")
    ok(_is_int(price) and _is_num(budget) and price <= budget, "price within the budget", f"price {price} over the budget {budget}")
    m = receipt.get("milestone")
    ms = None
    if m is not None:
        mss = tender.get("milestones") or []
        ms = mss[m] if _is_int(m) and 0 <= m < len(mss) and isinstance(mss[m], dict) else None
    cap = price if m is None else (ms or {}).get("max_minor")
    amt = receipt.get("amount_minor")
    ok(_is_int(amt) and _is_int(cap) and amt <= cap, f"amount within milestone {m}" if ms else "amount within the price", f"amount {amt} over {cap}")
    ok(str(tender.get("issued_at")) <= str(award.get("at")) <= str(receipt.get("delivered_at")), "tender, award, delivery in order", "out of order in time")
    if tender.get("deadline") is not None:
        ok(str(receipt.get("delivered_at")) <= str(tender["deadline"]), "delivered by the deadline", "delivered after the deadline")
    if qa is not None:
        held = {receipt_hash(q): q for q in qa}
        for h in award.get("qa") or []:
            q = held.get(h)
            ok(isinstance(q, dict) and q.get("kind") == "tender_qa" and q.get("tender") == tender_hash and str(q.get("at")) <= str(award.get("at"))
               and verify_signature(q, keys), f"question {h[:8]} published before the award", f"question {h[:8]} missing or invalid")
    return {"valid": not reasons, "covers": covers, "reasons": reasons}


def _is_int(x) -> bool:
    return isinstance(x, int) and not isinstance(x, bool)


def _is_num(x) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def leaf_of(p: dict) -> str:
    return sha256hex(canonical(p))


def verify_proof(leaf: str, proof: list[dict], root: str) -> bool:
    if not isinstance(proof, list) or not all(isinstance(s, dict) and s.get("side") in ("L", "R") and isinstance(s.get("hash"), str)
                                               and len(s["hash"]) == 64 and all(c in "0123456789abcdef" for c in s["hash"]) for s in proof):
        return False
    h = leaf
    for s in proof:
        h = sha256hex(s["hash"] + h) if s["side"] == "L" else sha256hex(h + s["hash"])
    return h == root


def word_of(p: dict) -> dict:
    """SPEC section 4: kept_pct and badge as they follow from the pass's own counts."""
    s = p.get("as_seller") or {}
    lost, d = p.get("disputes_lost") or 0, s.get("delivered") or 0
    closed = d + (s.get("not_delivered") or 0) + lost
    if not closed:
        return {"kept_pct": None, "badge": None}
    kept = int((d - min(lost, d)) / closed * 1000) / 10
    enough = d >= 10 and (s.get("buyers") or 0) >= 5
    return {"kept_pct": kept, "badge": "word_kept_99" if enough and kept >= 99 else "word_kept_95" if enough and kept >= 95 else None}


def verify_pass(anchored: dict, keys: list[dict], anchored_before: Optional[str] = None) -> dict:
    """A revoked key counts only with anchored_before: a day you proved yourself (a Bitcoin block time), never root.day."""
    p = anchored.get("pass", anchored)
    root = (anchored.get("root") or {}).get("root")
    in_root = verify_proof(leaf_of(p), anchored["proof"], root) if anchored.get("proof") is not None and root else None
    sig = p.get("kind") == "word_pass" and verify_signature(p, keys, anchored_before if in_root else None)
    w, pw = word_of(p), p.get("word")
    if pw is None:  # no word, no claim
        return {"valid": sig and in_root is not False, "signature_valid": sig, "in_root": in_root, "word_consistent": True, "word": None}
    pk = pw.get("kept_pct")
    consistent = (pk is None) == (w["kept_pct"] is None) and (pk is None or (isinstance(pk, (int, float)) and float(pk) == w["kept_pct"])) and pw.get("badge") == w["badge"]
    return {"valid": sig and in_root is not False and consistent, "signature_valid": sig, "in_root": in_root, "word_consistent": consistent, "word": p.get("word")}


def _get_json(url: str) -> Any:
    req = urllib.request.Request(url, headers={"accept": "application/json", "user-agent": "pazair-verify-python"})
    with urllib.request.urlopen(req, timeout=8) as r:  # noqa: S310 (https only, checked by callers)
        return json.loads(r.read(200_001)[:200_000])


def _get_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"user-agent": "pazair-verify-python"})
    with urllib.request.urlopen(req, timeout=10) as r:  # noqa: S310 (fixed https explorers)
        return r.read(1000).decode("ascii", "replace")


def fetch_keys_document(origin: str, fetch: Fetch = _get_json) -> dict:
    return fetch(origin.rstrip("/") + "/.well-known/pazair-receipts.json")


def fetch_keys(origin: str, fetch: Fetch = _get_json) -> list[dict]:
    return fetch_keys_document(origin, fetch)["keys"]


def stellar_has_root(tx: str, root: str, fetch: Fetch = _get_json, horizon: str = "https://horizon.stellar.org", account: Optional[str] = None) -> Optional[bool]:
    """True on the public network; False when the transaction carries something else or comes from another account
    than the issuer's declared anchor account; None when nobody can say."""
    if not isinstance(tx, str) or len(tx) != 64:
        return False
    try:
        t = fetch(f"{horizon}/transactions/{tx.lower()}")
    except Exception:
        return None
    if t.get("memo_type") != "hash" or not isinstance(t.get("memo"), str) or t.get("successful") is not True:
        return False
    if account and t.get("source_account") != account:
        return False
    return base64.b64decode(t["memo"]).hex() == root.lower()


_OTS_MAGIC = bytes.fromhex("004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294")
_TAG_BITCOIN = bytes.fromhex("0588960d73d71901")
ESPLORA = ["https://blockstream.info/api", "https://mempool.space/api"]


def read_ots(data: bytes) -> dict:
    """Read an OpenTimestamps proof and walk it from its digest: {"digest": hex, "claims": [{"height", "msg"}]},
    msg being the attested commitment in raw byte order (for Bitcoin: the block's Merkle root). Raises ValueError."""
    pos = [0]

    def byte() -> int:
        if pos[0] >= len(data):
            raise ValueError("ots: unexpected end")
        pos[0] += 1
        return data[pos[0] - 1]

    def take(n: int) -> bytes:
        if pos[0] + n > len(data):
            raise ValueError("ots: unexpected end")
        pos[0] += n
        return data[pos[0] - n:pos[0]]

    def uint(next_byte: Callable[[], int]) -> int:
        v, s = 0, 0
        while True:
            b = next_byte()
            v += (b & 0x7F) << s
            if not b & 0x80:
                return v
            s += 7
            if s > 49:
                raise ValueError("ots: varuint too large")

    def varbytes(mx: int) -> bytes:
        n = uint(byte)
        if n > mx:
            raise ValueError("ots: too long")
        return take(n)

    def apply(tag: int, arg: Optional[bytes], m: bytes) -> Optional[bytes]:
        if tag == 0x08:
            return hashlib.sha256(m).digest()
        if tag == 0x02:
            return hashlib.sha1(m).digest()  # noqa: S324 (OpenTimestamps op, not used for security here)
        if tag == 0x03:
            try:
                return hashlib.new("ripemd160", m).digest()
            except ValueError:
                return None
        if tag == 0xF0:
            return m + (arg or b"")
        if tag == 0xF1:
            return (arg or b"") + m
        if tag == 0xF2:
            return m[::-1]
        if tag == 0xF3:
            return m.hex().encode()
        return None

    claims: list[dict] = []

    def walk(m: Optional[bytes], depth: int) -> None:
        if depth > 256:
            raise ValueError("ots: too deep")

        def item(tag: int) -> None:
            if tag == 0x00:
                t, payload = take(8), varbytes(8192)
                if t == _TAG_BITCOIN and m is not None:
                    it = iter(payload)
                    claims.append({"height": uint(lambda: next(it)), "msg": m.hex()})
                return
            arg = None
            if tag in (0xF0, 0xF1):
                arg = varbytes(4096)
            elif tag not in (0x08, 0x02, 0x03, 0x67, 0xF2, 0xF3):
                raise ValueError(f"ots: unknown op {tag:#x}")
            walk(apply(tag, arg, m) if m is not None else None, depth + 1)

        tag = byte()
        while tag == 0xFF:
            item(byte())
            tag = byte()
        item(tag)

    if take(31) != _OTS_MAGIC:
        raise ValueError("ots: not an .ots file")
    if uint(byte) != 1:
        raise ValueError("ots: version")
    if byte() != 0x08:
        raise ValueError("ots: only sha256 files")
    digest = take(32)
    try:
        walk(digest, 0)
    except StopIteration:
        raise ValueError("ots: payload") from None
    if pos[0] != len(data):
        raise ValueError("ots: trailing bytes")
    return {"digest": digest.hex(), "claims": sorted(claims, key=lambda c: c["height"])}


def bitcoin_has_root(ots_base64: str, root: str, fetch: Fetch = _get_json, fetch_text: Callable[[str], str] = _get_text, explorers: list[str] = ESPLORA) -> dict:
    """Is the root in Bitcoin? The .ots must be for exactly this root and end in the Merkle root of the block it names.
    ok True (confirmed, with block), False (unreadable, wrong_root, wrong_block), None (pending, unverified)."""
    try:
        ots = read_ots(base64.b64decode(ots_base64, validate=True))
    except Exception:
        return {"ok": False, "status": "unreadable"}
    if ots["digest"] != str(root).lower():
        return {"ok": False, "status": "wrong_root"}
    if not ots["claims"]:
        return {"ok": None, "status": "pending"}
    wrong = 0
    for c in ots["claims"]:
        if len(c["msg"]) != 64:
            wrong += 1
            continue
        want = bytes.fromhex(c["msg"])[::-1].hex()
        for base in explorers:
            try:
                h = fetch_text(f"{base}/block-height/{c['height']}").strip()
                if len(h) != 64 or any(x not in "0123456789abcdef" for x in h):
                    continue
                b = fetch(f"{base}/block/{h}")
                if not isinstance(b.get("merkle_root"), str) or not isinstance(b.get("timestamp"), int) or b.get("height") != c["height"]:
                    continue
            except Exception:
                continue
            if b["merkle_root"].lower() != want:
                wrong += 1
                break
            from datetime import datetime, timezone
            t = datetime.fromtimestamp(b["timestamp"], tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
            return {"ok": True, "status": "confirmed", "block": {"height": c["height"], "hash": h, "time": t}}
    return {"ok": False, "status": "wrong_block"} if wrong == len(ots["claims"]) else {"ok": None, "status": "unverified"}


def say_pass(p: dict, by: Optional[str] = None) -> str:
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
    return f"{p.get('name')} (Word Pass by {by or p.get('issuer')}): {head}; {record}."


def verify_holder_proof(proof: Any, keys: list[dict], agent: str, nonce: str, now: Optional[float] = None, aud: Optional[str] = None) -> dict:
    """The issuer signed {agent, nonce} for the agent showing the pass: it is theirs, not a copied URL."""
    import time
    from datetime import datetime
    if not isinstance(proof, dict) or proof.get("kind") != "word_pass_proof":
        return {"ok": False, "reason": "not a holder proof"}
    if not verify_signature(proof, keys):
        return {"ok": False, "reason": "signature does not match the issuer's key"}
    if proof.get("agent") != agent:
        return {"ok": False, "reason": "the proof is for another agent"}
    if not isinstance(nonce, str) or len(nonce) < 8 or proof.get("nonce") != nonce:
        return {"ok": False, "reason": "the proof is not for the nonce you gave"}
    if aud is not None and proof.get("aud") != aud:
        return {"ok": False, "reason": "the proof was made for another checker"}
    try:
        exp = datetime.fromisoformat(str(proof.get("exp")).replace("Z", "+00:00")).timestamp()
    except ValueError:
        return {"ok": False, "reason": "the proof has expired"}
    if exp < (time.time() if now is None else now):
        return {"ok": False, "reason": "the proof has expired"}
    return {"ok": True, "reason": "ok"}


def check_word_pass(url: str, fetch: Fetch = _get_json, proof: Any = None, nonce: Optional[str] = None, fetch_text: Callable[[str], str] = _get_text, aud: Optional[str] = None) -> dict:
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
    try:
        return _check_doc(url, u, doc, fetch, proof, nonce, fetch_text, aud)
    except (AttributeError, KeyError, TypeError, ValueError, IndexError):
        return none(f"The document at {url} is not a valid Word Pass.")


def _check_doc(url, u, doc, fetch, proof, nonce, fetch_text, aud=None) -> dict:
    def none(say: str) -> dict:
        return {"trust": "unreachable", "say": say, "issuer": None, "checks": None, "pass": None}

    anchored = doc.get("anchored") if isinstance(doc.get("anchored"), dict) and doc["anchored"].get("pass") else (doc if (doc.get("pass") or {}).get("kind") == "word_pass" else None)
    p = anchored["pass"] if anchored else (doc.get("current") if (doc.get("current") or {}).get("kind") == "word_pass" else doc if doc.get("kind") == "word_pass" else None)
    if not p:
        return none(f"The document at {url} is not a Word Pass.")
    try:
        kd = fetch_keys_document(f"{u.scheme}://{u.netloc}", fetch)
        keys = kd["keys"]
    except Exception:
        return none(f"{u.netloc} publishes no keys at /.well-known/pazair-receipts.json.")
    v = verify_pass(anchored or p, keys)
    root = (anchored or {}).get("root") or {}
    st = (kd.get("anchors") or {}).get("stellar") or {}
    account = st.get("account") if st.get("network") == "mainnet" and isinstance(st.get("account"), str) else None
    stellar = stellar_has_root(root["stellar_tx"], root["root"], fetch, account=account) if v["in_root"] and root.get("stellar_tx") and account else None
    btc = bitcoin_has_root(root["bitcoin_ots"], root["root"], fetch, fetch_text) if v["in_root"] and root.get("bitcoin_ots") else None
    if not v["signature_valid"] and btc and btc.get("ok") and (btc.get("block") or {}).get("time"):
        v = verify_pass(anchored, keys, btc["block"]["time"][:10])  # revoked key: only a Bitcoin block proves "before"
    held = verify_holder_proof(proof, keys, p.get("agent"), nonce or "", aud=aud) if proof is not None else None
    checks = {"signature": v["signature_valid"], "in_root": v["in_root"], "day": root.get("day"), "stellar": stellar, "stellar_account_bound": bool(stellar and account),
              "bitcoin_ots": bool(v["in_root"] and root.get("bitcoin_ots")), "bitcoin": btc["ok"] if btc else None, "holder": held["ok"] if held else None, "word": v["word_consistent"]}
    if btc and btc.get("block"):
        checks["bitcoin_block"] = btc["block"]
    issuer = u.netloc
    if not checks["signature"]:
        return {"trust": "invalid", "issuer": issuer, "checks": checks, "pass": p, "say": f"Do not rely on this pass: its signature does not match {issuer}'s published key."}
    if checks["in_root"] is False:
        return {"trust": "invalid", "issuer": issuer, "checks": checks, "pass": p, "say": f"Do not rely on this pass: its Merkle proof does not lead to the root of {checks['day']}."}
    if stellar is False:
        return {"trust": "invalid", "issuer": issuer, "checks": checks, "pass": p, "say": f"Do not rely on this pass: the Stellar transaction it names does not carry the root of {checks['day']} from {issuer}'s anchor account."}
    if btc and btc["ok"] is False:
        return {"trust": "invalid", "issuer": issuer, "checks": checks, "pass": p, "say": f"Do not rely on this pass: the Bitcoin proof it names for the root of {checks['day']} is not for that root or not in the block it claims."}
    if not v["word_consistent"]:
        return {"trust": "invalid", "issuer": issuer, "checks": checks, "pass": p, "say": "Do not rely on this pass: its badge does not follow from its own counts (SPEC section 4)."}
    if held and not held["ok"]:
        return {"trust": "invalid", "issuer": issuer, "checks": checks, "pass": p, "say": f"Do not rely on this pass: the agent showing it could not prove it is {p.get('name')} ({held['reason']}). It may be someone else's pass."}
    found = (", found on Stellar from the issuer's anchor account" if account else ", found on Stellar") if stellar else ""
    where = (f"in the Merkle root of {checks['day']}" + found + (f", confirmed in Bitcoin block {btc['block']['height']} ({btc['block']['time'][:10]})" if btc and btc.get("block") else ", stamped in Bitcoin (block confirmation pending)" if checks["bitcoin_ots"] else "")) if checks["in_root"] else "not anchored yet"
    whose = " The agent showing it proved it is this agent." if held and held["ok"] else " To be sure it is theirs, give them a fresh nonce and ask for a holder proof (prove_word_pass)."
    anchored_ok = stellar is True or bool(btc and btc.get("ok") is True)
    trust = "no_badge_yet" if not (p.get("word") or {}).get("badge") else "kept_its_word" if anchored_ok else "signed_unanchored"
    return {"trust": trust, "issuer": issuer, "checks": checks, "pass": p,
            "say": f"{say_pass(p, issuer)} Checked: signature of {issuer} valid, {where}.{whose}"}



# Fingerprint (SPEC section 15): a print no other agent can carry, provably.
# seed = sha256(origin "\n" agent "\n" first_leaf); its first 10 bytes are the message of a Reed-Solomon code over
# GF(256) with n = 64, k = 10, so any two prints differ in at least 55 of 64 symbols. Same drawing as pazair-verify (JS).
_N, _K, _POLY = 64, 10, 0x11D
_EXP, _LOG = [0] * 512, [0] * 256
_x = 1
for _i in range(255):
    _EXP[_i], _LOG[_x] = _x, _i
    _x <<= 1
    if _x & 256:
        _x ^= _POLY
for _i in range(255, 512):
    _EXP[_i] = _EXP[_i - 255]


def _mul(a: int, b: int) -> int:
    return _EXP[_LOG[a] + _LOG[b]] if a and b else 0


def _gen() -> list[int]:
    g = [1]
    for i in range(_N - _K):
        r, ng = _EXP[i], [0] * (len(g) + 1)
        for j, c in enumerate(g):
            ng[j] ^= c
            ng[j + 1] ^= _mul(c, r)
        g = ng
    return g


_GEN = _gen()
FINGERPRINT = {"n": _N, "k": _K, "d": _N - _K + 1, "field": "GF(256), polynomial 0x11d", "generator": "roots α^0 … α^53"}


def rs_encode(msg: bytes) -> bytes:
    """Systematic Reed-Solomon encoding: the first 10 bytes of msg, then 54 parity bytes."""
    buf = bytearray(_N)
    buf[:_K] = msg[:_K]
    for i in range(_K):
        c = buf[i]
        if not c:
            continue
        for j in range(1, len(_GEN)):
            buf[i + j] ^= _mul(_GEN[j], c)
    return bytes(msg[:_K]) + bytes(buf[_K:])


def fingerprint_of(origin: str, agent: str, first_leaf: str) -> dict:
    """The seed and the codeword (lowercase hex) of an agent: the issuer's origin, the agent id, the leaf of its first anchored pass."""
    for k, v in (("origin", origin), ("agent", agent), ("first_leaf", first_leaf)):
        if not isinstance(v, str) or not v:
            raise TypeError(f"fingerprint_of: {k} must be a non-empty string")
    seed = sha256hex(f"{origin.rstrip('/')}\n{agent}\n{first_leaf}")
    return {"seed": seed, "codeword": rs_encode(bytes.fromhex(seed)).hex()}


def _cw(x: Any) -> bytes:
    b = bytes.fromhex(x["codeword"] if isinstance(x, dict) else x)
    if len(b) != _N:
        raise TypeError("a codeword has 64 bytes")
    return b


def fingerprint_distance(a: Any, b: Any) -> int:
    """How many of the 64 symbols differ; never below 55 for two different seeds."""
    return sum(1 for x, y in zip(_cw(a), _cw(b)) if x != y)


def record_of(p: dict) -> dict:
    s = (p or {}).get("as_seller") or {}
    return {"delivered": int(s.get("delivered") or 0), "buyers": int(s.get("buyers") or 0), "badge": ((p or {}).get("word") or {}).get("badge"), "disputes_lost": int((p or {}).get("disputes_lost") or 0)}


def ridges_of(delivered: int) -> int:
    return min(5 + max(0, int(delivered)) // 3, 26)


def fingerprint_svg(codeword: Any, record: Optional[dict] = None, size: int = 360, ink: str = "currentColor", gold: str = "#d1a04a", background: str = "none") -> str:
    """The reference drawing (SVG), byte for byte the same as pazair-verify (JS) for the same input."""
    cw = _cw(codeword)
    rec = {"delivered": 0, "buyers": 0, "badge": None, "disputes_lost": 0, **(record or {})}
    W = 360
    cx, cy, total = W / 2, W * 0.52, ridges_of(rec["delivered"])
    gap, r0 = (W * 0.40) / (total + 1), W * 0.06
    raw = [((s >> 5) - 3.5) / 3.5 for s in cw]
    sm = [(raw[(j + _N - 1) % _N] + 2 * raw[j] + raw[(j + 1) % _N]) / 4 for j in range(_N)]
    tau = math.pi * 2

    def bulge_at(th: float) -> float:
        u = ((th / tau) * _N + _N) % _N
        j = int(math.floor(u))
        f = (1 - math.cos((u - j) * math.pi)) / 2
        return sm[j] * (1 - f) + sm[(j + 1) % _N] * f

    p1, p2 = (cw[0] / 255) * tau, (cw[1] / 255) * tau
    e1, e2 = 0.06 + (cw[2] / 255) * 0.08, 0.04 + (cw[3] / 255) * 0.06

    def radius_at(i: int, th: float) -> float:
        return (r0 + i * gap) * (1 + e1 * math.cos(th - p1) * (i / total) + e2 * math.cos(2 * th - p2)) * (1 + 0.06 * bulge_at(th) * min(1, i / 3))

    def f1(x: float) -> str:
        return "%.1f" % (math.floor(x * 10 + 0.5) / 10)

    paths = []
    for i in range(total):
        last = i == total - 1 and bool(rec["badge"])
        closed_core = rec["buyers"] >= 5 if i < 2 else True
        width = 2.8 if last else 1.6 + ((cw[i % _N] >> 6) & 3) * 0.2
        d, pen = "", False
        for k in range(257):
            th = (k / 256) * tau - math.pi / 2
            sector = int(math.floor((((th / tau) * _N) + _N) % _N))
            s = cw[sector]
            ending = (s & 31) % total == i
            open_gap = (not closed_core) and th > math.pi * 0.12 and th < math.pi * 0.5
            r = radius_at(i, th)
            x, y = cx + math.cos(th) * r * 0.84, cy + math.sin(th) * r
            if ending or open_gap:
                pen = False
                continue
            d += f"{'L' if pen else 'M'}{f1(x)} {f1(y)}"
            pen = True
        paths.append(f'<path d="{d}" stroke="{gold if last else ink}" stroke-width="{f1(width)}"/>')
    scars = ""
    for dd in range(rec["disputes_lost"]):
        th = ((cw[(dd * 11) % _N] / 255) * tau) - math.pi / 2
        ra, rb = r0 + gap * 2.5, r0 + gap * min(total - 0.5, 7.5)
        scars += f'<path d="M{f1(cx + math.cos(th) * ra * 0.84)} {f1(cy + math.sin(th) * ra)}L{f1(cx + math.cos(th + 0.08) * rb * 0.84)} {f1(cy + math.sin(th + 0.08) * rb)}" stroke="#000" stroke-width="7.2" stroke-linecap="round"/>'
    mask = f'<mask id="scars"><rect width="{W}" height="{W}" fill="#fff"/>{scars}</mask>' if scars else ""
    desc = f"Word Pass fingerprint: {total} ridges from {rec['delivered']} delivered orders; core {'closed' if rec['buyers'] >= 5 else 'open'} ({rec['buyers']} buyers); {rec['disputes_lost']} disputes lost; {('badge ' + rec['badge']) if rec['badge'] else 'no badge yet'}. Codeword {cw.hex()}."
    bg = "" if background == "none" else f'<rect width="{W}" height="{W}" fill="{background}"/>'
    g_mask = ' mask="url(#scars)"' if scars else ""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" width="{size}" height="{size}" role="img" aria-label="Word Pass fingerprint">'
            f"<title>Word Pass fingerprint</title><desc>{desc}</desc>{bg}{mask}"
            f'<g fill="none" stroke-linecap="round" stroke-linejoin="round"{g_mask}>{"".join(paths)}</g></svg>')


def main() -> None:
    import sys
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print("Usage: pazair-verify <word pass url>")
        raise SystemExit(0 if len(sys.argv) > 1 else 2)
    r = check_word_pass(sys.argv[1])
    print(r["say"])
    raise SystemExit({"kept_its_word": 0, "no_badge_yet": 0, "signed_unanchored": 0, "invalid": 1, "unreachable": 3}.get(r["trust"], 1))
