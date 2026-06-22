import { blobUrlToDataUrl } from "./blobUrlToDataUrl";

function mockFileReaderSuccess(result: string) {
  const original = FileReader.prototype.readAsDataURL;
  FileReader.prototype.readAsDataURL = function readAsDataURL(this: FileReader) {
    Object.defineProperty(this, "result", { value: result, configurable: true });
    queueMicrotask(() => {
      this.onload?.(new ProgressEvent("load"));
    });
  };
  return () => {
    FileReader.prototype.readAsDataURL = original;
  };
}

function mockFileReaderError() {
  const original = FileReader.prototype.readAsDataURL;
  FileReader.prototype.readAsDataURL = function readAsDataURL(this: FileReader) {
    Object.defineProperty(this, "error", {
      value: new DOMException("read failed"),
      configurable: true,
    });
    queueMicrotask(() => {
      this.onerror?.(new ProgressEvent("error"));
    });
  };
  return () => {
    FileReader.prototype.readAsDataURL = original;
  };
}

describe("blobUrlToDataUrl", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("fetches blob URL and returns data URL", async () => {
    const blob = new Blob(["hello"], { type: "image/png" });
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      blob: async () => blob,
    } as Response);
    const restore = mockFileReaderSuccess("data:image/png;base64,aGVsbG8=");

    const result = await blobUrlToDataUrl("blob:fake");
    expect(result.mimeType).toBe("image/png");
    expect(result.dataUrl).toBe("data:image/png;base64,aGVsbG8=");

    restore();
  });

  it("falls back mime type when blob type is empty", async () => {
    const blob = new Blob(["hello"]);
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      blob: async () => blob,
    } as Response);
    const restore = mockFileReaderSuccess("data:application/octet-stream;base64,aGVsbG8=");

    const result = await blobUrlToDataUrl("blob:fake");
    expect(result.mimeType).toBe("application/octet-stream");

    restore();
  });

  it("rejects when FileReader fails", async () => {
    const blob = new Blob(["hello"], { type: "image/png" });
    jest.spyOn(globalThis, "fetch").mockResolvedValue({
      blob: async () => blob,
    } as Response);
    const restore = mockFileReaderError();

    await expect(blobUrlToDataUrl("blob:fail")).rejects.toBeTruthy();
    restore();
  });
});
