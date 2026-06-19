import {
  CANVAS_DPI,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  PRINT_DPI,
  createEmptyLayout,
  getDesignDpi,
  getPrintDpi,
  type CanvasItem,
  type CanvasLayout,
  type DimensionUnit,
} from "@jeffgo10/shared-types";
import { blobUrlToDataUrl, traceAlphaContour } from "@jeffgo10/helpers/image";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDropzone } from "react-dropzone";
import {
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Rect,
  Stage,
  Transformer,
} from "react-konva";
import type { CanvasLayoutExport } from "./types";
import {
  autoArrangeItems,
  type AutoArrangeOptions,
} from "./autoArrange";
import {
  formatDimensionAxisValue,
  getSelectionDimensions,
  type FormatSelectionDimensions,
  type SelectionDimensionsResult,
} from "./selectionDimensions";
import { SelectionDimensionLabels } from "./SelectionDimensionLabels";
import {
  clampItemPosition,
  clampItemToCanvasMargin,
  fitItemToCanvasArea,
  getCanvasMarginPx,
  prepareItemForCanvasPlacement,
} from "./canvasMargin";
import {
  clampNodeScale,
  clampResizeBox,
  DEFAULT_MIN_RESIZE_SIZE_MM,
  getMinResizeDimensionsPx,
} from "./resizeConstraints";

export const TRANSFORMER_COLOR = "#2563eb";

export type { AutoArrangeOptions } from "./autoArrange";
export type {
  FormatSelectionDimensions,
  SelectionDimensionsResult,
} from "./selectionDimensions";

type PlacedImage = CanvasItem & {
  src: string;
  mimeType: string;
  width: number;
  height: number;
  /** Runtime alpha contour for margin clamping (not exported in layout JSON). */
  cutLinePoints?: number[];
};

export type CanvasDesignerProps = {
  onExport?: (payload: CanvasLayoutExport) => void;
  /** Called when export API is ready (use instead of ref through next/dynamic). */
  onReady?: (api: CanvasDesignerHandle) => void;
  className?: string;
  /** Preview a red cut line along PNG transparency edges (not exported). */
  showCutLine?: boolean;
  cutLineColor?: string;
  /**
   * Minimum gap between cut-line outlines when auto-arranging (millimeters).
   * Default 5. Requires alpha contours; falls back to image bounds when opaque.
   */
  autoArrangeGapMm?: number;
  /** Run auto-arrange after each dropped image. Default false. */
  autoArrangeOnAdd?: boolean;
  /** Called after auto-arrange; `allPlaced` is false if any sticker did not fit. */
  onAutoArrange?: (result: { allPlaced: boolean }) => void;
  /** Show width × height for the selected sticker. Default false. */
  showSelectionDimensions?: boolean;
  /** Physical unit for selection dimensions. Default `mm`. */
  dimensionUnit?: DimensionUnit;
  /** DPI used to convert canvas pixels to physical size. Default 72 (`CANVAS_DPI`). */
  dimensionDpi?: number;
  /** Decimal places in the default dimension label. Default 1. */
  dimensionDecimalPlaces?: number;
  /** Override the default `W × H unit` label. */
  formatSelectionDimensions?: FormatSelectionDimensions;
  /** Fired when selection or size changes while dimensions are enabled. */
  onSelectionDimensionsChange?: (dimensions: SelectionDimensionsResult | null) => void;
  /** Color for on-canvas dimension captions. Default matches transformer blue. */
  dimensionLabelColor?: string;
  /** Design canvas width in pixels. Default A4 @ 72 DPI (595). */
  canvasWidth?: number;
  /** Design canvas height in pixels. Default A4 @ 72 DPI (842). */
  canvasHeight?: number;
  /** Design-time DPI for canvasWidth/Height. Default 72. */
  designDpi?: number;
  /** Target print DPI written to layout JSON for upscale. Default 300. */
  printDpi?: number;
  /**
   * Minimum shorter-side size when resizing a sticker (millimeters).
   * The longer side scales with aspect ratio. Default 25.4 mm (1 inch).
   */
  minResizeSizeMm?: number;
  /**
   * Restricted edge inset in millimeters. The alpha cut line cannot enter
   * this band; transparent image padding may extend past it. Default 0.
   */
  canvasMarginMm?: number;
  /** Preview a dashed guide for the canvas margin. Default true when margin > 0. */
  showCanvasMargin?: boolean;
  /** Stroke color for the margin guide. Default `#94a3b8`. */
  canvasMarginColor?: string;
};

