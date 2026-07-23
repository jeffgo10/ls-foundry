import {
  buildContentElement,
  defaultTitleForMarker,
  isHtmlContent,
  isImageContent,
  isRichContent,
  isTextContent,
  markersGeometryKey,
  markersToHotSpots,
  mountMarkerTooltip,
  pinClassForMarker,
  PIN_CLASS_BY_KIND,
} from "./markers";
import type { MarkerContent, PanoramaMarker } from "./types";

const baseMarker = (
  overrides: Partial<PanoramaMarker> & Pick<PanoramaMarker, "id" | "kind">,
): PanoramaMarker => ({
  yaw: 10,
  pitch: -5,
  ...overrides,
});

describe("content type guards", () => {
  it("narrows text / image / html / rich", () => {
    const text: MarkerContent = { type: "text", body: "hi" };
    const image: MarkerContent = { type: "image", src: "/a.jpg", alt: "a" };
    const html: MarkerContent = { type: "html", html: "<b>x</b>" };
    const rich: MarkerContent = {
      type: "rich",
      title: "T",
      body: "B",
      blocks: [{ type: "link", href: "https://example.com", label: "Go" }],
    };

    expect(isTextContent(text)).toBe(true);
    expect(isImageContent(image)).toBe(true);
    expect(isHtmlContent(html)).toBe(true);
    expect(isRichContent(rich)).toBe(true);
    expect(isTextContent(image)).toBe(false);
    expect(isImageContent(html)).toBe(false);
    expect(isHtmlContent(rich)).toBe(false);
    expect(isRichContent(text)).toBe(false);
  });
});

describe("pinClassForMarker / defaultTitleForMarker", () => {
  it("uses kind class and optional pin.cssClass", () => {
    expect(pinClassForMarker(baseMarker({ id: "1", kind: "navigation" }))).toBe(
      PIN_CLASS_BY_KIND.navigation,
    );
    expect(
      pinClassForMarker(
        baseMarker({
          id: "2",
          kind: "info",
          pin: { cssClass: "custom" },
        }),
      ),
    ).toBe(`${PIN_CLASS_BY_KIND.info} custom`);
  });

  it("defaults titles by kind", () => {
    expect(defaultTitleForMarker(baseMarker({ id: "n", kind: "navigation" }))).toBe(
      "Go",
    );
    expect(defaultTitleForMarker(baseMarker({ id: "i", kind: "info" }))).toBe(
      "Info",
    );
    expect(defaultTitleForMarker(baseMarker({ id: "l", kind: "label" }))).toBe(
      "Label",
    );
    expect(
      defaultTitleForMarker(
        baseMarker({ id: "t", kind: "info", title: "  Specs  " }),
      ),
    ).toBe("Specs");
  });
});

describe("markersToHotSpots", () => {
  it("maps geometry and css classes; ignores opaque data", () => {
    const markers: PanoramaMarker[] = [
      baseMarker({
        id: "nav-1",
        kind: "navigation",
        yaw: 45,
        pitch: 0,
        data: { targetSceneId: "kitchen" },
      }),
      baseMarker({
        id: "info-1",
        kind: "info",
        content: { type: "text", body: "Hardwood floors" },
      }),
      baseMarker({
        id: "label-1",
        kind: "label",
        content: {
          type: "image",
          src: "/label.jpg",
          caption: "Living room",
        },
      }),
    ];

    const hotSpots = markersToHotSpots(markers);
    expect(hotSpots).toHaveLength(3);
    expect(hotSpots[0]).toMatchObject({
      id: "nav-1",
      yaw: 45,
      pitch: 0,
      type: "info",
      cssClass: expect.stringContaining("ls-pv-pin-nav"),
    });
    expect(hotSpots[1].cssClass).toContain("ls-pv-pin-info");
    expect(hotSpots[2].cssClass).toContain("ls-pv-pin-label");
    // Opaque data is preserved on the marker passed to handlers, not interpreted for config.
    expect(hotSpots[0].clickHandlerArgs).toMatchObject({
      data: { targetSceneId: "kitchen" },
    });
    expect(hotSpots[0].cssClass).not.toContain("kitchen");
  });

  it("wires onMarkerClick via clickHandlerFunc", () => {
    const onMarkerClick = jest.fn();
    const marker = baseMarker({ id: "n", kind: "navigation" });
    const [spot] = markersToHotSpots([marker], { onMarkerClick });
    const event = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: document.createElement("div"),
    } as unknown as MouseEvent;

    spot.clickHandlerFunc?.(event, marker);
    expect(onMarkerClick).toHaveBeenCalledWith(marker);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("createTooltipFunc mounts tooltip DOM", () => {
    const marker = baseMarker({
      id: "i",
      kind: "info",
      content: { type: "text", body: "Tip" },
    });
    const [spot] = markersToHotSpots([marker]);
    const div = document.createElement("div");
    spot.createTooltipFunc?.(div, marker);
    expect(div.classList.contains("ls-pv-hotspot-root")).toBe(true);
    expect(div.querySelector(".ls-pv-info-panel")?.textContent).toBe("Tip");
  });

  it("toggles info panel on click", () => {
    const marker = baseMarker({
      id: "i",
      kind: "info",
      content: { type: "text", body: "Panel" },
    });
    const [spot] = markersToHotSpots([marker]);
    const root = document.createElement("div");
    spot.createTooltipFunc?.(root, marker);
    const panel = root.querySelector(".ls-pv-info-panel") as HTMLElement;
    expect(panel.hidden).toBe(true);

    const event = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: root,
    } as unknown as MouseEvent;
    spot.clickHandlerFunc?.(event, marker);
    expect(panel.hidden).toBe(false);
    spot.clickHandlerFunc?.(event, marker);
    expect(panel.hidden).toBe(true);
  });

  it("handles null currentTarget for info toggle safely", () => {
    const marker = baseMarker({
      id: "i",
      kind: "info",
      content: { type: "text", body: "x" },
    });
    const [spot] = markersToHotSpots([marker]);
    const event = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      currentTarget: null,
    } as unknown as MouseEvent;
    expect(() => spot.clickHandlerFunc?.(event, marker)).not.toThrow();
  });
});

