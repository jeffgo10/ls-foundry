# Extract or add shared code (DRY, cross-platform)

Add or consolidate **platform-agnostic** utilities in this monorepo so CrowdBadge, StickPak, LiteShadeMedia, and future apps import one implementation from `@jeffgo10/*`.

Follow `.cursor/rules/ls-foundry-core.mdc` and `.cursor/rules/ls-foundry-unit-tests.mdc`.

**Default base branch:** `master`

## Mode — read trailing user text

| Trailing text | Mode |
|---|---|
| Empty | **Audit** — list candidates in recent diff or conversation; recommend package/subpath |
| File path or symbol under `packages/` | **Implement** — add/extend export, tests, version bump, open PR |
| Path from a consumer app (e.g. `../crowdbadge/lib/helpers/...`) | **Import & extract** — copy logic here, open PR, note consumer wiring |
| "audit only" | Report only; no writes |
| "publish plan" | Version bumps + merge/CI publish checklist; no edits unless asked |

If ambiguous, default to **Audit**.

---

## Step 0 — Repo gate (required)

Run **before any package edits** and **during Audit** (readiness only).

From ls-foundry repo root:

```bash
git branch --show-current
git status --porcelain
```

Treat any non-empty `git status --porcelain` as **dirty** (modified, staged, or untracked files).

| Branch | Working tree | Action |
|---|---|---|
| `master` | clean | **Pass** — proceed |
| not `master` | clean | **Auto-fix** — `git checkout master`; then proceed |
| any | dirty | **Stop** — do not edit packages; tell user to commit, stash, or discard first |

### Audit mode

Always include **repo readiness** in the report:

- ✅ on `master`, clean
- ⚠️ on `<branch>`, clean — will auto-checkout `master` before implement
- ❌ dirty — list affected paths; **block implement** until cleaned up

### Implement / extract mode

If gate **fails**, **abort the command** — no file writes, no PR.

If gate **passes** (after auto-checkout when needed), continue.

---

## Step 1 — Placement rules

| Kind | Target |
|---|---|
| Canvas/image DOM utilities | `packages/helpers/src/image/` → `@jeffgo10/helpers/image` |
| Pointer/gesture hooks | `packages/helpers/src/gestures/` → `@jeffgo10/helpers/gestures` |
| Layout JSON / DPI types | `packages/shared-types/` |
| Konva designer UI | `packages/react-canvas-designer/` |
| Print pipeline | `packages/canvas-upscaler/` |
| New cross-app surface | New `packages/<name>/` or new `exports` subpath |

**Reject:** Next.js server routes, Supabase/Prisma, S3/R2 SDK, Stripe, app-specific business rules.

---

## Step 2 — Implementation

**Prerequisite:** Step 0 gate passed; cwd is ls-foundry on clean `master`.

1. Read existing exports in target `package.json` — extend subpath, do not break consumers.
2. Co-locate `*.test.ts(x)`; run `pnpm test --filter=@jeffgo10/<pkg>`.
3. **Bump version** in `packages/<pkg>/package.json` (patch/minor/major per `ls-foundry-core.mdc`).
4. `pnpm run build:packages`; fix types and dist exports.

Generic hooks: accept injectable reducers/clamp so consumers keep thin adapters (CrowdBadge `PhotoPlacement` pattern).

---

## Step 3 — Open PR (required after Step 2)

After package source, tests, and version bump are done, **run `/create-github-pr`**:

Follow `.cursor/commands/create-github-pr.md` end-to-end (auto branch from `master`, auto-commit extraction work, push, open PR with `gh`).

Do **not** skip this step when package files were changed. Report the PR URL.

Merge to `master` triggers `publish-packages.yml` for changed `@jeffgo10/*` packages.

---

## Step 4 — Consumer apps (report; edit only if user names app)

| App | Path | Notes |
|---|---|---|
| CrowdBadge | `../crowdbadge` | `transpilePackages`; `.npmrc` + `GH_PACKAGES_READ_TOKEN` |
| LiteShadeMedia | `../LiteShadeMedia` | `@jeffgo10/gl-viewer`, helpers |
| StickPak storefront | via `react-canvas-designer` workspace dep | bump workspace pin after publish |

After merge + publish: consumer bumps `@jeffgo10/*` version and removes duplicate local file.

---

## Step 5 — Report

```markdown
## Extract-to-foundry report

### Repo readiness (Step 0)
- <pass | auto-checkout | blocked — dirty>

### ls-foundry
| Package | File | Version bump |
|---|---|---|

### PR
- <URL or skipped with reason>

### Consumer follow-up
- …

### Tests
- …
```

---

## Usage examples

```
/extract-to-foundry
/extract-to-foundry packages/helpers/src/image/downloadCanvasAsPng.ts
/extract-to-foundry ../crowdbadge/lib/helpers/canvas/download-canvas-as-png.ts
/extract-to-foundry audit only
/extract-to-foundry publish plan
```

---

## Do not

- Edit packages when Step 0 gate fails (dirty working tree).
- Skip `/create-github-pr` after changing package source.
- Manually `pnpm run deploy` unless the user explicitly asks (prefer merge → CI publish).