export type ImageSourceFromUrl = {
  url: string;
  mimeType?: string;
  /** Links canvas item to S3 asset; defaults to a new UUID. */
  assetId?: string;
};

export type LayoutLoadInput = {
  layout: CanvasLayout;
  sources: ImageSourceFromUrl[];
};

export type CanvasDesignerHandle = {
  exportLayout: () => Promise<CanvasLayoutExport>;
  /** Layout transforms + asset ids for S3-backed persistence (no base64). */
  exportLayoutState: () => {
    layout: CanvasLayout;
    assets: Array<{ assetId: string; mimeType: string }>;
  };
  /** Restore a saved design from presigned S3 URLs + layout JSON. */
  loadLayoutFromSources: (input: LayoutLoadInput) => Promise<void>;
  /** Remove all stickers from the canvas. */
  clearCanvas: () => void;
  /** Deselect any sticker, then pack all stickers with cut-line spacing. */
  arrangeAll: (options?: AutoArrangeOptions) => Promise<boolean>;
  /**
   * Alias for {@link arrangeAll}.
   * @deprecated Prefer `arrangeAll`.
   */
  autoArrange: (options?: AutoArrangeOptions) => Promise<boolean>;
  /** Place images from remote URLs (e.g. presigned S3 GET URLs). */
  addImagesFromUrls: (sources: ImageSourceFromUrl[]) => void;
};

function DraggableImage({
  item,
  showCutLine,
  cutLineColor,
  minResizeSizeMm,
  designDpi,
  canvasWidth,
  canvasHeight,
  canvasMarginMm,
  onSelect,
  onChange,
  shapeRef,
}: {
  item: PlacedImage;
  showCutLine: boolean;
  cutLineColor: string;
  minResizeSizeMm: number;
  designDpi: number;
  canvasWidth: number;
  canvasHeight: number;
  canvasMarginMm: number;
  onSelect: () => void;
  onChange: (next: PlacedImage) => void;
  shapeRef: (node: Konva.Group | null) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cutLinePoints, setCutLinePoints] = useState<number[]>([]);
  const itemRef = useRef(item);
  itemRef.current = item;

  const marginItem = useCallback(
    (overrides: Partial<PlacedImage> = {}): PlacedImage => ({
      ...itemRef.current,
      ...overrides,
      cutLinePoints:
        overrides.cutLinePoints ?? itemRef.current.cutLinePoints ?? cutLinePoints,
    }),
    [cutLinePoints],
  );

  useEffect(() => {
    const element = new window.Image();
    element.crossOrigin = "anonymous";
    element.src = item.src;
    element.onload = () => setImage(element);
    return () => {
      element.onload = null;
    };
  }, [item.src]);

  useEffect(() => {
    if (!image) {
      setCutLinePoints([]);
      return;
    }
    const points = traceAlphaContour(image, item.width, item.height);
    setCutLinePoints(points);
    const existing = itemRef.current.cutLinePoints;
    const unchanged =
      existing &&
      existing.length === points.length &&
      existing.every((value, index) => value === points[index]);
    if (!unchanged) {
      onChange({ ...itemRef.current, cutLinePoints: points });
    }
  }, [image, item.width, item.height, onChange]);

  const select = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    event.cancelBubble = true;
    onSelect();
  };

  const syncFromNode = (node: Konva.Group) => {
    const rotation = node.rotation();
    let scaleX = node.scaleX();
    let scaleY = node.scaleY();
    const minScaled = clampNodeScale(
      scaleX,
      scaleY,
      item.width,
      item.height,
      minResizeSizeMm,
      designDpi,
    );
    scaleX = minScaled.scaleX;
    scaleY = minScaled.scaleY;

    let working = marginItem({ scaleX, scaleY, rotation });
    const fitted = fitItemToCanvasArea(
      working,
      canvasWidth,
      canvasHeight,
      canvasMarginMm,
      designDpi,
    );
    scaleX = fitted.scaleX;
    scaleY = fitted.scaleY;
    working = marginItem({ scaleX, scaleY, rotation });

    if (scaleX !== node.scaleX() || scaleY !== node.scaleY()) {
      node.scaleX(scaleX);
      node.scaleY(scaleY);
    }

    const { x, y } = clampItemPosition(
      working,
      canvasWidth,
      canvasHeight,
      canvasMarginMm,
      designDpi,
      { x: node.x(), y: node.y() },
    );
    if (x !== node.x() || y !== node.y()) {
      node.x(x);
      node.y(y);
    }
    onChange({
      ...working,
      x,
      y,
    });
  };

  const dragBoundFunc = (pos: { x: number; y: number }) => {
    return clampItemPosition(
      marginItem(),
      canvasWidth,
      canvasHeight,
      canvasMarginMm,
      designDpi,
      pos,
    );
  };

  return (
    <Group
      ref={shapeRef}
      x={item.x}
      y={item.y}
      scaleX={item.scaleX}
      scaleY={item.scaleY}
      rotation={item.rotation}
      draggable
      dragBoundFunc={dragBoundFunc}
      onMouseDown={select}
      onTouchStart={select}
      onDragEnd={(event) => syncFromNode(event.target as Konva.Group)}
      onTransform={(event) => syncFromNode(event.target as Konva.Group)}
      onTransformEnd={(event) => syncFromNode(event.target as Konva.Group)}
    >
      <KonvaImage
        image={image ?? undefined}
        width={item.width}
        height={item.height}
      />
      {showCutLine && cutLinePoints.length > 0 ? (
        <Line
          points={cutLinePoints}
          stroke={cutLineColor}
          strokeWidth={1.5}
          strokeScaleEnabled={false}
          closed
          listening={false}
        />
      ) : null}
    </Group>
  );
}

