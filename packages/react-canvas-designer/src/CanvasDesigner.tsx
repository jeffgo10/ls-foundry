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
  type OverlapVerifyOptions,
  type OverlapVerifyResult,
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
import { verifyItemOverlaps } from "./overlapVerifier";
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
  constrainMultiSelectBoundBox,
  DEFAULT_MIN_RESIZE_SIZE_MM,
  getMinResizeDimensionsPx,
} from "./resizeConstraints";
import {
  isAdditivePointerEvent,
  isCanvasBackgroundTarget,
  isTransformerTarget,
  primarySelectedId,
  resolveStickerInstanceId,
  toggleShiftSelection,
} from "./selection";
import {
  getMarqueeHitInstanceIds,
  isMarqueeClick,
  mergeMarqueeSelection,
  normalizeMarqueeRect,
  type MarqueeRect,
} from "./marqueeSelection";
import {
  applyTransformerAnchorHitArea,
  CANVAS_INTERACTION_STYLE,
  getTransformerTouchProfile,
} from "./transformerTouch";
import { useContainerFitScale } from "./useContainerFitScale";
import { stagePointerToDesign } from "./stagePointer";
import {
  beginPinchTransformSession,
  canPinchResizeSelection,
  getTouchPairAngleRad,
  getTouchPairDistance,
  getTouchPairFromList,
  isAnyTouchOnElement,
  isPinchResizeTouchCount,
  touchPairCentroidToStage,
  transformFromPinchSession,
  type PinchTransformSession,
  PINCH_LIVE_NODE_EVENT,
} from "./selectedStickerPinch";
import {
  buildGroupDuplicatesToFit,
  type DuplicateFillDirection,
} from "./duplicateFill";
import {
  applyGroupTransformFromProxy,
  getSelectionAxisAlignedBox,
  readProxyState,
  type GroupTransformSnapshot,
  type ProxyState,
} from "./groupTransform";
import { createInstanceId } from "./createInstanceId";

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
  /**
   * Enlarge transformer anchors and hit areas for touch devices.
   * Default: auto-detect coarse pointer / touch.
   */
  touchFriendly?: boolean;
  /**
   * Optional page background drawn inside Konva (non-interactive).
   * Prefer this over a CSS `background-image` on `.konvajs-content` on mobile
   * so long-press does not trigger the browser Save image menu.
   */
  backgroundImageUrl?: string;
  /**
   * Fired when the primary selected sticker changes (last clicked).
   * `null` when nothing is selected. With multi-select, still reports the
   * most recently clicked id so viewport pan can stay disabled while editing.
   */
  onSelectedIdChange?: (selectedId: string | null) => void;
  /** Fired when the full selection set changes (Shift/Ctrl/Cmd multi-select). */
  onSelectedIdsChange?: (selectedIds: string[]) => void;
  /**
   * Scale the canvas down to fit the parent width (never scales above 1).
   * Parent should span the available width, e.g. `width: 100%`.
   */
  fitToContainer?: boolean;
};

export type ImageSourceFromUrl = {
  url: string;
  mimeType?: string;
  /** Library / S3 asset id; a new canvas instanceId is always generated. */
  assetId?: string;
};

export type LayoutLoadInput = {
  layout: CanvasLayout;
  sources: ImageSourceFromUrl[];
};

export type DuplicateFillHandleOptions = {
  /** Cut-line gap in millimeters. Defaults to the designer `autoArrangeGapMm` prop. */
  gapMm?: number;
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
  /**
   * Duplicate the selected sticker(s) to the right until the printable area is full.
   * Multi-select copies the whole selection together as a block each generation.
   * Spacing uses cut-line bounds plus `autoArrangeGapMm` (override via `gapMm`).
   */
  duplicateSelectedHorizontally: (options?: DuplicateFillHandleOptions) => number;
  /**
   * Duplicate the selected sticker(s) downward until the printable area is full.
   * Multi-select copies the whole selection together as a block each generation.
   * Spacing uses cut-line bounds plus `autoArrangeGapMm` (override via `gapMm`).
   */
  duplicateSelectedVertically: (options?: DuplicateFillHandleOptions) => number;
  /**
   * Check whether any sticker cut lines overlap or are closer than `minGapMm`.
   * Highlights offending stickers when violations are found.
   */
  verifyOverlaps: (options?: OverlapVerifyOptions) => Promise<OverlapVerifyResult>;
  /** Clear overlap violation highlights from the canvas. */
  clearOverlapHighlights: () => void;
};