describe("buildContentElement / mountMarkerTooltip", () => {
  it("renders text, image, html, and rich blocks", () => {
    const textEl = buildContentElement({ type: "text", body: "Hello" }, "popover");
    expect(textEl.textContent).toBe("Hello");

    const imageEl = buildContentElement(
      { type: "image", src: "/x.png", alt: "x", caption: "cap" },
      "billboard",
    );
    expect(imageEl.querySelector("img")?.getAttribute("src")).toBe("/x.png");
    expect(imageEl.textContent).toContain("cap");

    const htmlEl = buildContentElement(
      { type: "html", html: "<em>trusted</em>" },
      "popover",
    );
    expect(htmlEl.querySelector("em")?.textContent).toBe("trusted");

    const richEl = buildContentElement(
      {
        type: "rich",
        title: "Room",
        body: "Details",
        imageUrl: "/r.jpg",
        blocks: [
          { type: "text", text: "more" },
          { type: "image", src: "/b.png" },
          { type: "link", href: "https://ex.com", label: "Open" },
        ],
      },
      "popover",
    );
    expect(richEl.querySelector(".ls-pv-content-title")?.textContent).toBe("Room");
    expect(richEl.querySelectorAll("img")).toHaveLength(2);
    expect(richEl.querySelector("a")?.getAttribute("href")).toBe("https://ex.com");
  });

  it("mounts info popover hidden and label billboard visible", () => {
    const infoDiv = document.createElement("div");
    mountMarkerTooltip(
      infoDiv,
      baseMarker({
        id: "i",
        kind: "info",
        content: { type: "text", body: "Info body" },
      }),
    );
    const panel = infoDiv.querySelector(".ls-pv-info-panel") as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.hidden).toBe(true);

    const labelDiv = document.createElement("div");
    mountMarkerTooltip(
      labelDiv,
      baseMarker({
        id: "l",
        kind: "label",
        content: { type: "text", body: "Always on" },
      }),
    );
    expect(labelDiv.querySelector(".ls-pv-billboard")?.textContent).toBe(
      "Always on",
    );
  });

  it("uses custom pin iconUrl when provided", () => {
    const div = document.createElement("div");
    mountMarkerTooltip(
      div,
      baseMarker({
        id: "n",
        kind: "navigation",
        pin: { iconUrl: "/pin.svg" },
      }),
    );
    expect(div.querySelector(".ls-pv-pin-icon")?.getAttribute("src")).toBe(
      "/pin.svg",
    );
  });
});

describe("markersGeometryKey", () => {
  it("changes when geometry or content changes", () => {
    const a = [baseMarker({ id: "1", kind: "info", yaw: 0 })];
    const b = [baseMarker({ id: "1", kind: "info", yaw: 1 })];
    expect(markersGeometryKey(a)).not.toBe(markersGeometryKey(b));
  });
});
