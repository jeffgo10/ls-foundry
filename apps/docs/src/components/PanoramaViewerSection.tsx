"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type {
  MarkerKind,
  PanoramaMarker,
} from "@jeffgo10/panorama-viewer";
import "@jeffgo10/panorama-viewer/styles.css";

const PanoramaViewer = dynamic(
  () => import("@jeffgo10/panorama-viewer").then((m) => m.PanoramaViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[min(70vh,520px)] items-center justify-center text-xs tracking-[0.2em] text-white/40">
        LOADING PANORAMA…
      </div>
    ),
  },
);

/** Public sample equirectangular from Pannellum docs */
const SAMPLE_PANO = "https://pannellum.org/images/alma.jpg";

const SEED_MARKERS: PanoramaMarker[] = [
  {
    id: "seed-nav",
    yaw: -40,
    pitch: 0,
    kind: "navigation",
    title: "Next room",
    data: { targetSceneId: "demo-kitchen" },
  },
  {
    id: "seed-info",
    yaw: 20,
    pitch: -8,
    kind: "info",
    title: "Details",
    content: {
      type: "text",
      body: "Sample info hotspot — original finishes throughout.",
    },
  },
  {
    id: "seed-label",
    yaw: 90,
    pitch: 6,
    kind: "label",
    content: {
      type: "image",
      src: "https://pannellum.org/images/bma-0.jpg",
      alt: "Sample label",
      caption: "Label billboard (image + caption)",
    },
  },
];

function PanoramaViewerSection() {
  const [imageUrl, setImageUrl] = useState(SAMPLE_PANO);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [markers, setMarkers] = useState<PanoramaMarker[]>(SEED_MARKERS);
  const [kind, setKind] = useState<MarkerKind>("info");
  const [title, setTitle] = useState("New hotspot");
  const [body, setBody] = useState("Placed in edit mode");
  const [lastEvent, setLastEvent] = useState<string>("—");
  const objectUrlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (!file) {
      setImageUrl(SAMPLE_PANO);
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageUrl(url);
  };

  const handleSphereClick = ({ yaw, pitch }: { yaw: number; pitch: number }) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `m-${Date.now()}`;

    const next: PanoramaMarker = {
      id,
      yaw,
      pitch,
      kind,
      title: title.trim() || undefined,
      content:
        kind === "navigation"
          ? undefined
          : kind === "label"
            ? {
                type: "image",
                src: "https://pannellum.org/images/bma-0.jpg",
                caption: body.trim() || "Label",
              }
            : { type: "text", body: body.trim() || "Info" },
      data: kind === "navigation" ? { targetSceneId: "demo-next" } : undefined,
    };

    setMarkers((prev) => [...prev, next]);
    setLastEvent(
      `Added ${kind} at yaw ${yaw.toFixed(1)}, pitch ${pitch.toFixed(1)}`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-white/70">
          <span className="mb-2 block text-xs tracking-[0.12em] text-white/45">
            Upload 360° equirectangular
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="block w-full text-xs text-white/60 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white/80"
          />
        </label>
        <div className="flex flex-col justify-end gap-2 sm:items-end">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("view")}
              className={`rounded-md px-3 py-1.5 text-xs tracking-[0.12em] ${
                mode === "view"
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-white/50"
              }`}
            >
              VIEW
            </button>
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={`rounded-md px-3 py-1.5 text-xs tracking-[0.12em] ${
                mode === "edit"
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-white/50"
              }`}
            >
              EDIT
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setMarkers(SEED_MARKERS);
              setLastEvent("Reset seed markers");
            }}
            className="text-xs text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
          >
            Reset markers
          </button>
        </div>
      </div>

      {mode === "edit" ? (
        <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
          <label className="text-xs text-white/60">
            Kind
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as MarkerKind)}
              className="mt-1 block w-full rounded-md border border-white/10 bg-[#0c0c0e] px-2 py-1.5 text-white/80"
            >
              <option value="navigation">navigation</option>
              <option value="info">info</option>
              <option value="label">label</option>
            </select>
          </label>
          <label className="text-xs text-white/60">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border border-white/10 bg-[#0c0c0e] px-2 py-1.5 text-white/80"
            />
          </label>
          <label className="text-xs text-white/60">
            Content / caption
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1 block w-full rounded-md border border-white/10 bg-[#0c0c0e] px-2 py-1.5 text-white/80"
            />
          </label>
          <p className="sm:col-span-3 text-xs text-white/40">
            Click the sphere to place a hotspot of the selected kind.
          </p>
        </div>
      ) : null}

      <div className="h-[min(70vh,520px)] overflow-hidden rounded-xl border border-white/10 bg-[#070708]">
        <PanoramaViewer
          imageUrl={imageUrl}
          markers={markers}
          mode={mode}
          fitParent
          className="h-full min-h-0 w-full"
          onSphereClick={handleSphereClick}
          onMarkerClick={(m) => {
            setLastEvent(`Clicked ${m.kind} “${m.title ?? m.id}”`);
          }}
        />
      </div>

      <p className="text-xs text-white/40">
        Last event: <span className="text-white/70">{lastEvent}</span>
        {" · "}
        Markers: {markers.length}
      </p>
    </div>
  );
}

export default PanoramaViewerSection;
