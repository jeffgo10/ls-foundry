"use client";

import type { CanvasDesignerHandle } from "@jeffgo10/react-canvas-designer";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";

const CanvasDesigner = dynamic(
  () =>
    import("@jeffgo10/react-canvas-designer").then((m) => m.CanvasDesigner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-xl border border-white/10 bg-[#070708] text-xs tracking-[0.2em] text-white/40">
        LOADING CANVAS…
      </div>
    ),
  },
);

function StickPakCanvasSection() {
  const exportApiRef = useRef<CanvasDesignerHandle | null>(null);
  const [exportedJson, setExportedJson] = useState("");
  const [showCutLine, setShowCutLine] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!exportApiRef.current) return;

    setIsExporting(true);
    try {
      const payload = await exportApiRef.current.exportLayout();
      setExportedJson(JSON.stringify(payload, null, 2));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={showCutLine}
          onChange={(event) => setShowCutLine(event.target.checked)}
          className="size-4 rounded border-white/20"
        />
        Show cut line (red border on PNG transparency)
      </label>
      <div className="overflow-auto rounded-xl border border-white/10 bg-white p-4">
        <CanvasDesigner
          showCutLine={showCutLine}
          onReady={(api) => {
            exportApiRef.current = api;
          }}
        />
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isExporting ? "Exporting…" : "Export"}
        </button>
        <textarea
          readOnly
          value={exportedJson}
          placeholder="Exported layout JSON with attached image data URLs will appear here."
          rows={16}
          className="w-full resize-y rounded-xl border border-white/10 bg-[#070708] p-4 font-mono text-xs leading-relaxed text-white/70 outline-none focus:border-white/20"
        />
      </div>
    </div>
  );
}

export default StickPakCanvasSection;
