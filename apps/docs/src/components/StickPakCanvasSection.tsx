"use client";

import type {
  CanvasDesignerHandle,
  DimensionUnit,
} from "@jeffgo10/react-canvas-designer";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

function CanvasDesignerLoading() {
  return (
    <div className="flex h-[400px] items-center justify-center rounded-xl border border-white/10 bg-[#070708] text-xs tracking-[0.2em] text-white/40">
      LOADING CANVAS…
    </div>
  );
}

const CanvasDesigner = dynamic(
  () =>
    import("@jeffgo10/react-canvas-designer").then((m) => m.CanvasDesigner),
  {
    ssr: false,
    loading: () => <CanvasDesignerLoading />,
  },
);

function StickPakCanvasSection() {
  const [isMounted, setIsMounted] = useState(false);
  const designerRef = useRef<CanvasDesignerHandle | null>(null);
  const [exportedJson, setExportedJson] = useState("");
  const [showCutLine, setShowCutLine] = useState(true);
  const [autoArrangeGapMm, setAutoArrangeGapMm] = useState(5);
  const [canvasMarginMm, setCanvasMarginMm] = useState(10);
  const [autoArrangeOnAdd, setAutoArrangeOnAdd] = useState(false);
  const [showSelectionDimensions, setShowSelectionDimensions] = useState(true);
  const [dimensionUnit, setDimensionUnit] = useState<DimensionUnit>("mm");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [arrangeMessage, setArrangeMessage] = useState("");
  const [duplicateMessage, setDuplicateMessage] = useState("");
  const [overlapMessage, setOverlapMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isArranging, setIsArranging] = useState(false);
  const hasSelection = selectedIds.length > 0;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="space-y-6" aria-busy="true">
        <CanvasDesignerLoading />
      </div>
    );
  }

  const handleExport = async () => {
    if (!designerRef.current) return;

    setIsExporting(true);
    try {
      const payload = await designerRef.current.exportLayout();
      setExportedJson(JSON.stringify(payload, null, 2));
    } finally {
      setIsExporting(false);
    }
  };

  const handleVerifyOverlaps = async () => {
    if (!designerRef.current) return;

    setOverlapMessage("");
    const result = await designerRef.current.verifyOverlaps({
      minGapMm: autoArrangeGapMm,
    });
    if (result.valid) {
      designerRef.current.clearOverlapHighlights();
      setOverlapMessage(
        `No overlaps detected (cut-line gap ≥ ${autoArrangeGapMm} mm).`,
      );
      return;
    }

    setOverlapMessage(
      `${result.overlappingIds.length} sticker${result.overlappingIds.length === 1 ? "" : "s"} overlap or are too close — highlighted in red.`,
    );
  };

  const handleDuplicate = (direction: "horizontal" | "vertical") => {
    if (!designerRef.current) return;

    setArrangeMessage("");
    setOverlapMessage("");
    const duplicateOptions = { gapMm: autoArrangeGapMm };
    const addedCount =
      direction === "horizontal"
        ? designerRef.current.duplicateSelectedHorizontally(duplicateOptions)
        : designerRef.current.duplicateSelectedVertically(duplicateOptions);

    setDuplicateMessage(
      addedCount > 0
        ? `Added ${addedCount} ${direction} cop${addedCount === 1 ? "y" : "ies"} with ${autoArrangeGapMm} mm cut-line gap.`
        : hasSelection
          ? `No ${direction} copies fit inside the printable area with ${autoArrangeGapMm} mm cut-line gap.`
          : "Select a sticker on the canvas first.",
    );
  };

  const handleArrangeAll = async () => {
    if (!designerRef.current) return;

    setIsArranging(true);
    setArrangeMessage("");
    setDuplicateMessage("");
    setOverlapMessage("");
    try {
      const allPlaced = await designerRef.current.arrangeAll({
        gapMm: autoArrangeGapMm,
      });
      setArrangeMessage(
        allPlaced
          ? "All stickers arranged with cut-line spacing."
          : "Some stickers could not fit on the page.",
      );
    } finally {
      setIsArranging(false);
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
      <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={autoArrangeOnAdd}
          onChange={(event) => setAutoArrangeOnAdd(event.target.checked)}
          className="size-4 rounded border-white/20"
        />
        Auto-arrange when images are added
      </label>
      <label className="flex items-center gap-2 text-sm text-white/70">
        Canvas margin (mm)
        <input
          type="number"
          min={0}
          step={0.5}
          value={canvasMarginMm}
          onChange={(event) => setCanvasMarginMm(Number(event.target.value))}
          className="w-20 rounded border border-white/15 bg-[#070708] px-2 py-1 text-sm text-white/80"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-white/70">
        Cut-line gap (mm)
        <input
          type="number"
          min={0}
          step={0.5}
          value={autoArrangeGapMm}
          aria-label="Cut-line gap (mm)"
          onChange={(event) => setAutoArrangeGapMm(Number(event.target.value))}
          className="w-20 rounded border border-white/15 bg-[#070708] px-2 py-1 text-sm text-white/80"
        />
        <span className="text-white/40">Used by arrange + duplicate fill</span>
      </label>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={showSelectionDimensions}
          onChange={(event) => setShowSelectionDimensions(event.target.checked)}
          className="size-4 rounded border-white/20"
        />
        Show selected sticker size
      </label>
      {showSelectionDimensions ? (
        <label className="flex items-center gap-2 text-sm text-white/70">
          Size unit
          <select
            value={dimensionUnit}
            onChange={(event) =>
              setDimensionUnit(event.target.value as DimensionUnit)
            }
            className="rounded border border-white/15 bg-[#070708] px-2 py-1 text-sm text-white/80"
          >
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="in">in</option>
          </select>
          <span className="text-white/40">@ 72 DPI design canvas</span>
        </label>
      ) : null}
      <div className="w-full rounded-xl border border-white/10 bg-white">
        <CanvasDesigner
          ref={designerRef}
          fitToContainer
          showCutLine={showCutLine}
          autoArrangeGapMm={autoArrangeGapMm}
          canvasMarginMm={canvasMarginMm}
          autoArrangeOnAdd={autoArrangeOnAdd}
          showSelectionDimensions={showSelectionDimensions}
          dimensionUnit={dimensionUnit}
          onSelectedIdsChange={setSelectedIds}
          onAutoArrange={({ allPlaced }) => {
            setDuplicateMessage("");
            setOverlapMessage("");
            setArrangeMessage(
              allPlaced
                ? "All stickers arranged with cut-line spacing."
                : "Some stickers could not fit on the page.",
            );
          }}
        />
      </div>
      <div className="space-y-3">
        <p className="text-sm text-white/50">
          {hasSelection
            ? selectedIds.length > 1
              ? `${selectedIds.length} stickers selected — duplicate fills the whole selection together. Use the transform box to move, resize, or rotate.`
              : "Selected sticker — duplicate to fill a row or column inside the printable margin."
            : "Click a sticker to select it. Shift-click to multi-select, or drag on empty canvas to marquee-select."}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleDuplicate("horizontal")}
            disabled={!hasSelection}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Duplicate horizontally
          </button>
          <button
            type="button"
            onClick={() => handleDuplicate("vertical")}
            disabled={!hasSelection}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Duplicate vertically
          </button>
          <button
            type="button"
            onClick={handleArrangeAll}
            disabled={isArranging}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isArranging ? "Arranging…" : "Arrange all"}
          </button>
          <button
            type="button"
            onClick={handleVerifyOverlaps}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            Check overlaps
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? "Exporting…" : "Export"}
          </button>
        </div>
        {duplicateMessage ? (
          <p className="text-sm text-white/50">{duplicateMessage}</p>
        ) : null}
        {arrangeMessage ? (
          <p className="text-sm text-white/50">{arrangeMessage}</p>
        ) : null}
        {overlapMessage ? (
          <p className="text-sm text-white/50">{overlapMessage}</p>
        ) : null}
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
