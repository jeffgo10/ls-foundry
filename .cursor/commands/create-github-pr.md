# Create GitHub PR from branch commits

Analyze commits and diffs on the current branch, draft a comprehensive PR title and description, **auto-commit uncommitted work**, **create a feature branch when on `master`**, push if needed, and open a pull request with `gh`.

Follow `.cursor/rules/ls-foundry-core.mdc`. Default base branch: **`master`**.

## Mode — read trailing user text

| Trailing text | Mode |
|---|---|
| Empty | **Create** — auto-commit, branch if needed, push, open PR |
| "draft only", "preview", or "dry run" | **Draft only** — show proposed branch name, commit message, title/body; do not run git write ops |
| "draft pr" or "as draft" | **Create draft PR** — same as Create but `gh pr create --draft` |
| "no commit" or "committed only" | Skip auto-commit; use commits already on branch |
| Contains `base:` or `into:` (e.g. `base: develop`) | Override base branch |
| Contains `branch:` (e.g. `branch: feat/my-feature`) | Override auto-generated branch name |
| Contains `title:` | Use as title hint or override (still polish for clarity) |
| Describes scope (e.g. "canvas designer only", "cursor rules") | Narrow Summary/Changes to that scope; still list all commits in the table |

**Default:** auto-commit all safe uncommitted/untracked changes and create a local feature branch when on `master`/`main`. Do not ask for confirmation unless the branch name is ambiguous and no `branch:` hint was given.

---

## Step 0 — `gh` pre-check (Create modes only; skip for Draft only)

Before Step 6, probe GitHub CLI:

```bash
command -v gh && gh auth status
```

| Result | Action |
|---|---|
| `gh` not found | After push (Step 5), print web fallback URL + install hint (`brew install gh`); do **not** fail the flow |
| `gh` found, not authed | Same fallback + `gh auth login` hint |
| `gh auth status` OK | Proceed with `gh pr create` in Step 6 |

**Web fallback URL** (derive owner/repo from `git remote -v`):

`https://github.com/<owner>/<repo>/pull/new/<branch>`

Include the drafted title and body in the report so the user can paste them into the GitHub form.

---

## Step 1 — Gather git context (run in parallel)

From repo root:

```bash
git status
git branch -vv
git remote -v
git log --oneline -15
```

Determine:

- **Current branch** and whether it is `master` / `main`
- **Base branch** — default `master`; confirm it exists locally and on `origin`
- **Uncommitted work** — modified, staged, and untracked files (respect `.gitignore`)
- **Upstream tracking** — pushed? ahead/behind `origin`?

Inspect uncommitted diff when present:

```bash
git diff
git diff --cached
git status --short
```

Then compare against base (after Steps 2–4 when branch/commits are ready):

```bash
git fetch origin master 2>/dev/null || true
git log origin/master..HEAD --oneline
git diff origin/master...HEAD --stat
git diff origin/master...HEAD
```

If `origin/master` is unavailable, use local `master..HEAD`.

**Analyze ALL commits** on the branch since diverging from base — not only the latest commit.

---

## Step 2 — Draft names and messages (before git write ops)

From the full diff (uncommitted + any existing branch commits), draft:

### A) Feature branch name (when on `master`/`main`)

| Rule | Example |
|------|---------|
| Prefix by intent | `feat/`, `fix/`, `chore/`, `docs/` |
| Lowercase slug, hyphens | `feat/agent-tooling-and-obsidian-sync` |
| ≤ ~50 chars after prefix | `chore/cursor-rules-and-pr-command` |
| Override via trailing `branch:` | `branch: feat/my-name` |

Derive slug from primary change (packages touched, feature area). Prefer clarity over brevity.

### B) Commit message (when auto-committing)

Use HEREDOC format — **1–2 sentence summary**, then bullets by area:

```
Add Cursor agent tooling and GitHub PR slash command.

- Add ls-foundry Cursor rules and Obsidian sync workflow
- Add /sync-obsidian-notes and /create-github-pr commands
- Update README and engineering notes for agent tooling
```

Match repo tone (informal but specific). Focus on **why**, not just file names.

**Never stage or commit:** `.env*`, `.npmrc`, secrets, `stickpak-export.json`, `node_modules/`, build artifacts (honour `.gitignore`).

### C) PR title and body

Proceed to Steps 3–4 below. PR title may match commit subject line when there is a single commit; use an umbrella title when multiple commits.

---

## Step 3 — Auto-commit and create feature branch (Create modes only)

Skip entirely for **Draft only**. Skip auto-commit when trailing text contains **no commit** or **committed only**.

Requires `git_write` permission.

### Order of operations

1. **If on `master` or `main`** — create and switch to feature branch first (uncommitted changes carry over):

