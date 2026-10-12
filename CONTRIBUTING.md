# Contributing to Kamra PMS

Kamra is AGPL-3.0 and welcomes contributions — code, country packs, docs, bug
reports. This file covers the mechanics; see [`README.md`](README.md) for
install/quickstart and [`docs/`](docs/) for architecture.

## Development setup

Follow the **Quickstart (development)** section in the README. In short:
a Frappe bench, `bench get-app` this repo, `bench new-site` + `install-app`,
and `npm run dev` in `frontend/` for the SPA.

## Branches

- **`develop`** — the integration branch and the *nightly* channel. All PRs
  target `develop` (it's the default branch). nightly.kamrapms.com and the
  private `ghcr.io/kamra-pms/kamra:nightly` image (Kamra-operated hosts only)
  are rebuilt from it every night.
- **`main`** — the stable branch. Only release trains (maintainer merges of
  `develop`) and hotfixes land here; the Frappe Cloud Marketplace listing and
  demo.kamrapms.com track its releases.

### Branch naming

One short prefix, kebab-case slug. Prefer these over free-form names
(`property_management`, `azzaxp/…`, `feature/…`):

| Prefix | Use for | Version impact when released |
|---|---|---|
| `feat/<slug>` | New user-facing capability | **PATCH** by default (`feat:`); MINOR only if a maintainer sets `Release-As:` |
| `fix/<slug>` | Bug fix on `develop` | **PATCH** (`fix:`) |
| `hotfix/<slug>` | Urgent fix branched from `main` | **PATCH** (`fix:`) |
| `chore/<slug>` | Tooling, CI, deps, housekeeping | none by itself |
| `docs/<slug>` | Docs / listing copy only | none by itself |

Delete the remote branch after the PR merges — leave `main`, `develop`, and
any still-open work only.

See [`RELEASING.md`](RELEASING.md) for the full release process.

## Before you open a PR

- **Frontend:** `cd frontend && npm run build` must pass (typecheck + build).
- **Backend:** if you touched Python, run the eval harness locally —
  `bench --site <site> console`, then
  `from kamra.scripts.eval_harness import execute; execute()` — and confirm
  it still reports all checks passing.
- CI runs both automatically on every PR; a fresh-install check also verifies
  a brand-new site installs cleanly with your change.

## Commit messages

Please use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add occupancy-slab BAR rates
fix: correct GST rounding on split charges
chore: bump frontend deps

BREAKING CHANGE: removes the `Foo` doctype; see CHANGELOG.
```

Pick the prefix carefully — release automation
([release-please](https://github.com/googleapis/release-please)) drafts the
changelog from them. **Version bumps default to PATCH** (`2.6.0` → `2.6.1`),
even for `feat:` commits. We only cut a MINOR (`2.7.0`) when a maintainer
deliberately sets it (see [`RELEASING.md`](RELEASING.md)).

- **`fix:`** — bugfixes and small corrections.
- **`feat:`** — user-visible additions (changelog “Features”); still ships as
  a PATCH unless a maintainer forces a MINOR.
- **`chore:` / `docs:` / `ci:` / `test:`** — no version bump by themselves.
- **`BREAKING CHANGE:`** footer (or `feat!:` / `fix!:`) — call out in the
  changelog; bump MAJOR only via an explicit `Release-As:` when ready.

## Versioning & releases

Kamra follows [Semantic Versioning](https://semver.org/) with a **patch-first**
cadence on the current minor line:

- **PATCH** (default) — fixes and small features (`2.6.1`, `2.6.2`, …).
- **MINOR** — deliberate larger feature sets (`2.7.0`); not automatic.
- **MAJOR** — breaks an existing install on `bench migrate` (doctype/API
  removed or contract changed); also not automatic.

**Cadence:** land work on `develop` (nightly). Cut a stable release only when
you are ready to ship to the marketplace / demo — typically a monthly train,
or when a feature set is actually ready. Prefer shipping several small
changes as `2.6.1` / `2.6.2` rather than jumping to `2.7.0`. Do **not** merge
the Release PR for every small merge into `main`; leave it open (it stays a
draft) until you intend to tag and build.

Merging a release train from `develop` into `main` updates the draft Release
PR with the version bump and [`CHANGELOG.md`](CHANGELOG.md) notes; merging
that Release PR is what tags `vX.Y.Z`, publishes GitHub + Docker, and
redeploys demo.kamrapms.com. Full runbook: [`RELEASING.md`](RELEASING.md).

If your change removes or renames anything a self-hoster might depend on
(a doctype, a whitelisted method, a config key), call it out explicitly under
a `### Removed (⚠️ breaking)` heading in the changelog entry — that's what
decides the next version is a MAJOR bump.

## Country packs

Localization lives behind the `kamra_localization` hook in `hooks.py`,
which maps a country name to a module in `kamra/localization/`. Countries
without a pack get `generic.py` (one flat rate).

A pack is a plain module:

- **Required:** `calculate_room_tax`, `fnb_tax_rate`, `tax_rate_options`,
  `invoice_context` and `locale`.
- **Optional:** `service_code_for`, `tax_split` and `amount_in_words` for
  invoice printing; constants such as `ID_TYPES`, `PAYMENT_MODES`,
  `DEFAULT_CURRENCY`, `NOTICE_LANGUAGES`, `ADULT_AGE` and `MINOR_IDS`.
- **Country-only integrations:** `PAYMENT_GATEWAYS` plus `payment_provider`,
  `tax_return_rows`, `verify_tax_id` and `verify_guest_id`. If a pack leaves
  these out, the country simply doesn't get the feature. Kamra never
  borrows another country's.

The full interface is in the docstring of `kamra/localization/__init__.py`.
`thailand.py` is the smallest pack to copy. `india/` shows integrations;
`saudi.py` shows e-invoicing hooks. Add an eval check for the new pack's
tax and invoice labels.

## Credit

Every merged PR is credited in the release notes and on the
[Contributors](https://kamrapms.com/docs/contributors) page, and an
issue that shapes a feature earns its reporter a line there too. Security
reporters are credited in the advisory, `SECURITY.md` and the release
that fixes it.

## Code of conduct

Be respectful, assume good faith, keep discussion technical. Report abuse to
hello@kamrapms.com.