function DraggableImage({
  item,
  showCutLine,
  cutLineColor,
  showOverlapHighlight,
  minResizeSizeMm,
  designDpi,
  canvasWidth,
  canvasHeight,
  canvasMarginMm,
  onSelect,
  onChange,
  shapeRef,
  draggable,
}: {
  item: PlacedImage;
  showCutLine: boolean;
  cutLineColor: string;
  showOverlapHighlight: boolean;
  minResizeSizeMm: number;
  designDpi: number;
  canvasWidth: number;
  canvasHeight: number;
  canvasMarginMm: number;
  onSelect: (additive: boolean) => void;
  onChange: (next: PlacedImage) => void;
  shapeRef: (node: Konva.Group | null) => void;
  draggable: boolean;
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

  const selectOnPress = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const nativeEvent = event.evt;
    if (nativeEvent instanceof MouseEvent && nativeEvent.button !== 0) {
      return;
    }

    event.cancelBubble = true;
    onSelect(isAdditivePointerEvent(nativeEvent));
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

  // Konva dragBoundFunc uses absolute stage coordinates, which diverge from
  // design/layer-local coords when the stage is scaled (fitToContainer). Clamp
  // via dragmove using node.x()/y() instead.
  const handleDragMove = (event: KonvaEventObject<DragEvent>) => {
    const node = event.target as Konva.Group;
    const { x, y } = clampItemPosition(
      marginItem(),
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
  };

  return (
    <Group
      ref={shapeRef}
      x={item.x}
      y={item.y}
      scaleX={item.scaleX}
      scaleY={item.scaleY}
      rotation={item.rotation}
      draggable={draggable}
      onMouseDown={selectOnPress}
      onTouchStart={selectOnPress}
      onDragMove={handleDragMove}
      onDragEnd={(event) => syncFromNode(event.target as Konva.Group)}
      onTransform={(event) => syncFromNode(event.target as Konva.Group)}
      onTransformEnd={(event) => syncFromNode(event.target as Konva.Group)}
    >
      <KonvaImage
        image={image ?? undefined}
        width={item.width}
        height={item.height}
      />
      {showOverlapHighlight && cutLinePoints.length > 0 ? (
        <Line
          points={cutLinePoints}
          closed
          fill="rgba(239, 68, 68, 0.4)"
          listening={false}
        />
      ) : null}
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
      touchFriendly,
      backgroundImageUrl,
      onSelectedIdChange,
      onSelectedIdsChange,
      fitToContainer = false,
    },
    ref,
  ) {
    const [items, setItems] = useState<PlacedImage[]>([]);
    const [overlapHighlightIds, setOverlapHighlightIds] = useState<string[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(
      null,
    );
    const [canvasConfig, setCanvasConfig] = useState({
      canvasWidth: canvasWidthProp ?? CANVAS_WIDTH,
      canvasHeight: canvasHeightProp ?? CANVAS_HEIGHT,
      designDpi: designDpiProp ?? CANVAS_DPI,
      printDpi: printDpiProp ?? PRINT_DPI,
    });
    const shapeRefs = useRef(new Map<string, Konva.Group>());
    const transformerRef = useRef<Konva.Transformer>(null);
    const multiSelectProxyRef = useRef<Konva.Group>(null);
    const groupTransformSnapshotRef = useRef<GroupTransformSnapshot | null>(null);
    const frozenProxyBoxRef = useRef<ProxyState | null>(null);
    const isGroupTransformingRef = useRef(false);
    const [groupTransforming, setGroupTransforming] = useState(false);
    const isMarqueeActiveRef = useRef(false);
    const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
    const marqueeRectRef = useRef<MarqueeRect | null>(null);
    const [marqueeRect, setMarqueeRect] = useState<MarqueeRect | null>(null);
    const [canvasShellReady, setCanvasShellReady] = useState(false);
    const pendingAutoArrangeRef = useRef(false);
    const pinchResizeSessionRef = useRef<PinchTransformSession | null>(null);
    const isPinchResizingRef = useRef(false);
    const pinchWindowCleanupRef = useRef<(() => void) | null>(null);
    const canvasShellRef = useRef<HTMLDivElement>(null);
    const itemsRef = useRef(items);
    itemsRef.current = items;
    const selectedIdsRef = useRef(selectedIds);
    selectedIdsRef.current = selectedIds;
    const onSelectionDimensionsChangeRef = useRef(onSelectionDimensionsChange);
    onSelectionDimensionsChangeRef.current = onSelectionDimensionsChange;
    const onSelectedIdChangeRef = useRef(onSelectedIdChange);
    onSelectedIdChangeRef.current = onSelectedIdChange;
    const onSelectedIdsChangeRef = useRef(onSelectedIdsChange);
    onSelectedIdsChangeRef.current = onSelectedIdsChange;

    const transformerTouchProfile = useMemo(
      () => getTransformerTouchProfile(touchFriendly),
      [touchFriendly],
    );

    const transformerAnchorStyleFunc = useMemo(() => {
      if (!transformerTouchProfile) {
        return undefined;
      }
      const { anchorHitStrokeWidth } = transformerTouchProfile;
      return (anchor: Konva.Rect) => {
        applyTransformerAnchorHitArea(anchor, anchorHitStrokeWidth);
      };
    }, [transformerTouchProfile]);

    useEffect(() => {
      onSelectedIdChangeRef.current?.(primarySelectedId(selectedIds));
      onSelectedIdsChangeRef.current?.(selectedIds);
    }, [selectedIds]);

    useEffect(() => {
      if (!backgroundImageUrl) {
        setBackgroundImage(null);
        return;
      }

      const element = new window.Image();
      element.crossOrigin = "anonymous";
      element.src = backgroundImageUrl;
      element.onload = () => setBackgroundImage(element);
      return () => {
        element.onload = null;
      };
    }, [backgroundImageUrl]);

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
    const { containerRef, fit } = useContainerFitScale(
      fitToContainer,
      canvasConfig.canvasWidth,
      canvasConfig.canvasHeight,
    );
    const shellWidth = fitToContainer
      ? fit.stageDisplayWidth
      : canvasConfig.canvasWidth;
    const shellHeight = fitToContainer
      ? fit.stageDisplayHeight
      : canvasConfig.canvasHeight;

    const selectedIdSet = useMemo(
      () => new Set(selectedIds),
      [selectedIds],
    );
    const multiSelectActive = selectedIds.length > 1;
    const primarySelectedIdValue = primarySelectedId(selectedIds);

    const selectedItem = useMemo(() => {
      if (!primarySelectedIdValue) {
        return null;
      }
      return (
        items.find((item) => item.instanceId === primarySelectedIdValue) ?? null
      );
    }, [items, primarySelectedIdValue]);

    const selectedItems = useMemo(
      () => items.filter((item) => selectedIdSet.has(item.instanceId)),
      [items, selectedIdSet],
    );

    const multiSelectProxyBox = useMemo(() => {
      if (!multiSelectActive) {
        return null;
      }
      return getSelectionAxisAlignedBox(selectedItems);
    }, [multiSelectActive, selectedItems]);

    const activeProxyBox =
      (isGroupTransformingRef.current || groupTransforming) &&
      frozenProxyBoxRef.current
        ? frozenProxyBoxRef.current
        : multiSelectProxyBox;

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
      base.items = items.map(
        ({ instanceId, assetId, x, y, scaleX, scaleY, rotation }) => ({
          instanceId,
          assetId,
          x,
          y,
          scaleX,
          scaleY,
          rotation,
        }),
      );
      return base;
    }, [items, canvasConfig]);

    const buildExport = useCallback(async (): Promise<CanvasLayoutExport> => {
      const assetById = new Map<
        string,
        { assetId: string; mimeType: string; dataUrl: string }
      >();

      for (const item of items) {
        if (assetById.has(item.assetId)) {
          continue;
        }
        const { mimeType, dataUrl } = await blobUrlToDataUrl(item.src);
        assetById.set(item.assetId, {
          assetId: item.assetId,
          mimeType: item.mimeType || mimeType,
          dataUrl,
        });
      }

      return { layout, assets: [...assetById.values()] };
    }, [items, layout]);

    const exportLayoutState = useCallback(() => {
      const assetById = new Map<string, { assetId: string; mimeType: string }>();
      for (const item of items) {
        if (!assetById.has(item.assetId)) {
          assetById.set(item.assetId, { assetId: item.assetId, mimeType: item.mimeType });
        }
      }
      return {
        layout,
        assets: [...assetById.values()],
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
                instanceId: item.instanceId ?? createInstanceId(),
                assetId: item.assetId,
                x: item.x,
                y: item.y,
                scaleX: item.scaleX,
                scaleY: item.scaleY,
                rotation: item.rotation,
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
        setSelectedIds([]);
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
      setSelectedIds([]);
      shapeRefs.current.clear();
    }, []);

    const exportLayout = useCallback(async () => {
      const payload = await buildExport();
      onExport?.(payload);
      return payload;
    }, [buildExport, onExport]);

    const clearSelection = useCallback(() => {
      setSelectedIds([]);
      const transformer = transformerRef.current;
      if (transformer) {
        transformer.nodes([]);
        transformer.getLayer()?.batchDraw();
      }
    }, []);

    const deleteSelectedItems = useCallback(() => {
      const activeIds = selectedIdsRef.current;
      if (activeIds.length === 0) return;

      const idSet = new Set(activeIds);
      setItems((current) => {
        for (const item of current) {
          if (idSet.has(item.instanceId) && item.src.startsWith("blob:")) {
            URL.revokeObjectURL(item.src);
          }
        }
        return current.filter((entry) => !idSet.has(entry.instanceId));
      });
      for (const id of activeIds) {
        shapeRefs.current.delete(id);
      }
      setSelectedIds([]);

      const transformer = transformerRef.current;
      if (transformer) {
        transformer.nodes([]);
        transformer.getLayer()?.batchDraw();
      }
    }, []);

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Delete" && event.key !== "Backspace") return;
        if (selectedIdsRef.current.length === 0) return;

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
        deleteSelectedItems();
      };

      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [deleteSelectedItems]);

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
      if (isGroupTransformingRef.current || isPinchResizingRef.current) {
        return;
      }
      const transformer = transformerRef.current;
      if (!transformer) return;

      if (multiSelectActive) {
        const proxy = multiSelectProxyRef.current;
        transformer.nodes(proxy ? [proxy] : []);
      } else if (selectedIds.length === 1) {
        const node = shapeRefs.current.get(selectedIds[0]!);
        transformer.nodes(node ? [node] : []);
      } else {
        transformer.nodes([]);
      }
      transformer.getLayer()?.batchDraw();
    }, [multiSelectActive, selectedIds, items, activeProxyBox]);

    useEffect(() => {
      if (
        isGroupTransformingRef.current ||
        groupTransforming ||
        !multiSelectActive ||
        !activeProxyBox
      ) {
        return;
      }
      const proxy = multiSelectProxyRef.current;
      if (!proxy) {
        return;
      }
      proxy.position({ x: activeProxyBox.x, y: activeProxyBox.y });
      proxy.rotation(0);
      proxy.scale({ x: 1, y: 1 });
      proxy.getLayer()?.batchDraw();
    }, [groupTransforming, multiSelectActive, activeProxyBox]);

    const clampPlacedTransform = useCallback(
      (draft: PlacedImage): PlacedImage => {
        let rotation = draft.rotation;
        let scaleX = draft.scaleX;
        let scaleY = draft.scaleY;
        const minScaled = clampNodeScale(
          scaleX,
          scaleY,
          draft.width,
          draft.height,
          minResizeSizeMm,
          canvasConfig.designDpi,
        );
        scaleX = minScaled.scaleX;
        scaleY = minScaled.scaleY;

        let working: PlacedImage = { ...draft, scaleX, scaleY, rotation };
        const fitted = fitItemToCanvasArea(
          working,
          canvasConfig.canvasWidth,
          canvasConfig.canvasHeight,
          canvasMarginMm,
          canvasConfig.designDpi,
        );
        scaleX = fitted.scaleX;
        scaleY = fitted.scaleY;
        working = { ...fitted, scaleX, scaleY, rotation };

        const { x, y } = clampItemPosition(
          working,
          canvasConfig.canvasWidth,
          canvasConfig.canvasHeight,
          canvasMarginMm,
          canvasConfig.designDpi,
          { x: draft.x, y: draft.y },
        );
        return { ...working, x, y };
      },
      [canvasConfig, canvasMarginMm, minResizeSizeMm],
    );

    const applyLiveGroupTransform = useCallback(() => {
      const snapshot = groupTransformSnapshotRef.current;
      const proxy = multiSelectProxyRef.current;
      const box = frozenProxyBoxRef.current;
      if (!snapshot || !proxy || !box) {
        return;
      }

      const next = applyGroupTransformFromProxy(
        snapshot,
        readProxyState(proxy, box.width, box.height),
      );

      setItems((current) =>
        current.map((entry) => {
          const updated = next.find((item) => item.instanceId === entry.instanceId);
          if (!updated) {
            return entry;
          }
          return clampPlacedTransform({ ...entry, ...updated });
        }),
      );
    }, [clampPlacedTransform]);

    const beginGroupInteraction = useCallback(() => {
      if (groupTransformSnapshotRef.current) {
        return;
      }
      const proxy = multiSelectProxyRef.current;
      const selected = itemsRef.current.filter((item) =>
        selectedIdsRef.current.includes(item.instanceId),
      );
      const box = getSelectionAxisAlignedBox(selected);
      if (!proxy || !box || selected.length < 2) {
        return;
      }

      frozenProxyBoxRef.current = box;
      isGroupTransformingRef.current = true;
      setGroupTransforming(true);
      groupTransformSnapshotRef.current = {
        items: selected.map((item) => ({
          instanceId: item.instanceId,
          x: item.x,
          y: item.y,
          scaleX: item.scaleX,
          scaleY: item.scaleY,
          rotation: item.rotation,
          width: item.width,
          height: item.height,
        })),
        proxy: readProxyState(proxy, box.width, box.height),
      };
    }, []);

    const endGroupInteraction = useCallback(() => {
      applyLiveGroupTransform();
      const proxy = multiSelectProxyRef.current;
      if (proxy) {
        proxy.rotation(0);
        proxy.scaleX(1);
        proxy.scaleY(1);
      }
      groupTransformSnapshotRef.current = null;
      frozenProxyBoxRef.current = null;
      isGroupTransformingRef.current = false;
      setGroupTransforming(false);
    }, [applyLiveGroupTransform]);

    useEffect(() => {
      const transformer = transformerRef.current;
      const proxy = multiSelectProxyRef.current;
      if (!proxy || !multiSelectActive) {
        return;
      }

      const begin = () => {
        beginGroupInteraction();
      };
      const sync = () => {
        applyLiveGroupTransform();
      };
      const end = () => {
        endGroupInteraction();
      };

      proxy.on("dragstart transformstart", begin);
      proxy.on("dragmove transform", sync);
      proxy.on("dragend transformend", end);

      const back = transformer?.findOne(".back");
      back?.on("dragstart", begin);
      back?.on("dragmove", sync);
      back?.on("dragend", end);
      transformer?.on("transformstart", begin);
      transformer?.on("transform", sync);
      transformer?.on("transformend", end);

      return () => {
        proxy.off("dragstart transformstart", begin);
        proxy.off("dragmove transform", sync);
        proxy.off("dragend transformend", end);
        back?.off("dragstart", begin);
        back?.off("dragmove", sync);
        back?.off("dragend", end);
        transformer?.off("transformstart", begin);
        transformer?.off("transform", sync);
        transformer?.off("transformend", end);
      };
    }, [
      multiSelectActive,
      activeProxyBox,
      beginGroupInteraction,
      applyLiveGroupTransform,
      endGroupInteraction,
    ]);

    const updateItem = useCallback((next: PlacedImage) => {
      setOverlapHighlightIds([]);
      setItems((current) =>
        current.map((entry) =>
          entry.instanceId === next.instanceId ? next : entry,
        ),
      );
    }, []);

    const resizeBoundBoxFunc = useCallback(
      (oldBox: { x: number; y: number; width: number; height: number; rotation: number }, newBox: { x: number; y: number; width: number; height: number; rotation: number }) => {
        if (selectedItems.length === 0) {
          return newBox;
        }
        if (selectedItems.length === 1) {
          const item = selectedItems[0]!;
          const { minWidthPx, minHeightPx } = getMinResizeDimensionsPx(
            item.width,
            item.height,
            minResizeSizeMm,
            canvasConfig.designDpi,
          );
          return clampResizeBox(oldBox, newBox, minWidthPx, minHeightPx);
        }

        return constrainMultiSelectBoundBox(
          oldBox,
          newBox,
          selectedItems,
          minResizeSizeMm,
          canvasConfig.designDpi,
        );
      },
      [selectedItems, minResizeSizeMm, canvasConfig.designDpi],
    );

    const handleSelectItem = useCallback((instanceId: string, additive: boolean) => {
      setSelectedIds((current) =>
        toggleShiftSelection(current, instanceId, additive),
      );
    }, []);

    const detachPinchWindowListeners = useCallback(() => {
      pinchWindowCleanupRef.current?.();
    }, []);

    const beginPinchInteraction = useCallback((node: Konva.Group) => {
      node.stopDrag();
      node.draggable(false);
      const transformer = transformerRef.current;
      if (transformer) {
        transformer.resizeEnabled(false);
        transformer.rotateEnabled(false);
        transformer.getLayer()?.batchDraw();
      }
    }, []);

    const restorePinchInteraction = useCallback(() => {
      const selectedId = selectedIdsRef.current[0];
      const node = selectedId ? shapeRefs.current.get(selectedId) : null;
      if (node) {
        node.draggable(selectedIdsRef.current.length === 1);
      }

      const transformer = transformerRef.current;
      if (transformer) {
        transformer.resizeEnabled(true);
        transformer.rotateEnabled(true);
        transformer.getLayer()?.batchDraw();
      }
    }, []);

    const syncPinchNodeToItems = useCallback(() => {
      const selectedId = selectedIdsRef.current[0];
      if (!selectedId) {
        return;
      }

      const node = shapeRefs.current.get(selectedId);
      const item = itemsRef.current.find((entry) => entry.instanceId === selectedId);
      if (!node || !item) {
        return;
      }

      updateItem(
        clampPlacedTransform({
          ...item,
          x: node.x(),
          y: node.y(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation(),
        }),
      );
    }, [clampPlacedTransform, updateItem]);

    const endPinchResize = useCallback(() => {
      syncPinchNodeToItems();
      restorePinchInteraction();
      pinchResizeSessionRef.current = null;
      isPinchResizingRef.current = false;
      detachPinchWindowListeners();
    }, [
      syncPinchNodeToItems,
      restorePinchInteraction,
      detachPinchWindowListeners,
    ]);

    const tryBeginOrRebasePinchSession = useCallback(
      (touches: TouchList): boolean => {
        if (
          !canPinchResizeSelection(
            Boolean(transformerTouchProfile),
            selectedIdsRef.current.length,
          )
        ) {
          return false;
        }

        const touchPair = getTouchPairFromList(touches);
        if (!touchPair) {
          return false;
        }

        const selectedId = selectedIdsRef.current[0]!;
        const node = shapeRefs.current.get(selectedId);
        const stage = node?.getStage();
        const container = stage?.container();
        if (!node || !stage || !container) {
          return false;
        }

        const containerRect = container.getBoundingClientRect();
        const startPivotStage = touchPairCentroidToStage(
          touchPair,
          containerRect,
          canvasConfig.canvasWidth,
          canvasConfig.canvasHeight,
        );
        const startDistance = getTouchPairDistance(touchPair[0], touchPair[1]);
        const startAngleRad = getTouchPairAngleRad(touchPair[0], touchPair[1]);
        const anchorLocal = node
          .getAbsoluteTransform()
          .copy()
          .invert()
          .point(startPivotStage);
        const session = beginPinchTransformSession(
          startDistance,
          startAngleRad,
          startPivotStage,
          anchorLocal,
          node.scaleX(),
          node.scaleY(),
          node.rotation(),
        );
        if (!session) {
          return false;
        }

        pinchResizeSessionRef.current = session;
        if (!isPinchResizingRef.current) {
          isPinchResizingRef.current = true;
          beginPinchInteraction(node);
        }
        return true;
      },
      [transformerTouchProfile, beginPinchInteraction, canvasConfig.canvasWidth, canvasConfig.canvasHeight],
    );

    const applyPinchResize = useCallback(
      (touches: TouchList) => {
        if (
          !canPinchResizeSelection(
            Boolean(transformerTouchProfile),
            selectedIdsRef.current.length,
          )
        ) {
          return;
        }

        if (!isPinchResizeTouchCount(touches.length)) {
          return;
        }

        if (!pinchResizeSessionRef.current) {
          tryBeginOrRebasePinchSession(touches);
        }

        const session = pinchResizeSessionRef.current;
        if (!session) {
          return;
        }

        const touchPair = getTouchPairFromList(touches);
        if (!touchPair) {
          return;
        }

        const selectedId = selectedIdsRef.current[0]!;
        const item = itemsRef.current.find((entry) => entry.instanceId === selectedId);
        const node = shapeRefs.current.get(selectedId);
        const stage = node?.getStage();
        const container = stage?.container();
        if (!item || !node || !stage || !container) {
          return;
        }

        const containerRect = container.getBoundingClientRect();
        const currentPivotStage = touchPairCentroidToStage(
          touchPair,
          containerRect,
          canvasConfig.canvasWidth,
          canvasConfig.canvasHeight,
        );
        const currentDistance = getTouchPairDistance(touchPair[0], touchPair[1]);
        const currentAngleRad = getTouchPairAngleRad(touchPair[0], touchPair[1]);
        const next = transformFromPinchSession(
          session,
          currentDistance,
          currentAngleRad,
          currentPivotStage,
        );
        const clamped = clampNodeScale(
          next.scaleX,
          next.scaleY,
          item.width,
          item.height,
          minResizeSizeMm,
          canvasConfig.designDpi,
        );
        const positioned = transformFromPinchSession(
          session,
          currentDistance,
          currentAngleRad,
          currentPivotStage,
          clamped,
        );
        const placed = clampPlacedTransform({
          ...item,
          x: positioned.x,
          y: positioned.y,
          scaleX: positioned.scaleX,
          scaleY: positioned.scaleY,
          rotation: positioned.rotation,
        });

        node.x(placed.x);
        node.y(placed.y);
        node.scaleX(placed.scaleX);
        node.scaleY(placed.scaleY);
        node.rotation(placed.rotation);
        node.fire(PINCH_LIVE_NODE_EVENT);
        node.getLayer()?.batchDraw();
      },
      [
        transformerTouchProfile,
        tryBeginOrRebasePinchSession,
        clampPlacedTransform,
        minResizeSizeMm,
        canvasConfig.designDpi,
        canvasConfig.canvasWidth,
        canvasConfig.canvasHeight,
      ],
    );

    const handlePinchTouchEnd = useCallback(
      (touches: TouchList) => {
        if (!isPinchResizingRef.current) {
          return;
        }

        if (isPinchResizeTouchCount(touches.length)) {
          tryBeginOrRebasePinchSession(touches);
          return;
        }

        endPinchResize();
      },
      [tryBeginOrRebasePinchSession, endPinchResize],
    );

    const applyPinchResizeRef = useRef(applyPinchResize);
    applyPinchResizeRef.current = applyPinchResize;
    const handlePinchTouchEndRef = useRef(handlePinchTouchEnd);
    handlePinchTouchEndRef.current = handlePinchTouchEnd;
    const endPinchResizeRef = useRef(endPinchResize);
    endPinchResizeRef.current = endPinchResize;
    const detachPinchWindowListenersRef = useRef(detachPinchWindowListeners);
    detachPinchWindowListenersRef.current = detachPinchWindowListeners;

    const attachPinchWindowListeners = useCallback(() => {
      if (pinchWindowCleanupRef.current) {
        return;
      }

      const onWindowTouchMove = (event: TouchEvent) => {
        if (!isPinchResizingRef.current) {
          return;
        }
        applyPinchResizeRef.current(event.touches);
        event.preventDefault();
      };

      const onWindowTouchEnd = (event: TouchEvent) => {
        if (!isPinchResizingRef.current) {
          return;
        }
        handlePinchTouchEndRef.current(event.touches);
      };

      window.addEventListener("touchmove", onWindowTouchMove, { passive: false });
      window.addEventListener("touchend", onWindowTouchEnd);
      window.addEventListener("touchcancel", onWindowTouchEnd);

      pinchWindowCleanupRef.current = () => {
        window.removeEventListener("touchmove", onWindowTouchMove);
        window.removeEventListener("touchend", onWindowTouchEnd);
        window.removeEventListener("touchcancel", onWindowTouchEnd);
        pinchWindowCleanupRef.current = null;
      };
    }, []);

    const maybeStartPinchFromShell = useCallback(
      (touches: TouchList): boolean => {
        if (!isAnyTouchOnElement(touches, canvasShellRef.current)) {
          return false;
        }
        if (!tryBeginOrRebasePinchSession(touches)) {
          return false;
        }
        attachPinchWindowListeners();
        applyPinchResize(touches);
        return true;
      },
      [tryBeginOrRebasePinchSession, attachPinchWindowListeners, applyPinchResize],
    );

    const maybeStartPinchFromShellRef = useRef(maybeStartPinchFromShell);
    maybeStartPinchFromShellRef.current = maybeStartPinchFromShell;

    useEffect(() => {
      if (!transformerTouchProfile) {
        return;
      }

      const shell = canvasShellRef.current;
      if (!shell) {
        return;
      }

      const onShellTouchStart = (event: TouchEvent) => {
        if (!isPinchResizeTouchCount(event.touches.length)) {
          return;
        }
        if (maybeStartPinchFromShellRef.current(event.touches)) {
          event.preventDefault();
        }
      };

      const onShellTouchMove = (event: TouchEvent) => {
        if (isPinchResizingRef.current) {
          return;
        }
        if (!isPinchResizeTouchCount(event.touches.length)) {
          return;
        }
        if (maybeStartPinchFromShellRef.current(event.touches)) {
          event.preventDefault();
        }
      };

      shell.addEventListener("touchstart", onShellTouchStart, {
        passive: false,
        capture: true,
      });
      shell.addEventListener("touchmove", onShellTouchMove, {
        passive: false,
        capture: true,
      });

      return () => {
        shell.removeEventListener("touchstart", onShellTouchStart, { capture: true });
        shell.removeEventListener("touchmove", onShellTouchMove, { capture: true });
        detachPinchWindowListenersRef.current();
        endPinchResizeRef.current();
      };
    }, [transformerTouchProfile, canvasShellReady]);

    const updateMarqueeRect = useCallback((rect: MarqueeRect | null) => {
      marqueeRectRef.current = rect;
      setMarqueeRect(rect);
    }, []);

    const handleStageMouseDown = useCallback(
      (event: KonvaEventObject<MouseEvent>) => {
        const nativeEvent = event.evt;
        if (!(nativeEvent instanceof MouseEvent) || nativeEvent.button !== 0) {
          return;
        }

        const target = event.target as Konva.Node;
        if (resolveStickerInstanceId(target, shapeRefs.current)) {
          return;
        }
        if (isTransformerTarget(target)) {
          return;
        }
        if (!isCanvasBackgroundTarget(target)) {
          return;
        }

        const stage = target.getStage();
        const pos = stage ? stagePointerToDesign(stage) : null;
        if (!stage || !pos) {
          return;
        }

        isMarqueeActiveRef.current = true;
        marqueeStartRef.current = pos;
        updateMarqueeRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
      },
      [updateMarqueeRect],
    );

    const handleStageMouseMove = useCallback(
      (event: KonvaEventObject<MouseEvent>) => {
        if (!isMarqueeActiveRef.current || !marqueeStartRef.current) {
          return;
        }

        const stage = event.target.getStage();
        const pos = stage ? stagePointerToDesign(stage) : null;
        if (!pos) {
          return;
        }

        updateMarqueeRect(
          normalizeMarqueeRect(
            marqueeStartRef.current.x,
            marqueeStartRef.current.y,
            pos.x,
            pos.y,
          ),
        );
      },
      [updateMarqueeRect],
    );

    const finishMarquee = useCallback(
      (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (!isMarqueeActiveRef.current) {
          return;
        }

        isMarqueeActiveRef.current = false;
        marqueeStartRef.current = null;

        const rect = marqueeRectRef.current;
        updateMarqueeRect(null);

        if (!rect) {
          return;
        }

        if (isMarqueeClick(rect)) {
          setSelectedIds([]);
          return;
        }

        const hitIds = getMarqueeHitInstanceIds(itemsRef.current, rect);
        const additive = isAdditivePointerEvent(event.evt);
        setSelectedIds(
          mergeMarqueeSelection(selectedIdsRef.current, hitIds, additive),
        );
      },
      [updateMarqueeRect],
    );

    useEffect(() => {
      if (!marqueeRect) {
        return;
      }

      const onWindowMouseUp = (nativeEvent: MouseEvent) => {
        finishMarquee({
          evt: nativeEvent,
          target: { getStage: () => null },
        } as KonvaEventObject<MouseEvent>);
      };

      window.addEventListener("mouseup", onWindowMouseUp);
      return () => window.removeEventListener("mouseup", onWindowMouseUp);
    }, [marqueeRect, finishMarquee]);

    const placeImageSource = useCallback(
      (src: string, mimeType: string, assetId?: string) => {
        const image = new window.Image();
        image.crossOrigin = "anonymous";
        image.src = src;
        image.onload = () => {
          const instanceId = createInstanceId();
          const resolvedAssetId = assetId ?? instanceId;
          const cutLinePoints = traceAlphaContour(image, image.width, image.height);
          const draft: PlacedImage = {
            instanceId,
            assetId: resolvedAssetId,
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
          setSelectedIds([instanceId]);
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

    const duplicateSelectedToFit = useCallback(
      (
        direction: DuplicateFillDirection,
        options?: DuplicateFillHandleOptions,
      ): number => {
        const activeIds = selectedIdsRef.current;
        if (activeIds.length === 0) {
          return 0;
        }

        const idOrder = new Map(activeIds.map((id, index) => [id, index]));
        const sources = itemsRef.current
          .filter((entry) => idOrder.has(entry.instanceId))
          .sort(
            (a, b) =>
              (idOrder.get(a.instanceId) ?? 0) -
              (idOrder.get(b.instanceId) ?? 0),
          );
        if (sources.length === 0) {
          return 0;
        }

        const fillOptions = {
          canvasWidth: canvasConfig.canvasWidth,
          canvasHeight: canvasConfig.canvasHeight,
          marginMm: canvasMarginMm,
          designDpi: canvasConfig.designDpi,
          gapMm: options?.gapMm ?? autoArrangeGapMm,
          createInstanceId,
        };

        const { copies, addedCount } = buildGroupDuplicatesToFit(
          sources,
          direction,
          fillOptions,
        );

        if (addedCount === 0) {
          return 0;
        }

        setItems((current) => [...current, ...copies]);
        return addedCount;
      },
      [autoArrangeGapMm, canvasConfig, canvasMarginMm],
    );

    const duplicateSelectedHorizontally = useCallback(
      (options?: DuplicateFillHandleOptions) =>
        duplicateSelectedToFit("horizontal", options),
      [duplicateSelectedToFit],
    );

    const duplicateSelectedVertically = useCallback(
      (options?: DuplicateFillHandleOptions) =>
        duplicateSelectedToFit("vertical", options),
      [duplicateSelectedToFit],
    );

    const clearOverlapHighlights = useCallback(() => {
      setOverlapHighlightIds([]);
    }, []);

    const verifyOverlaps = useCallback(
      async (options?: OverlapVerifyOptions): Promise<OverlapVerifyResult> => {
        const result = await verifyItemOverlaps(itemsRef.current, {
          minGapMm: options?.minGapMm ?? autoArrangeGapMm,
          designDpi: options?.designDpi ?? canvasConfig.designDpi,
        });
        setOverlapHighlightIds(result.overlappingIds);
        return result;
      },
      [autoArrangeGapMm, canvasConfig.designDpi],
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
        duplicateSelectedHorizontally,
        duplicateSelectedVertically,
        verifyOverlaps,
        clearOverlapHighlights,
      }),
      [
        exportLayout,
        exportLayoutState,
        loadLayoutFromSources,
        clearCanvas,
        runAutoArrange,
        addImagesFromUrls,
        duplicateSelectedHorizontally,
        duplicateSelectedVertically,
        verifyOverlaps,
        clearOverlapHighlights,
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
    const { ref: dropzoneRef, ...canvasShellProps } = getRootProps();

    return (
      <div
        ref={fitToContainer ? containerRef : undefined}
        className={className}
        style={fitToContainer ? { width: "100%" } : undefined}
      >
        <div
          {...canvasShellProps}
          ref={(node) => {
            canvasShellRef.current = node;
            setCanvasShellReady(Boolean(node));
            if (typeof dropzoneRef === "function") {
              dropzoneRef(node);
            }
          }}
          data-canvas-designer=""
          onContextMenu={(event) => event.preventDefault()}
          style={{
            position: "relative",
            display: "inline-block",
            width: shellWidth,
            height: shellHeight,
            border: "1px dashed #94a3b8",
            borderRadius: 8,
            boxSizing: "content-box",
            overflow: "hidden",
            background: backgroundImageUrl
              ? isDragActive
                ? "#f8fafc"
                : "transparent"
              : isDragActive
                ? "#f8fafc"
                : "#ffffff",
            lineHeight: 0,
            verticalAlign: "top",
            ...CANVAS_INTERACTION_STYLE,
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
            width={shellWidth}
            height={shellHeight}
            scaleX={fitToContainer ? fit.displayScale : 1}
            scaleY={fitToContainer ? fit.displayScale : 1}
            style={{ display: "block", ...CANVAS_INTERACTION_STYLE }}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={finishMarquee}
            onContextMenu={(event) => event.evt.preventDefault()}
          >
            <Layer>
              {backgroundImage ? (
                <KonvaImage
                  image={backgroundImage}
                  width={canvasConfig.canvasWidth}
                  height={canvasConfig.canvasHeight}
                  listening={false}
                />
              ) : null}
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
                  key={item.instanceId}
                  item={item}
                  showCutLine={showCutLine}
                  cutLineColor={cutLineColor}
                  showOverlapHighlight={overlapHighlightIds.includes(item.instanceId)}
                  minResizeSizeMm={minResizeSizeMm}
                  designDpi={canvasConfig.designDpi}
                  canvasWidth={canvasConfig.canvasWidth}
                  canvasHeight={canvasConfig.canvasHeight}
                  canvasMarginMm={canvasMarginMm}
                  onSelect={(additive) =>
                    handleSelectItem(item.instanceId, additive)
                  }
                  onChange={updateItem}
                  draggable={!multiSelectActive}
                  shapeRef={(node) => {
                    if (node) {
                      shapeRefs.current.set(item.instanceId, node);
                    } else {
                      shapeRefs.current.delete(item.instanceId);
                    }
                  }}
                />
              ))}
              {marqueeRect ? (
                <Rect
                  x={marqueeRect.x}
                  y={marqueeRect.y}
                  width={marqueeRect.width}
                  height={marqueeRect.height}
                  fill="rgba(37, 99, 235, 0.12)"
                  stroke={TRANSFORMER_COLOR}
                  strokeWidth={1}
                  dash={[4, 4]}
                  listening={false}
                />
              ) : null}
              {multiSelectActive && activeProxyBox ? (
                <Group ref={multiSelectProxyRef}>
                  <Rect
                    width={activeProxyBox.width}
                    height={activeProxyBox.height}
                    fill="rgba(0,0,0,0.001)"
                    listening={false}
                  />
                </Group>
              ) : null}
              <Transformer
                ref={transformerRef}
                keepRatio
                rotateEnabled
                shouldOverdrawWholeArea
                enabledAnchors={[
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                ]}
                anchorSize={transformerTouchProfile?.anchorSize ?? 8}
                anchorCornerRadius={2}
                borderStroke={TRANSFORMER_COLOR}
                borderStrokeWidth={transformerTouchProfile?.borderStrokeWidth ?? 1}
                anchorStroke={TRANSFORMER_COLOR}
                anchorFill="#ffffff"
                rotateAnchorOffset={transformerTouchProfile?.rotateAnchorOffset ?? 24}
                anchorStyleFunc={transformerAnchorStyleFunc}
                boundBoxFunc={resizeBoundBoxFunc}
              />
              {showSelectionDimensions &&
              selectedIds.length === 1 &&
              primarySelectedIdValue &&
              selectedItem &&
              selectionDimensionLabels ? (
                <SelectionDimensionLabels
                  node={shapeRefs.current.get(primarySelectedIdValue)}
                  localWidth={selectedItem.width}
                  localHeight={selectedItem.height}
                  widthLabel={selectionDimensionLabels.width}
                  heightLabel={selectionDimensionLabels.height}
                  color={dimensionLabelColor}
                  displayScale={fitToContainer ? fit.displayScale : 1}
                  liveDimensionFormatting={{
                    unit: dimensionUnit,
                    dpi: selectionDpi,
                    decimalPlaces: dimensionDecimalPlaces,
                    formatSelectionDimensions,
                  }}
                />
              ) : null}
            </Layer>
          </Stage>
        </div>
      </div>
    );
  },
);
