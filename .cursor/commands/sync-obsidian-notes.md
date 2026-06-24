# Sync Obsidian notes (+ optional Cursor rules)

Document recent **ls-foundry** changes in Obsidian via MCP — StickPak notes, noteworthies, LiteShadeMedia gl-viewer docs — and optionally refresh `.cursor/rules/` when agent guidance should match.

Follow `.cursor/rules/ls-foundry-obsidian-sync.mdc` and `.cursor/rules/ls-foundry-core.mdc`.

## Mode — read trailing user text

| Trailing text | Mode |
|---|---|
| Empty, or "both" / "rules" / "cursor rules" | **Obsidian + Rules** — vault first, then sync rules when guidance changed |
| "obsidian only" | **Obsidian** — vault notes only |
| Starts with "rules only" | **Rules only** — skip Obsidian; update `.cursor/rules/*.mdc` from repo docs |
| Describes a specific topic (e.g. "gl-viewer API", "canvas shell fix") | Scope sync to that topic only |
| Text after `both:` or a colon summary | Use that summary as the primary source of truth |

If ambiguous, default to **Obsidian + Rules**.

---

## Step 0 — MCP pre-check (required before any Obsidian write)

1. Read tool schemas under `mcps/user-MCP_DOCKER/tools/` if needed.
2. **Probe:** `obsidian_list_files_in_dir` with `{ "dirpath": "StickPak" }` on server `user-MCP_DOCKER`.
3. **If probe fails** — stop Obsidian work; report why; still run **Rules only** if requested. Do not call `obsidian_append_content`, `obsidian_patch_content`, or `obsidian_delete_file`.

Optional: probe `LiteShadeMedia/` when syncing gl-viewer changes.

---

## Step 1 — Discover what changed

Gather context from (in order of priority):

1. **Trailing user text** — explicit summary of what to document.
2. **Git** — `git status`, `git diff`, `git log -5 --oneline` for uncommitted or recent commits.
3. **Conversation** — resolved bugs, new features, package bumps from the current session.
4. **Repo docs** — `docs/stickpak/*.md`, `README.md`, `packages/*/README.md` for canonical detail.

Skip trivial changes (typos, formatting-only, unrelated refactors).

Also sync **repo markdown** (`docs/stickpak/`) when Obsidian is updated — repo and vault should agree.

---

## Step 2 — Choose Obsidian targets

| Change type | Vault path | Action |
|---|---|---|
| Phase 1 deliverable, package versions, checklist | `StickPak/Phase 1 Complete — ls-foundry.md`, `docs/stickpak/phase-1.md` | Patch or append dated section |
| Roadmap / phase status | `StickPak/StickPak Comprehensive Roadmap.md`, `docs/stickpak/roadmap.md` | Patch status table |
| Canvas/DPI math spec | `StickPak/Detailed Canvas Scaling for upscale export.md`, `docs/stickpak/canvas-scaling.md` | Patch relevant heading |
| Resolved bug, gotcha, non-obvious fix | `StickPak/noteworthy/Notes — <short title>.md` | Create **or** update if same topic |
| Engineering notes index | `StickPak/noteworthy/StickPak Engineering Notes.md` | Add row when creating noteworthy note |
| `@jeffgo10/gl-viewer` API or integration | `LiteShadeMedia/08 gl-viewer Package.md`, `07 LiDAR AR 3D Viewer.md` | Patch or append |
| `@jeffgo10/three-d-label-customizer` | `LS Foundry/Notes — three-d-label-customizer.md`, `docs/three-d-label-customizer/` | Create or update in **`LS Foundry/`** (not StickPak) |
| Monorepo tooling (no consumer app) | `LS Foundry/Notes — <topic>.md`, `LS Foundry/Cursor rules and slash commands.md` | Create or update in `LS Foundry/` folder |

**Noteworthy naming:** `Notes — <Topic>.md` (match existing style in `StickPak/noteworthy/`).

**Always read before write:** `obsidian_get_file_contents` on the target note first. Search `obsidian_simple_search` or `obsidian_list_files_in_dir` to avoid duplicate noteworthies.

### Noteworthy note template (new notes)

```markdown
# Notes — <Topic>

**When:** <month year>
**Context:** <one line — e.g. ls-foundry react-canvas-designer>

## Symptom / goal
…

## Cause
…

## Fix
…

## Files touched
- `packages/…/src/….ts`

## Related
- [[Phase 1 Complete — ls-foundry]]
- Repo: `docs/stickpak/engineering-notes.md`
```

Keep notes concise (under ~60 lines). Link related notes with `[[wikilinks]]`.

---

## Step 3 — Update Obsidian

Preferred tools:

| Tool | Use for |
|---|---|
| `obsidian_get_file_contents` | Read existing note before edit |
| `obsidian_batch_get_file_contents` | Read several targets at once |
| `obsidian_patch_content` | Update a heading/section (append, prepend, replace) |
| `obsidian_append_content` | New note body or dated changelog at end |
| `obsidian_delete_file` + `obsidian_append_content` | Fallback when `patch_content` returns `invalid-target` (`confirm: true` on delete) |
| `obsidian_list_files_in_dir` | Verify note paths; list `StickPak/noteworthy/` before creating |

After large writes, re-read with `obsidian_get_file_contents` to confirm.

---

## Step 4 — Update Cursor rules (when mode includes rules)

Only when trailing text requests rules, or the change affects how agents should work in this repo.

| Rule file | Update when |
|---|---|
| `ls-foundry-core.mdc` | Package versions, monorepo layout, coding conventions, consumers (e.g. LiteShadeMedia) |
| `ls-foundry-obsidian-sync.mdc` | Vault folder map, sync workflow, MCP pre-check, slash command usage |

Rules stay under ~80 lines each. Match existing frontmatter (`description`, `alwaysApply`).

**Source of truth order:** repo docs (`docs/stickpak/`, `packages/*/README.md`) > Obsidian > conversation. If Obsidian is stale, update Obsidian to match repo, not the reverse.

Do **not** create new rule files unless the user asks or a new major concern appears (e.g. a new published package family).

---

## Step 5 — Report

Summarize for the user:

```markdown
## Obsidian sync report

### MCP
- Pre-check: ✅ / ❌

### Repo docs updated
| File | Action |
|---|---|
| docs/stickpak/… | Patched / Appended |

### Obsidian notes updated
| Note | Action |
|---|---|
| StickPak/… or LiteShadeMedia/… | Created / Patched / Appended |

### Cursor rules updated (if any)
- `ls-foundry-….mdc` — …

### Skipped (with reason)
- …

### Manual follow-up
- …
```

If nothing material changed, say so — do not create empty or duplicate notes.

---

## Usage examples

```
/sync-obsidian-notes
/sync-obsidian-notes obsidian only
/sync-obsidian-notes rules only
/sync-obsidian-notes both: customizable canvas size, delete keyboard, shell layout fix
/sync-obsidian-notes gl-viewer: fitParent default changed in 0.3.2
```

---

## Do not

- Duplicate an existing noteworthy note under a slightly different title.
- Put secrets, tokens, or `.env` values in Obsidian notes.
- Update Obsidian when MCP pre-check fails (except to tell the user to fix MCP).
- Put StickPak canvas/upscaler notes in `LS Foundry/` — use `StickPak/`.
- Put `three-d-label-customizer` notes in `StickPak/` or `LiteShadeMedia/` — use `LS Foundry/Notes — three-d-label-customizer`.
- Put gl-viewer consumer docs in `LS Foundry/` — use `LiteShadeMedia/`.
- Create long narrative docs — quick-reference in Obsidian; detail in `docs/stickpak/`.
