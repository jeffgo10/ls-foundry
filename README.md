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
├── packages/
│   ├── gl-viewer/            # @jeffgo10/gl-viewer — GLB / LiDAR viewer
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
| `pnpm run deploy` | Build and publish `@jeffgo10/gl-viewer` to [GitHub Packages](https://github.com/jeffgo10/ls-foundry/packages) |
| `pnpm run deploy:dry-run` | Same as `deploy` with `--dry-run` |
| `pnpm run deploy:nogit` | Publish with `--no-git-checks` (use when the tree is not clean) |

Bump the version in `packages/gl-viewer/package.json` before each publish. Authenticate to `npm.pkg.github.com` with a token that has `write:packages` (see the [GitHub Packages npm docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)).

## Docs app

```bash
pnpm run dev --filter=@ls-foundry/docs
```

Open the URL shown in the terminal (default port 3000). Place assets such as `spray.glb` under `apps/docs/public/` when testing local GLB paths.

## Packages

| Package | Description |
|---------|-------------|
| [@jeffgo10/gl-viewer](./packages/gl-viewer/README.md) | Headless React viewer for GLB (orbit, walk, WebXR AR) |

Further packages will be documented here as they ship.

## License

Package licenses are declared per package (e.g. MIT on `@jeffgo10/gl-viewer`). This repository root does not publish an npm package.
