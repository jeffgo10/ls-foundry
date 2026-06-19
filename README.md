# ls-foundry

Monorepo for React packages used in spatial and data-heavy UIs: **pnpm** workspaces, **Turborepo** for builds, and **TypeScript** throughout.

Repository: [github.com/jeffgo10/ls-foundry](https://github.com/jeffgo10/ls-foundry)

## Requirements

- [Node.js](https://nodejs.org/) (LTS 20 or 22 recommended; avoid odd majors if Corepack misbehaves)
- [pnpm](https://pnpm.io/) 9.x (`packageManager` is pinned in root `package.json`; `corepack enable` or `npm i -g pnpm` works)

## Layout

```
ls-foundry/
├── apps/
│   └── docs/                 # Next.js showcase
├── docs/
│   └── stickpak/             # StickPak roadmap + Phase 1 notes (from Obsidian)
├── packages/
│   ├── gl-viewer/            # @jeffgo10/gl-viewer — GLB / LiDAR viewer
│   ├── helpers/              # @jeffgo10/helpers — shared utilities (e.g. ./image)
│   ├── shared-types/         # @jeffgo10/shared-types — StickPak canvas layout types
│   ├── react-canvas-designer/# @jeffgo10/react-canvas-designer — 72 DPI Konva designer
│   ├── canvas-upscaler/      # @jeffgo10/canvas-upscaler — 300 DPI print upscaler
│   ├── config-ts/            # Shared TS configs (@ls-foundry/tsconfig)
│   ├── maps/                 # placeholder
│   ├── ui/                   # placeholder
│   └── utils/                # placeholder
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Scripts (repo root)

| Script | Description |
|--------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm run build` | `turbo run build` across packages that define `build` |
| `pnpm run dev` | `turbo run dev` (persistent tasks, e.g. docs) |
| `pnpm run lint` | `turbo run lint` where configured |
| `pnpm run clean` | Clean turbo outputs and root `node_modules` |
| `pnpm run build:packages` | Build `packages/*` only (excludes `apps/docs`) |
| `pnpm run deploy` | `build:packages` then publish all non-private packages to [GitHub Packages](https://github.com/jeffgo10/ls-foundry/packages) |
| `pnpm run deploy:changed` | Publish only packages changed since `GIT_BEFORE` (default `HEAD~1`) — same logic as CI |
| `pnpm run deploy:dry-run` | Same as `deploy` with `--dry-run` |
| `pnpm run deploy:nogit` | Publish with `--no-git-checks` (use when the tree is not clean) |

Published packages: `@jeffgo10/gl-viewer`, `@jeffgo10/shared-types`, `@jeffgo10/helpers`, `@jeffgo10/react-canvas-designer`, `@jeffgo10/canvas-upscaler`. Placeholders (`utils`, `ui`, `maps`, `config-ts`) and `apps/*` stay private.

Bump versions in the relevant `packages/*/package.json` before each publish. Authenticate to `npm.pkg.github.com` with a token that has `write:packages`. Map `@jeffgo10:registry` → `https://npm.pkg.github.com` in `.npmrc`.

### CI publish (push to `master`)

Workflow [`.github/workflows/publish-packages.yml`](./.github/workflows/publish-packages.yml) runs when `packages/**` or `pnpm-lock.yaml` changes on `master`. It builds all packages, then publishes **only** non-private `@jeffgo10/*` packages whose files changed in that push (via `scripts/publish-changed.sh`). Uses `GITHUB_TOKEN` with `packages: write`.

Manual run: GitHub → Actions → **Publish packages** → **Run workflow**.

## Docs app

```bash
pnpm run dev --filter=@ls-foundry/docs
```

Open the URL shown in the terminal (default port 3000). Place assets such as `spray.glb` under `apps/docs/public/` when testing local GLB paths.

## StickPak (Phase 1)

Planning notes and the Phase 1 core engine live in [docs/stickpak](./docs/stickpak/README.md). Phase 1 packages:

| Package | Description |
|---------|-------------|
| `@jeffgo10/shared-types` | Canvas layout JSON schema and A4 DPI constants |
| `@jeffgo10/react-canvas-designer` | Drag-and-drop 72 DPI A4 Konva canvas |
| `@jeffgo10/canvas-upscaler` | Node utility to render 300 DPI print PNGs |

## Packages

| Package | Description |
|---------|-------------|
| [@jeffgo10/gl-viewer](./packages/gl-viewer/README.md) | Headless React viewer for GLB (orbit, walk, WebXR AR) |

Further packages will be documented here as they ship.

## Optional agent tooling

Cursor rules and a slash command keep repo docs and Obsidian in sync:

| Path | Purpose |
|------|---------|
| `.cursor/rules/ls-foundry-core.mdc` | Monorepo layout, package scopes, conventions |
| `.cursor/rules/ls-foundry-obsidian-sync.mdc` | Obsidian MCP workflow and vault folder map |
| `.cursor/commands/sync-obsidian-notes.md` | `/sync-obsidian-notes` — sync vault + optional rule refresh |
| `.cursor/commands/create-github-pr.md` | `/create-github-pr` — auto branch from `master`, auto-commit, push, open PR |

Obsidian vault folder **`LS Foundry/`** — see `Cursor rules and slash commands.md` for full agent docs.

**`/create-github-pr` on `master`:** creates `feat/<slug>` branch, commits uncommitted safe files, pushes, opens PR. **After merge:** `/create-github-pr cleanup` → checkout `master`, pull, delete merged local branch. Opt out of commit: `no commit`. Requires **`gh` CLI** (`brew install gh`, `gh auth login`); falls back to web URL + pasted title/body if unavailable.

## License

Package licenses are declared per package (e.g. MIT on `@jeffgo10/gl-viewer`). This repository root does not publish an npm package.
