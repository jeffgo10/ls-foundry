import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  type CanvasItem,
  type CanvasLayout,
  createEmptyLayout,
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
  Stage,
  Transformer,
} from "react-konva";
import type { CanvasLayoutExport } from "./types";

type PlacedImage = CanvasItem & {
  src: string;
  mimeType: string;
  width: number;
  height: number;
};

export type CanvasDesignerProps = {
  onExport?: (payload: CanvasLayoutExport) => void;
  /** Called when export API is ready (use instead of ref through next/dynamic). */
  onReady?: (api: CanvasDesignerHandle) => void;
  className?: string;
  /** Preview a red cut line along PNG transparency edges (not exported). */
  showCutLine?: boolean;
  cutLineColor?: string;
};

export type CanvasDesignerHandle = {
  exportLayout: () => Promise<CanvasLayoutExport>;
};

function DraggableImage({
  item,
  showCutLine,
  cutLineColor,
  onSelect,
  onChange,
  shapeRef,
}: {
  item: PlacedImage;
  showCutLine: boolean;
  cutLineColor: string;
  onSelect: () => void;
  onChange: (next: PlacedImage) => void;
  shapeRef: (node: Konva.Group | null) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cutLinePoints, setCutLinePoints] = useState<number[]>([]);

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
    if (!image || !showCutLine) {
      setCutLinePoints([]);
      return;
    }
    setCutLinePoints(traceAlphaContour(image, item.width, item.height));
  }, [image, showCutLine, item.width, item.height]);

  const select = (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
    event.cancelBubble = true;
    onSelect();
  };

  const syncFromNode = (node: Konva.Group) => {
    onChange({
      ...item,
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
    });
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
      onMouseDown={select}
      onTouchStart={select}
      onDragEnd={(event) => syncFromNode(event.target as Konva.Group)}
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
    { onExport, onReady, className, showCutLine = false, cutLineColor = "#ef4444" },
    ref,
  ) {
    const [items, setItems] = useState<PlacedImage[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const shapeRefs = useRef(new Map<string, Konva.Group>());
    const transformerRef = useRef<Konva.Transformer>(null);

    const layout = useMemo<CanvasLayout>(() => {
      const base = createEmptyLayout();
      base.items = items.map(({ assetId, x, y, scaleX, scaleY, rotation }) => ({
        assetId,
        x,
        y,
        scaleX,
        scaleY,
        rotation,
      }));
      return base;
    }, [items]);

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

    const exportLayout = useCallback(async () => {
      const payload = await buildExport();
      onExport?.(payload);
      return payload;
    }, [buildExport, onExport]);

    useImperativeHandle(ref, () => ({ exportLayout }), [exportLayout]);

    useEffect(() => {
      onReady?.({ exportLayout });
    }, [exportLayout, onReady]);

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

    const onDrop = useCallback((acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        const src = URL.createObjectURL(file);
        const image = new window.Image();
        image.src = src;
        image.onload = () => {
          const assetId = crypto.randomUUID();
          setItems((current) => [
            ...current,
            {
              assetId,
              src,
              mimeType: file.type || "image/png",
              x: 40,
              y: 40,
              width: image.width,
              height: image.height,
              scaleX: 1,
              scaleY: 1,
              rotation: 0,
            },
          ]);
          setSelectedId(assetId);
        };
      });
    }, []);

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
            border: "1px dashed #94a3b8",
            borderRadius: 8,
            padding: 12,
            background: isDragActive ? "#f8fafc" : "transparent",
          }}
        >
          <input {...getInputProps()} />
          {items.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b" }}>
              Drop sticker images here to start a layout
            </p>
          ) : (
            <p style={{ margin: "0 0 8px", color: "#64748b", fontSize: 13 }}>
              Click an image to select it, then drag corners to resize or the top
              handle to rotate.
              {showCutLine
                ? " Red outlines preview the die-cut line along transparent edges."
                : null}
            </p>
          )}
          <Stage
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={deselect}
            onTouchStart={deselect}
          >
            <Layer>
              {items.map((item) => (
                <DraggableImage
                  key={item.assetId}
                  item={item}
                  showCutLine={showCutLine}
                  cutLineColor={cutLineColor}
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
                rotateEnabled
                enabledAnchors={[
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                ]}
                anchorSize={8}
                anchorCornerRadius={2}
                borderStroke="#2563eb"
                anchorStroke="#2563eb"
                anchorFill="#ffffff"
                rotateAnchorOffset={24}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 8 || newBox.height < 8) {
                    return oldBox;
                  }
                  return newBox;
                }}
              />
            </Layer>
          </Stage>
        </div>
      </div>
    );
  },
);
