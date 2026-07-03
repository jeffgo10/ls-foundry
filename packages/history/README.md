# @jeffgo10/history

Generic **undo/redo snapshot stacks** for editors, canvases, and other stateful UIs. Framework-agnostic — no React dependency.

## Install

```bash
pnpm add @jeffgo10/history
```

## Usage

```ts
import {
  commitGestureHistory,
  createHistoryStacks,
  pushUndoSnapshot,
  undoStep,
  redoStep,
  getCanUndo,
  getCanRedo,
} from "@jeffgo10/history";

type DocumentSnapshot = {
  blocks: Array<{ id: string; text: string }>;
};

const stacks = createHistoryStacks<DocumentSnapshot>({
  limit: 50,
  // optional — defaults use structuredClone + JSON equality
  clone: (doc) => structuredClone(doc),
  equals: (a, b) => a.blocks.length === b.blocks.length,
});

let current: DocumentSnapshot = { blocks: [] };

// Before a mutation:
stacks = pushUndoSnapshot(stacks, current);
current = { blocks: [{ id: "1", text: "Hello" }] };

// Undo:
const undone = undoStep(stacks, current);
if (undone) {
  stacks = undone.stacks;
  current = undone.snapshot;
}

// Gesture commit (drag end, transform end, etc.):
stacks = commitGestureHistory(stacks, beforeSnapshot, current);
```

## API

| Export | Description |
|--------|-------------|
| `createHistoryStacks(config?)` | New empty stacks with optional `limit`, `clone`, `equals` |
| `pushUndoSnapshot(stacks, snapshot)` | Push before a discrete mutation; clears redo |
| `undoStep` / `redoStep` | Pop stacks and return the restored snapshot |
| `commitGestureHistory(stacks, before, after)` | Push `before` only when it differs from `after` |
| `getCanUndo` / `getCanRedo` | Stack availability |
| `resetHistoryStacks` | Clear both stacks (e.g. after loading a saved file) |
| `defaultClone` / `defaultEquals` | Sensible defaults for plain JSON-like snapshots |

## Consumers

- `@jeffgo10/react-canvas-designer` — StickPak canvas sticker placements (`canvasHistory.ts` adapter)
