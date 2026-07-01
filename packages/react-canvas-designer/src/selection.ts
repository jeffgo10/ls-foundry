/** Plain click replaces selection; Shift/Ctrl/Cmd toggles membership. */
export function toggleShiftSelection(
  currentIds: readonly string[],
  instanceId: string,
  additive: boolean,
): string[] {
  if (!additive) {
    return [instanceId];
  }

  const index = currentIds.indexOf(instanceId);
  if (index >= 0) {
    const next = [...currentIds];
    next.splice(index, 1);
    return next;
  }

  return [...currentIds, instanceId];
}

/** Last clicked sticker — used for duplicate fill and legacy `onSelectedIdChange`. */
export function primarySelectedId(
  selectedIds: readonly string[],
): string | null {
  if (selectedIds.length === 0) {
    return null;
  }
  return selectedIds[selectedIds.length - 1] ?? null;
}

export function isAdditiveSelectionEvent(
  event: Pick<MouseEvent, "shiftKey" | "ctrlKey" | "metaKey">,
): boolean {
  return event.shiftKey || event.ctrlKey || event.metaKey;
}

/** Read modifier keys from Konva / DOM pointer events (MouseEvent or PointerEvent). */
export function isAdditivePointerEvent(event: Event | null | undefined): boolean {
  if (!event || typeof event !== "object" || !("shiftKey" in event)) {
    return false;
  }
  return isAdditiveSelectionEvent(
    event as Pick<MouseEvent, "shiftKey" | "ctrlKey" | "metaKey">,
  );
}

export function resolveStickerInstanceId(
  target: { getStage?: () => unknown; parent?: unknown },
  shapeRefs: ReadonlyMap<string, unknown>,
): string | null {
  let node: { parent?: unknown } | null = target;
  const stage = target.getStage?.();
  while (node && node !== stage) {
    for (const [instanceId, group] of shapeRefs.entries()) {
      if (group === node) {
        return instanceId;
      }
    }
    node = (node.parent ?? null) as { parent?: unknown } | null;
  }
  return null;
}

export function isTransformerTarget(
  target: { getClassName?: () => string; parent?: unknown | null },
): boolean {
  let node: { getClassName?: () => string; parent?: unknown | null } | null =
    target;
  while (node) {
    if (node.getClassName?.() === "Transformer") {
      return true;
    }
    node = (node.parent ?? null) as {
      getClassName?: () => string;
      parent?: unknown | null;
    } | null;
  }
  return false;
}

export function isCanvasBackgroundTarget(
  target: { getClassName?: () => string },
): boolean {
  const className = target.getClassName?.();
  return className === "Stage" || className === "Layer";
}
