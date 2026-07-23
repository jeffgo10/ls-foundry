import { exceedsDragThreshold, SPHERE_CLICK_DRAG_THRESHOLD_PX } from "./pointer";

describe("exceedsDragThreshold", () => {
  it("treats small movement as a click", () => {
    expect(
      exceedsDragThreshold({ x: 0, y: 0 }, { x: 3, y: 3 }),
    ).toBe(false);
    expect(
      exceedsDragThreshold(
        { x: 10, y: 10 },
        { x: 10 + SPHERE_CLICK_DRAG_THRESHOLD_PX, y: 10 },
      ),
    ).toBe(false);
  });

  it("treats larger movement as a drag", () => {
    expect(
      exceedsDragThreshold({ x: 0, y: 0 }, { x: 6, y: 0 }),
    ).toBe(true);
    expect(
      exceedsDragThreshold({ x: 0, y: 0 }, { x: 4, y: 4 }),
    ).toBe(true);
  });
});
