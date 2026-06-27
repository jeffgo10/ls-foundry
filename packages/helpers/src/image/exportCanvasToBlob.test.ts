import { exportCanvasToBlob } from "./exportCanvasToBlob";

describe("exportCanvasToBlob", () => {
  it("resolves with blob from canvas.toBlob", async () => {
    const canvas = document.createElement("canvas");
    const blob = new Blob(["png"], { type: "image/png" });

    jest.spyOn(canvas, "toBlob").mockImplementation((callback) => {
      callback(blob);
    });

    await expect(exportCanvasToBlob(canvas)).resolves.toBe(blob);
  });

  it("resolves with null when toBlob returns null", async () => {
    const canvas = document.createElement("canvas");

    jest.spyOn(canvas, "toBlob").mockImplementation((callback) => {
      callback(null);
    });

    await expect(exportCanvasToBlob(canvas)).resolves.toBeNull();
  });
});