```bash
git checkout -b feat/your-derived-slug
# or: git checkout -b <branch: override>
```

2. **If uncommitted/untracked safe files exist** — stage and commit on the feature branch:

```bash
git add <relevant paths>   # or git add with explicit paths from status — avoid git add -A blind secrets
git commit -m "$(cat <<'EOF'
Your comprehensive commit message here.

- Bullet one
- Bullet two
EOF
)"
```

3. **If already on a feature branch** (not `master`/`main`) — only run step 2 when there is uncommitted work.

4. Re-run `git status` and `git log origin/master..HEAD --oneline` before drafting final PR body.

**Do not** commit on `master`/`main` — always create the feature branch first.

---

## Step 4 — Draft PR title

Rules:

- One line, **≤ 72 characters** when possible
- **Imperative mood** — "Add …", "Fix …", "Update …", "Refactor …"
- Lead with the **primary outcome** (package feature, bug fix, docs, agent tooling)
- If multiple themes, use an umbrella title + detail in the body
- Align with the auto-commit subject when there is a single logical change

Bad: `updates` / `fix stuff` / `WIP`  
Good: `Add Cursor agent tooling, Obsidian sync, and GitHub PR command`

---

## Step 5 — Draft PR description

Use this structure (omit empty sections):

```markdown
## Summary

<2–4 sentences: what this PR does and why. Name major areas: packages, docs app, stickpak docs, cursor tooling.>

## Changes

<Bulleted list grouped by area. Each bullet = one logical change, not one file.>

### Packages (`@jeffgo10/*`)
- …

### Canvas designer / upscaler / shared-types
- …

### Docs app (`apps/docs`)
- …

### Docs / Cursor rules / agent tooling
- …

### gl-viewer (if applicable)
- …

## Commits

| SHA | Message |
|-----|---------|
| `abc1234` | … |

## Test plan

- [ ] `pnpm run build` (or `pnpm run build:packages`)
- [ ] `pnpm run dev --filter=@ls-foundry/docs` → `/stickpak` (if canvas/designer touched)
- [ ] …

## Notes / follow-ups

<Package version bumps, publish steps (`pnpm run deploy`), breaking API changes, or "None.">
```

Guidelines:

- **Summary** — answer "what would a reviewer need to know in 30 seconds?"
- **Changes** — derive from diff + commits; mention package bumps, new props/APIs, Obsidian sync, `.cursor/` rules
- **Test plan** — concrete `pnpm` commands; manual flows when relevant
- **Do not** include secrets, tokens, or `.npmrc` contents
- **Do not** paste huge diffs — summarize

If trailing text scoped the PR, focus Summary/Changes on that scope but note other commits still on the branch.

---

## Step 6 — Push (Create modes only)

If not pushed or ahead of origin:

```bash
git push -u origin HEAD
```

Requires `network` / `git_write` permissions. Never force-push to `master`/`main`. Warn before any force-push to other branches.

---

## Step 7 — Create PR

**If Step 0 passed** — use HEREDOC for body:

```bash
gh pr create --base master --title "…" --body "$(cat <<'EOF'
## Summary
…
EOF
)"
```

Add `--draft` when mode is **Create draft PR**.

If a PR already exists for this branch:

```bash
gh pr view --json url,title
```

Report the existing URL; offer to edit title/body with `gh pr edit` if the user wants.

**If Step 0 failed** — skip `gh pr create`. Report web URL + proposed title/body for manual paste.

---

## Step 8 — Report

Include what was automated:

```markdown
## Pull request workflow

### Git automation
- **Branch created:** `feat/…` (was on `master`) / already on feature branch
- **Auto-commit:** ✅ `<subject line>` / skipped (no uncommitted changes / `no commit` mode)

### PR
**URL:** …
**Title:** …
**Base:** master ← `branch`
**Commits:** N
```

**Draft only** — show proposed branch name, commit message, title, and body; note "Say create it to run git ops and open PR."

---

## Usage examples

```
/create-github-pr
/create-github-pr draft only
/create-github-pr as draft
/create-github-pr no commit
/create-github-pr branch: feat/cursor-agent-tooling
/create-github-pr base: develop
/create-github-pr title: Add agent tooling and Obsidian sync command
/create-github-pr preview: canvas designer shell layout and delete keyboard only
```

---

## Do not

- Commit secrets (`.env*`, `.npmrc`, tokens) — honour `.gitignore`
- Commit or push on `master`/`main` — create feature branch first
- Include `.env`, `.npmrc` tokens, or GitHub PATs in the PR body
- Use `--fill` blindly — always write a tailored summary from full branch analysis
- Run `git config` changes
- Force-push to `master`/`main`
