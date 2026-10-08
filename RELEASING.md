# Releasing pazair-verify and word-pass-issuer

A tag publishes; nobody uploads by hand. `.github/workflows/publish-verify.yml` runs the tests, checks that the tag
matches the version in the package, builds and publishes with provenance (anyone can see the package came from
this repository).

| Tag | Publishes |
|---|---|
| `verify-v1.6.1` | npm `pazair-verify` from `verify/` |
| `issuer-v1.1.0` | npm `word-pass-issuer` from `issuer/` |
| `python-v1.6.1` | PyPI `pazair-verify` from `python/` |

## Once: connect the registries

**npm (the first version by hand, then trusted publishing)**

1. On npmjs.com, sign in with the Kula Labs account, two-factor on.
2. Publish the very first version of a new package from your machine, in its folder:
   `npm login`, then `npm publish --access public --provenance=false` (provenance only exists in CI).
3. On npmjs.com: the package → Settings → Trusted Publisher → GitHub Actions: organization `Kula-Labs`,
   repository `pazair`, workflow `publish-verify.yml`, *Allow npm publish* checked. From now on every tag
   publishes from GitHub with provenance; no token exists that could leak. The connection must be used once
   within a few days of setting it up, or it lapses.

**PyPI (trusted publishing from the start, no token ever)**

1. On pypi.org, sign in with the Kula Labs account (two-factor on). Your account → Publishing → *Add a new
   pending publisher*: project `pazair-verify`, owner `Kula-Labs`, repository `pazair`, workflow
   `publish-verify.yml`, environment `pypi`.
2. On GitHub → Settings → Environments → New environment `pypi` (optionally: required reviewer = you, so no
   release goes out without a click).

## Every release

```bash
git checkout main && git pull
# bump the version in verify/package.json, python/pyproject.toml and python/src/pazair_verify/__init__.py (same number)
git tag verify-v1.6.1 && git tag python-v1.6.1
git push origin verify-v1.6.1 python-v1.6.1
```

Watch the *publish* run under Actions. Then check, from any machine:

```bash
npx pazair-verify@1.6.1 --version          # 1.6.1
pipx run pazair-verify --help              # usage, exit 0
npm view pazair-verify dist.attestations   # provenance present
```

A tag whose number does not match the package fails before anything is published. A published version can never
be replaced, only followed by a higher one.
