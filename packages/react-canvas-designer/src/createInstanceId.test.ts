import {
  createInstanceId,
  createInstanceIdFallback,
  isUuidV4,
} from "./createInstanceId";

describe("createInstanceId", () => {
  const originalRandomUuid = global.crypto.randomUUID;

  afterEach(() => {
    if (originalRandomUuid) {
      global.crypto.randomUUID = originalRandomUuid;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global.crypto as any).randomUUID;
    }
  });

  it("uses crypto.randomUUID when available", () => {
    global.crypto.randomUUID = jest.fn(() => "11111111-1111-4111-8111-111111111111");

    expect(createInstanceId()).toBe("11111111-1111-4111-8111-111111111111");
    expect(global.crypto.randomUUID).toHaveBeenCalled();
  });

  it("falls back when crypto.randomUUID is unavailable", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global.crypto as any).randomUUID;

    const id = createInstanceId();
    expect(isUuidV4(id)).toBe(true);
  });

  it("creates RFC 4122 v4 ids from the fallback helper", () => {
    const id = createInstanceIdFallback();
    expect(isUuidV4(id)).toBe(true);
  });
});