export const CanvasDesigner = forwardRef<CanvasDesignerHandle, CanvasDesignerProps>(
  function CanvasDesigner(
    {
      onExport,
      onReady,
      className,
      showCutLine = false,
      cutLineColor = "#ef4444",
      autoArrangeGapMm = 5,
      autoArrangeOnAdd = false,
      onAutoArrange,
      showSelectionDimensions = false,
      dimensionUnit = "mm",
      dimensionDpi,
      dimensionDecimalPlaces = 1,
      formatSelectionDimensions,
      onSelectionDimensionsChange,
      dimensionLabelColor = TRANSFORMER_COLOR,
      canvasWidth: canvasWidthProp,
      canvasHeight: canvasHeightProp,
      designDpi: designDpiProp,
      printDpi: printDpiProp,
      minResizeSizeMm = DEFAULT_MIN_RESIZE_SIZE_MM,
      canvasMarginMm = 0,
      showCanvasMargin,
      canvasMarginColor = "#94a3b8",
    },
    ref,
  ) {
    const [items, setItems] = useState<PlacedImage[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [canvasConfig, setCanvasConfig] = useState({
      canvasWidth: canvasWidthProp ?? CANVAS_WIDTH,
      canvasHeight: canvasHeightProp ?? CANVAS_HEIGHT,
      designDpi: designDpiProp ?? CANVAS_DPI,
      printDpi: printDpiProp ?? PRINT_DPI,
    });
    const shapeRefs = useRef(new Map<string, Konva.Group>());
    const transformerRef = useRef<Konva.Transformer>(null);
    const pendingAutoArrangeRef = useRef(false);
    const itemsRef = useRef(items);
    itemsRef.current = items;
    const selectedIdRef = useRef(selectedId);
    selectedIdRef.current = selectedId;
    const onSelectionDimensionsChangeRef = useRef(onSelectionDimensionsChange);
    onSelectionDimensionsChangeRef.current = onSelectionDimensionsChange;

    useEffect(() => {
      setCanvasConfig({
        canvasWidth: canvasWidthProp ?? CANVAS_WIDTH,
        canvasHeight: canvasHeightProp ?? CANVAS_HEIGHT,
        designDpi: designDpiProp ?? CANVAS_DPI,
        printDpi: printDpiProp ?? PRINT_DPI,
      });
    }, [canvasWidthProp, canvasHeightProp, designDpiProp, printDpiProp]);

    const selectionDpi = dimensionDpi ?? canvasConfig.designDpi;
    const marginPx = getCanvasMarginPx(canvasMarginMm, canvasConfig.designDpi);
    const showMarginGuide = showCanvasMargin ?? canvasMarginMm > 0;

    const selectedItem = useMemo(
      () => items.find((item) => item.assetId === selectedId) ?? null,
      [items, selectedId],
    );

    const selectionDimensions = useMemo(() => {
      if (!showSelectionDimensions || !selectedItem) {
        return null;
      }

      const widthPx = selectedItem.width * Math.abs(selectedItem.scaleX);
      const heightPx = selectedItem.height * Math.abs(selectedItem.scaleY);

      return getSelectionDimensions(
        widthPx,
        heightPx,
        dimensionUnit,
        selectionDpi,
        dimensionDecimalPlaces,
        formatSelectionDimensions,
      );
    }, [
      showSelectionDimensions,
      selectedItem,
      dimensionUnit,
      selectionDpi,
      dimensionDecimalPlaces,
      formatSelectionDimensions,
    ]);

    const selectionDimensionLabels = useMemo(() => {
      if (!selectionDimensions) {
        return null;
      }

      return {
        width: formatDimensionAxisValue(
          selectionDimensions.width,
          selectionDimensions.unit,
          dimensionDecimalPlaces,
        ),
        height: formatDimensionAxisValue(
          selectionDimensions.height,
          selectionDimensions.unit,
          dimensionDecimalPlaces,
        ),
      };
    }, [selectionDimensions, dimensionDecimalPlaces]);

    useEffect(() => {
      if (!showSelectionDimensions) return;
      onSelectionDimensionsChangeRef.current?.(selectionDimensions);
    }, [showSelectionDimensions, selectionDimensions]);

    const layout = useMemo<CanvasLayout>(() => {
      const base = createEmptyLayout(canvasConfig);
      base.items = items.map(({ assetId, x, y, scaleX, scaleY, rotation }) => ({
        assetId,
        x,
        y,
        scaleX,
        scaleY,
        rotation,
      }));
      return base;
    }, [items, canvasConfig]);

    const buildExport = useCallback(async (): Promise<CanvasLayoutExport> => {
      const assets = await Promise.all(
        items.map(async (item) => {
          const { mimeType, dataUrl } = await blobUrlToDataUrl(item.src);
          return {
            assetId: item.assetId,
            mimeType: item.mimeType || mimeType,
            dataUrl,
          };
        }),
      );

      return { layout, assets };
    }, [items, layout]);

    const exportLayoutState = useCallback(() => {
      return {
        layout,
        assets: items.map(({ assetId, mimeType }) => ({ assetId, mimeType })),
      };
    }, [items, layout]);

    const loadLayoutFromSources = useCallback(
      async (input: LayoutLoadInput) => {
        const sourceById = new Map(
          input.sources
            .filter((source) => source.assetId)
            .map((source) => [source.assetId as string, source]),
        );

        const placed: PlacedImage[] = [];

        for (const item of input.layout.items) {
          const source = sourceById.get(item.assetId);
          if (!source) {
            continue;
          }

          await new Promise<void>((resolve, reject) => {
            const image = new window.Image();
            image.crossOrigin = "anonymous";
            image.src = source.url;
            image.onload = () => {
              const cutLinePoints = traceAlphaContour(image, image.width, image.height);
              placed.push({
                ...item,
                src: source.url,
                mimeType: source.mimeType ?? "image/png",
                width: image.width,
                height: image.height,
                cutLinePoints,
              });
              resolve();
            };
            image.onerror = () => {
              reject(new Error(`Failed to load image for asset ${item.assetId}`));
            };
          });
        }

        setItems(
          placed.map((item) => {
            const fitted = fitItemToCanvasArea(
              item,
              input.layout.canvasWidth,
              input.layout.canvasHeight,
              canvasMarginMm,
              getDesignDpi(input.layout),
            );
            return clampItemToCanvasMargin(
              fitted,
              input.layout.canvasWidth,
              input.layout.canvasHeight,
              canvasMarginMm,
              getDesignDpi(input.layout),
            );
          }),
        );
        setSelectedId(null);
        shapeRefs.current.clear();
        setCanvasConfig({
          canvasWidth: input.layout.canvasWidth,
          canvasHeight: input.layout.canvasHeight,
          designDpi: getDesignDpi(input.layout),
          printDpi: getPrintDpi(input.layout),
        });
      },
      [canvasMarginMm],
    );

    const clearCanvas = useCallback(() => {
      setItems([]);
      setSelectedId(null);
      shapeRefs.current.clear();
    }, []);

    const exportLayout = useCallback(async () => {
      const payload = await buildExport();
      onExport?.(payload);
      return payload;
    }, [buildExport, onExport]);

    const clearSelection = useCallback(() => {
      setSelectedId(null);
      const transformer = transformerRef.current;
      if (transformer) {
        transformer.nodes([]);
        transformer.getLayer()?.batchDraw();
      }
    }, []);

    const deleteSelectedItem = useCallback(() => {
      const activeId = selectedIdRef.current;
      if (!activeId) return;

      setItems((current) => {
        const item = current.find((entry) => entry.assetId === activeId);
        if (item?.src.startsWith("blob:")) {
          URL.revokeObjectURL(item.src);
        }
        return current.filter((entry) => entry.assetId !== activeId);
      });
      shapeRefs.current.delete(activeId);
      setSelectedId(null);

      const transformer = transformerRef.current;
      if (transformer) {
        transformer.nodes([]);
        transformer.getLayer()?.batchDraw();
      }
    }, []);

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Delete" && event.key !== "Backspace") return;
        if (!selectedIdRef.current) return;

        const target = event.target;
        if (
          target instanceof HTMLElement &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        ) {
          return;
        }

        event.preventDefault();
        deleteSelectedItem();
      };

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [deleteSelectedItem]);

    const runAutoArrange = useCallback(
      async (options?: AutoArrangeOptions): Promise<boolean> => {
        clearSelection();

        const current = itemsRef.current;
        if (current.length === 0) {
          onAutoArrange?.({ allPlaced: true });
          return true;
        }

        const gapMm = options?.gapMm ?? autoArrangeGapMm;
        const { items: arranged, allPlaced } = await autoArrangeItems(current, {
          gapMm,
          canvasMarginMm: options?.canvasMarginMm ?? canvasMarginMm,
          canvasWidth: options?.canvasWidth ?? canvasConfig.canvasWidth,
          canvasHeight: options?.canvasHeight ?? canvasConfig.canvasHeight,
          designDpi: options?.designDpi ?? canvasConfig.designDpi,
        });

        setItems(arranged);
        onAutoArrange?.({ allPlaced });
        return allPlaced;
      },
      [autoArrangeGapMm, canvasConfig, canvasMarginMm, clearSelection, onAutoArrange],
    );

    useEffect(() => {
      const transformer = transformerRef.current;
      const node = selectedId ? shapeRefs.current.get(selectedId) : undefined;
      if (!transformer) return;

      if (node) {
        transformer.nodes([node]);
      } else {
        transformer.nodes([]);
      }
      transformer.getLayer()?.batchDraw();
    }, [selectedId, items]);

    const updateItem = useCallback((next: PlacedImage) => {
      setItems((current) =>
        current.map((entry) => (entry.assetId === next.assetId ? next : entry)),
      );
    }, []);

    const resizeBoundBoxFunc = useCallback(
      (oldBox: { x: number; y: number; width: number; height: number; rotation: number }, newBox: { x: number; y: number; width: number; height: number; rotation: number }) => {
        if (!selectedItem) {
          return newBox;
        }
        const { minWidthPx, minHeightPx } = getMinResizeDimensionsPx(
          selectedItem.width,
          selectedItem.height,
          minResizeSizeMm,
          canvasConfig.designDpi,
        );
        return clampResizeBox(oldBox, newBox, minWidthPx, minHeightPx);
      },
      [selectedItem, minResizeSizeMm, canvasConfig.designDpi],
    );

    const placeImageSource = useCallback(
      (src: string, mimeType: string, assetId?: string) => {
        const image = new window.Image();
        image.crossOrigin = "anonymous";
        image.src = src;
        image.onload = () => {
          const id = assetId ?? crypto.randomUUID();
          const cutLinePoints = traceAlphaContour(image, image.width, image.height);
          const draft: PlacedImage = {
            assetId: id,
            src,
            mimeType,
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            cutLinePoints,
          };
          const placed = prepareItemForCanvasPlacement(
            draft,
            canvasConfig.canvasWidth,
            canvasConfig.canvasHeight,
            canvasMarginMm,
            canvasConfig.designDpi,
          );
          setItems((current) => [...current, placed]);
          setSelectedId(id);
          if (autoArrangeOnAdd) {
            pendingAutoArrangeRef.current = true;
          }
        };
        image.onerror = () => {
          console.error("Failed to load image:", src);
        };
      },
      [autoArrangeOnAdd, canvasConfig, canvasMarginMm],
    );

    const onDrop = useCallback(
      (acceptedFiles: File[]) => {
        acceptedFiles.forEach((file) => {
          placeImageSource(
            URL.createObjectURL(file),
            file.type || "image/png",
          );
        });
      },
      [placeImageSource],
    );

    const addImagesFromUrls = useCallback(
      (sources: ImageSourceFromUrl[]) => {
        sources.forEach(({ url, mimeType, assetId }) => {
          placeImageSource(url, mimeType ?? "image/png", assetId);
        });
      },
      [placeImageSource],
    );

    const handle = useMemo(
      () => ({
        exportLayout,
        exportLayoutState,
        loadLayoutFromSources,
        clearCanvas,
        arrangeAll: runAutoArrange,
        autoArrange: runAutoArrange,
        addImagesFromUrls,
      }),
      [
        exportLayout,
        exportLayoutState,
        loadLayoutFromSources,
        clearCanvas,
        runAutoArrange,
        addImagesFromUrls,
      ],
    );

    useImperativeHandle(ref, () => handle, [handle]);

    useEffect(() => {
      onReady?.(handle);
    }, [handle, onReady]);

    useEffect(() => {
      if (!autoArrangeOnAdd || !pendingAutoArrangeRef.current) {
        return;
      }

      const timer = window.setTimeout(() => {
        pendingAutoArrangeRef.current = false;
        void runAutoArrange();
      }, 100);

      return () => {
        window.clearTimeout(timer);
      };
    }, [items, autoArrangeOnAdd, runAutoArrange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: { "image/*": [] },
      noClick: items.length > 0,
    });

    const deselect = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (event.target === event.target.getStage()) {
        setSelectedId(null);
      }
    };

    return (
      <div className={className}>
        <div
          {...getRootProps()}
          style={{
            position: "relative",
            display: "inline-block",
            width: canvasConfig.canvasWidth,
            height: canvasConfig.canvasHeight,
            border: "1px dashed #94a3b8",
            borderRadius: 8,
            boxSizing: "content-box",
            overflow: "hidden",
            background: isDragActive ? "#f8fafc" : "#ffffff",
            lineHeight: 0,
            verticalAlign: "top",
          }}
        >
          <input {...getInputProps()} />
          {items.length === 0 ? (
            <p
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: 0,
                padding: 16,
                color: "#64748b",
                fontSize: 14,
                lineHeight: 1.4,
                textAlign: "center",
                pointerEvents: "none",
              }}
            >
              Drop sticker images here to start a layout
            </p>
          ) : null}
          <Stage
            width={canvasConfig.canvasWidth}
            height={canvasConfig.canvasHeight}
            style={{ display: "block" }}
            onMouseDown={deselect}
            onTouchStart={deselect}
          >
            <Layer>
              {showMarginGuide && marginPx > 0 ? (
                <Rect
                  x={marginPx}
                  y={marginPx}
                  width={canvasConfig.canvasWidth - marginPx * 2}
                  height={canvasConfig.canvasHeight - marginPx * 2}
                  stroke={canvasMarginColor}
                  strokeWidth={1}
                  dash={[6, 4]}
                  listening={false}
                />
              ) : null}
              {items.map((item) => (
                <DraggableImage
                  key={item.assetId}
                  item={item}
                  showCutLine={showCutLine}
                  cutLineColor={cutLineColor}
                  minResizeSizeMm={minResizeSizeMm}
                  designDpi={canvasConfig.designDpi}
                  canvasWidth={canvasConfig.canvasWidth}
                  canvasHeight={canvasConfig.canvasHeight}
                  canvasMarginMm={canvasMarginMm}
                  onSelect={() => setSelectedId(item.assetId)}
                  onChange={updateItem}
                  shapeRef={(node) => {
                    if (node) {
                      shapeRefs.current.set(item.assetId, node);
                    } else {
                      shapeRefs.current.delete(item.assetId);
                    }
                  }}
                />
              ))}
              <Transformer
                ref={transformerRef}
                keepRatio
                rotateEnabled
                enabledAnchors={[
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                ]}
                anchorSize={8}
                anchorCornerRadius={2}
                borderStroke={TRANSFORMER_COLOR}
                anchorStroke={TRANSFORMER_COLOR}
                anchorFill="#ffffff"
                rotateAnchorOffset={24}
                boundBoxFunc={resizeBoundBoxFunc}
              />
              {showSelectionDimensions &&
              selectedId &&
              selectedItem &&
              selectionDimensionLabels ? (
                <SelectionDimensionLabels
                  node={shapeRefs.current.get(selectedId)}
                  localWidth={selectedItem.width}
                  localHeight={selectedItem.height}
                  widthLabel={selectionDimensionLabels.width}
                  heightLabel={selectionDimensionLabels.height}
                  color={dimensionLabelColor}
                />
              ) : null}
            </Layer>
          </Stage>
        </div>
      </div>
    );
  },
);
