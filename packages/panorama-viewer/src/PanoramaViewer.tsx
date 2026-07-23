"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { markersGeometryKey, markersToHotSpots } from "./markers";
import { exceedsDragThreshold } from "./pointer";
import type {
  PanoramaMarker,
  PanoramaViewerHandle,
  PanoramaViewerProps,
} from "./types";

async function ensurePannellum(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.pannellum) return;
  await import("pannellum/build/pannellum.js");
}

const DEFAULT_SHELL_STYLE: CSSProperties = {
  width: "100%",
  height: "min(70vh, 520px)",
  minHeight: "min(70vh, 520px)",
  background: "#18181b",
  position: "relative",
  overflow: "hidden",
};

const PanoramaViewer = forwardRef<PanoramaViewerHandle, PanoramaViewerProps>(
  function PanoramaViewer(
    {
      imageUrl,
      className,
      style,
      fitParent = false,
      initialYaw = 0,
      initialPitch = 0,
      initialHfov = 100,
      markers = [],
      mode = "view",
      onSphereClick,
      onMarkerClick,
    },
    ref,
  ) {
    const shellRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Pannellum.Viewer | null>(null);
    const onSphereClickRef = useRef(onSphereClick);
    const onMarkerClickRef = useRef(onMarkerClick);
    const modeRef = useRef(mode);
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
    const didDragRef = useRef(false);

    onSphereClickRef.current = onSphereClick;
    onMarkerClickRef.current = onMarkerClick;
    modeRef.current = mode;

    const geometryKey = markersGeometryKey(markers);

    useImperativeHandle(
      ref,
      () => ({
        getView: () => {
          const v = viewerRef.current;
          if (!v) return null;
          return {
            yaw: v.getYaw(),
            pitch: v.getPitch(),
            hfov: v.getHfov(),
          };
        },
        lookAt: (yaw, pitch, hfov) => {
          viewerRef.current?.lookAt(pitch, yaw, hfov);
        },
        destroy: () => {
          viewerRef.current?.destroy();
          viewerRef.current = null;
        },
      }),
      [],
    );

    useEffect(() => {
      let cancelled = false;
      const markerSnapshot: PanoramaMarker[] = markers;

      async function mount() {
        if (!containerRef.current) return;
        await ensurePannellum();
        if (cancelled || !containerRef.current || !window.pannellum) return;

        viewerRef.current?.destroy();
        viewerRef.current = null;

        const config: Pannellum.ConfigOptions = {
          type: "equirectangular",
          panorama: imageUrl,
          autoLoad: true,
          yaw: initialYaw,
          pitch: initialPitch,
          hfov: initialHfov,
          showZoomCtrl: true,
          showFullscreenCtrl: true,
          mouseZoom: true,
          hotSpots: markersToHotSpots(markerSnapshot, {
            onMarkerClick: (m) => onMarkerClickRef.current?.(m),
          }),
        };

        viewerRef.current = window.pannellum.viewer(
          containerRef.current,
          config,
        );
      }

      void mount();

      return () => {
        cancelled = true;
        viewerRef.current?.destroy();
        viewerRef.current = null;
      };
      // markers captured via geometryKey; callbacks via refs
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageUrl, geometryKey, initialYaw, initialPitch, initialHfov]);

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      pointerStartRef.current = { x: event.clientX, y: event.clientY };
      didDragRef.current = false;
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = pointerStartRef.current;
      if (!start || didDragRef.current) return;
      if (
        exceedsDragThreshold(start, { x: event.clientX, y: event.clientY })
      ) {
        didDragRef.current = true;
      }
    };

    const handlePointerUp = () => {
      pointerStartRef.current = null;
    };

    const handleContainerClick = (event: ReactMouseEvent<HTMLDivElement>) => {
      // Ignore click that follows a drag-pan on the sphere.
      if (didDragRef.current) {
        didDragRef.current = false;
        return;
      }
      if (modeRef.current !== "edit" || !onSphereClickRef.current) return;
      const target = event.target as HTMLElement;
      if (
        target.closest(".pnlm-hotspot, .ls-pv-hotspot-root, .ls-pv-hotspot")
      ) {
        return;
      }
      const viewer = viewerRef.current;
      if (!viewer) return;
      const [pitch, yaw] = viewer.mouseEventToCoords(event.nativeEvent);
      onSphereClickRef.current({ yaw, pitch });
    };

    const shellStyle: CSSProperties = fitParent
      ? { position: "relative", overflow: "hidden", ...style }
      : { ...DEFAULT_SHELL_STYLE, ...style };

    const shellClassName = [
      "ls-pv-shell",
      fitParent ? "ls-pv-shell-fit" : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={shellRef} className={shellClassName} style={shellStyle}>
        <div
          ref={containerRef}
          className="ls-pv-canvas"
          role="img"
          aria-label="360 panorama viewer"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={handleContainerClick}
        />
      </div>
    );
  },
);

export { PanoramaViewer };
