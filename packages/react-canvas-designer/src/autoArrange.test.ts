import { installMockImageLoader } from "@ls-foundry/test-utils";
import { autoArrangeItems, type AutoArrangeItem } from "./autoArrange";

jest.mock("@jeffgo10/helpers/image", () => ({
  traceAlphaContour: jest.fn(() => [0, 0, 100, 0, 100, 100, 0, 100]),
}));

function makeItem(id: string, overrides: Partial<AutoArrangeItem> = {}): AutoArrangeItem {
  return {
    instanceId: id,
    assetId: id,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    src: `blob:${id}`,
    mimeType: "image/png",
    width: 100,
    height: 100,
    ...overrides,
  };
}

describe("autoArrangeItems", () => {
  let restoreImage: () => void;

  beforeEach(() => {
    ({ restore: restoreImage } = installMockImageLoader(100, 100));
  });

  afterEach(() => {
    restoreImage();
  });

  it("returns empty result for no items", async () => {
    const result = await autoArrangeItems([]);
    expect(result).toEqual({ items: [], allPlaced: true });
  });

  it("places a single item on canvas", async () => {
    const items = [makeItem("a")];
    const result = await autoArrangeItems(items, { canvasWidth: 400, canvasHeight: 400 });
    expect(result.allPlaced).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.x).toBeGreaterThanOrEqual(0);
    expect(result.items[0]!.y).toBeGreaterThanOrEqual(0);
  });

  it("places multiple items without overlap", async () => {
    const items = [makeItem("a"), makeItem("b"), makeItem("c")];
    const result = await autoArrangeItems(items, {
      canvasWidth: 600,
      canvasHeight: 600,
      gapMm: 5,
    });
    expect(result.allPlaced).toBe(true);
    expect(result.items.map((item) => item.instanceId)).toEqual(["a", "b", "c"]);
  });

  it("sets allPlaced false when items cannot fit", async () => {
    const items = [
      makeItem("a", { width: 200, height: 200 }),
      makeItem("b", { width: 200, height: 200 }),
      makeItem("c", { width: 200, height: 200 }),
    ];
    const result = await autoArrangeItems(items, {
      canvasWidth: 150,
      canvasHeight: 150,
      gapMm: 5,
    });
    expect(result.allPlaced).toBe(false);
  });
});
