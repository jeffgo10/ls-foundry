import type { MarkerContent, MarkerKind, PanoramaMarker } from "./types";

export const PIN_CLASS_BY_KIND: Record<MarkerKind, string> = {
  navigation: "ls-pv-pin-nav",
  info: "ls-pv-pin-info",
  label: "ls-pv-pin-label",
};

export function isTextContent(
  content: MarkerContent,
): content is Extract<MarkerContent, { type: "text" }> {
  return content.type === "text";
}

export function isImageContent(
  content: MarkerContent,
): content is Extract<MarkerContent, { type: "image" }> {
  return content.type === "image";
}

export function isHtmlContent(
  content: MarkerContent,
): content is Extract<MarkerContent, { type: "html" }> {
  return content.type === "html";
}

export function isRichContent(
  content: MarkerContent,
): content is Extract<MarkerContent, { type: "rich" }> {
  return content.type === "rich";
}

export function pinClassForMarker(marker: PanoramaMarker): string {
  const base = PIN_CLASS_BY_KIND[marker.kind];
  const extra = marker.pin?.cssClass?.trim();
  return extra ? `${base} ${extra}` : base;
}

export function defaultTitleForMarker(marker: PanoramaMarker): string {
  if (marker.title?.trim()) return marker.title.trim();
  if (marker.kind === "navigation") return "Go";
  if (marker.kind === "info") return "Info";
  return "Label";
}

/** Geometry key used to remount the viewer when markers change. */
export function markersGeometryKey(markers: PanoramaMarker[]): string {
  return JSON.stringify(
    markers.map((m) => ({
      id: m.id,
      yaw: m.yaw,
      pitch: m.pitch,
      kind: m.kind,
      title: m.title,
      pin: m.pin,
      content: m.content,
    })),
  );
}

export type MarkerHotSpotHandlers = {
  onMarkerClick?: (marker: PanoramaMarker) => void;
};

/**
 * Map package markers to Pannellum `hotSpots` config.
 * Opaque `data` is not read — consumers keep it for their own click handlers.
 */
export function markersToHotSpots(
  markers: PanoramaMarker[],
  handlers: MarkerHotSpotHandlers = {},
): NonNullable<Pannellum.ConfigOptions["hotSpots"]> {
  return markers.map((marker) => {
    const cssClass = [
      "ls-pv-hotspot",
      pinClassForMarker(marker),
      marker.kind === "label" ? "ls-pv-hotspot-label" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return {
      id: marker.id,
      pitch: marker.pitch,
      yaw: marker.yaw,
      type: "info" as const,
      text: defaultTitleForMarker(marker),
      cssClass,
      createTooltipArgs: marker,
      createTooltipFunc: (div: HTMLDivElement, args: unknown) => {
        mountMarkerTooltip(div, args as PanoramaMarker);
      },
      clickHandlerArgs: marker,
      clickHandlerFunc: (
        event: MouseEvent | PointerEvent | TouchEvent,
        args: unknown,
      ) => {
        event.preventDefault();
        event.stopPropagation();
        const m = args as PanoramaMarker;
        if (m.kind === "info") {
          toggleInfoPanel(event.currentTarget as HTMLElement | null);
        }
        handlers.onMarkerClick?.(m);
      },
    };
  });
}

export function mountMarkerTooltip(
  div: HTMLDivElement,
  marker: PanoramaMarker,
): void {
  div.classList.add("ls-pv-hotspot-root");
  div.setAttribute("role", "button");
  div.setAttribute("tabindex", "0");
  div.setAttribute("aria-label", defaultTitleForMarker(marker));

  const pin = document.createElement("span");
  pin.className = "ls-pv-pin";
  if (marker.pin?.iconUrl) {
    const img = document.createElement("img");
    img.src = marker.pin.iconUrl;
    img.alt = "";
    img.className = "ls-pv-pin-icon";
    pin.appendChild(img);
  } else {
    pin.textContent =
      marker.kind === "navigation" ? "→" : marker.kind === "info" ? "i" : "";
  }
  div.appendChild(pin);

  if (!marker.content) return;

  if (marker.kind === "label") {
    const billboard = buildContentElement(marker.content, "billboard");
    div.appendChild(billboard);
    return;
  }

  if (marker.kind === "info") {
    const panel = buildContentElement(marker.content, "popover");
    panel.hidden = true;
    panel.classList.add("ls-pv-info-panel");
    div.appendChild(panel);
  }
}

function toggleInfoPanel(hotspotEl: HTMLElement | null): void {
  if (!hotspotEl) return;
  const panel = hotspotEl.querySelector<HTMLElement>(".ls-pv-info-panel");
  if (!panel) return;
  panel.hidden = !panel.hidden;
}

export function buildContentElement(
  content: MarkerContent,
  variant: "billboard" | "popover",
): HTMLElement {
  const root = document.createElement("div");
  root.className =
    variant === "billboard" ? "ls-pv-billboard" : "ls-pv-popover";

  if (isTextContent(content)) {
    const p = document.createElement("p");
    p.className = "ls-pv-content-text";
    p.textContent = content.body;
    root.appendChild(p);
    return root;
  }

  if (isImageContent(content)) {
    const img = document.createElement("img");
    img.className = "ls-pv-content-image";
    img.src = content.src;
    img.alt = content.alt ?? "";
    root.appendChild(img);
    if (content.caption) {
      const cap = document.createElement("p");
      cap.className = "ls-pv-content-caption";
      cap.textContent = content.caption;
      root.appendChild(cap);
    }
    return root;
  }

  if (isHtmlContent(content)) {
    // Trust boundary: consumers must sanitize untrusted HTML before passing it.
    const wrap = document.createElement("div");
    wrap.className = "ls-pv-content-html";
    wrap.innerHTML = content.html;
    root.appendChild(wrap);
    return root;
  }

  if (isRichContent(content)) {
    if (content.title) {
      const h = document.createElement("strong");
      h.className = "ls-pv-content-title";
      h.textContent = content.title;
      root.appendChild(h);
    }
    if (content.imageUrl) {
      const img = document.createElement("img");
      img.className = "ls-pv-content-image";
      img.src = content.imageUrl;
      img.alt = "";
      root.appendChild(img);
    }
    if (content.body) {
      const p = document.createElement("p");
      p.className = "ls-pv-content-text";
      p.textContent = content.body;
      root.appendChild(p);
    }
    for (const block of content.blocks ?? []) {
      if (block.type === "text") {
        const p = document.createElement("p");
        p.className = "ls-pv-content-text";
        p.textContent = block.text;
        root.appendChild(p);
      } else if (block.type === "image") {
        const img = document.createElement("img");
        img.className = "ls-pv-content-image";
        img.src = block.src;
        img.alt = block.alt ?? "";
        root.appendChild(img);
      } else if (block.type === "link") {
        const a = document.createElement("a");
        a.className = "ls-pv-content-link";
        a.href = block.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = block.label;
        root.appendChild(a);
      }
    }
  }

  return root;
}
