import {
  isAdditivePointerEvent,
  isAdditiveSelectionEvent,
  isCanvasBackgroundTarget,
  isTransformerTarget,
  primarySelectedId,
  resolveStickerInstanceId,
  toggleShiftSelection,
} from "./selection";

describe("selection", () => {
  describe("toggleShiftSelection", () => {
    it("replaces selection on plain click", () => {
      expect(toggleShiftSelection(["a", "b"], "c", false)).toEqual(["c"]);
    });

    it("adds to selection with additive click", () => {
      expect(toggleShiftSelection(["a"], "b", true)).toEqual(["a", "b"]);
    });

    it("removes from selection when additive click hits an existing id", () => {
      expect(toggleShiftSelection(["a", "b"], "a", true)).toEqual(["b"]);
    });
  });

  describe("primarySelectedId", () => {
    it("returns null for empty selection", () => {
      expect(primarySelectedId([])).toBeNull();
    });

    it("returns the last selected id", () => {
      expect(primarySelectedId(["a", "b"])).toBe("b");
    });
  });

  describe("isAdditivePointerEvent", () => {
    it("reads modifiers from MouseEvent and PointerEvent", () => {
      expect(
        isAdditivePointerEvent({
          shiftKey: true,
          ctrlKey: false,
          metaKey: false,
        } as MouseEvent),
      ).toBe(true);
      expect(
        isAdditivePointerEvent({
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        } as MouseEvent),
      ).toBe(false);
      expect(isAdditivePointerEvent(null)).toBe(false);
    });
  });

  describe("resolveStickerInstanceId", () => {
    it("walks parents to find a registered group", () => {
      const stage = { parent: null };
      const group = { parent: stage };
      const image = { parent: group, getStage: () => stage };
      const shapeRefs = new Map([["id-1", group]]);

      expect(resolveStickerInstanceId(image, shapeRefs)).toBe("id-1");
      expect(resolveStickerInstanceId({ parent: stage, getStage: () => stage }, shapeRefs)).toBeNull();
    });
  });

  describe("isTransformerTarget", () => {
    it("detects transformer nodes in the ancestor chain", () => {
      const transformer = { getClassName: () => "Transformer", parent: null };
      const anchor = { getClassName: () => "Rect", parent: transformer };
      expect(isTransformerTarget(anchor)).toBe(true);
      expect(isTransformerTarget({ getClassName: () => "Group", parent: null })).toBe(false);
    });
  });

  describe("isCanvasBackgroundTarget", () => {
    it("matches stage and layer only", () => {
      expect(isCanvasBackgroundTarget({ getClassName: () => "Stage" })).toBe(true);
      expect(isCanvasBackgroundTarget({ getClassName: () => "Layer" })).toBe(true);
      expect(isCanvasBackgroundTarget({ getClassName: () => "Group" })).toBe(false);
    });
  });
});
