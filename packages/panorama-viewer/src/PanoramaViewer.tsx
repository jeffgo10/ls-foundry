"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  markersGeometryKey,
  markersToHotSpots,
} from "./markers";
import type { PanoramaMarker, PanoramaViewerHandle, PanoramaViewerProps } from "./types";

async function ensurePannellum(): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.pannellum) return;
  await import("pannellum/build/pannellum.js");
}

const PanoramaViewer = forwardRef<PanoramaViewerHandle, PanoramaViewerProps>(
  function PanoramaViewer(
    {
      imageUrl,
      className,
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
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Pannellum.Viewer | null>(null);
    const onSphereClickRef = useRef(onSphereClick);
    const onMarkerClickRef = useRef(onMarkerClick);
    const modeRef = useRef(mode);

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

    const handleContainerClick = (event: ReactMouseEvent<HTMLDivElement>) => {
      if (modeRef.current !== "edit" || !onSphereClickRef.current) return;
      const target = event.target as HTMLElement;
      if (target.closest(".pnlm-hotspot, .ls-pv-hotspot-root, .ls-pv-hotspot")) {
        return;
      }
      const viewer = viewerRef.current;
      if (!viewer) return;
      const [pitch, yaw] = viewer.mouseEventToCoords(event.nativeEvent);
      onSphereClickRef.current({ yaw, pitch });
    };

    return (
      <div
        ref={containerRef}
        className={className ?? "ls-pv-root"}
        role="img"
        aria-label="360 panorama viewer"
        onClick={handleContainerClick}
        style={
          className
            ? undefined
            : { width: "100%", height: "100%", minHeight: 320, background: "#18181b" }
        }
      />
    );
  },
);

export { PanoramaViewer };
