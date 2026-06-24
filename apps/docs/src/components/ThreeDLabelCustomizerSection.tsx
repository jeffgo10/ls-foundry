"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const ThreeDLabelCustomizer = dynamic(
  () =>
    import("@jeffgo10/three-d-label-customizer").then(
      (m) => m.ThreeDLabelCustomizer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-[#070708] text-xs tracking-[0.2em] text-white/40">
        LOADING 3D LABEL…
      </div>
    ),
  },
);

function ThreeDLabelCustomizerSection() {
  const [canvasImageSrc, setCanvasImageSrc] = useState("");
  const [labelImageSrc, setLabelImageSrc] = useState("");
  const [showWireframe, setShowWireframe] = useState(false);
  const canvasObjectUrl = useRef<string | null>(null);
  const labelObjectUrl = useRef<string | null>(null);

  const revokeUrl = (ref: React.MutableRefObject<string | null>) => {
    if (ref.current) {
      URL.revokeObjectURL(ref.current);
      ref.current = null;
    }
  };

  useEffect(
    () => () => {
      revokeUrl(canvasObjectUrl);
      revokeUrl(labelObjectUrl);
    },
    [],
  );

  const handleProductUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    revokeUrl(canvasObjectUrl);
    if (!file) {
      setCanvasImageSrc("");
      return;
    }
    const url = URL.createObjectURL(file);
    canvasObjectUrl.current = url;
    setCanvasImageSrc(url);
  };

  const handleLabelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    revokeUrl(labelObjectUrl);
    if (!file) {
      setLabelImageSrc("");
      return;
    }
    const url = URL.createObjectURL(file);
    labelObjectUrl.current = url;
    setLabelImageSrc(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-white/70">
          <span className="mb-2 block text-xs tracking-[0.12em] text-white/45">
            Product image (neon-green label area)
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleProductUpload}
            className="block w-full text-xs text-white/60 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white/80"
          />
        </label>
        <label className="block text-sm text-white/70">
          <span className="mb-2 block text-xs tracking-[0.12em] text-white/45">
            Label graphic
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleLabelUpload}
            className="block w-full text-xs text-white/60 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white/80"
          />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={showWireframe}
          onChange={(event) => setShowWireframe(event.target.checked)}
          className="size-4 rounded border-white/20"
        />
        Show wireframe grid on curved label
      </label>

      <ThreeDLabelCustomizer
        canvasImageSrc={canvasImageSrc}
        labelImageSrc={labelImageSrc}
        showWireframe={showWireframe}
      />
    </div>
  );
}

export default ThreeDLabelCustomizerSection;
