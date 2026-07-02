import type Konva from "konva";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Text } from "react-konva";
import type { DimensionUnit } from "@jeffgo10/shared-types";
import { PINCH_LIVE_NODE_EVENT } from "./selectedStickerPinch";
import {
  formatDimensionAxisValue,
  getSelectionDimensions,
  type FormatSelectionDimensions,
} from "./selectionDimensions";

const LABEL_FONT_SIZE = 10;
const LABEL_OFFSET = 6;

type Point = {
  x: number;
  y: number;
};

type LabelPlacement = Point & {
  rotation: number;
};

type OrientedPlacements = {
  width: LabelPlacement;
  height: LabelPlacement;
};

type SelectionDimensionLabelsProps = {
  node: Konva.Group | undefined;
  localWidth: number;
  localHeight: number;
  widthLabel: string;
  heightLabel: string;
  color?: string;
  /** Re-read scale from the node on pinchlive + transform events. */
  liveDimensionFormatting?: {
    unit: DimensionUnit;
    dpi: number;
    decimalPlaces: number;
    formatSelectionDimensions?: FormatSelectionDimensions;
  };
};

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

function angleDeg(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function offsetFromCenter(
  center: Point,
  edgeMid: Point,
  offset: number,
): Point {
  const dx = edgeMid.x - center.x;
  const dy = edgeMid.y - center.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: edgeMid.x + (dx / length) * offset,
    y: edgeMid.y + (dy / length) * offset,
  };
}

/** Map width/height labels to the rotated sticker edges (matches Konva Transformer). */
function getOrientedLabelPlacements(
  node: Konva.Group,
  localWidth: number,
  localHeight: number,
  offset: number,
): OrientedPlacements {
  const transform = node.getAbsoluteTransform();
  const toStage = (x: number, y: number) => transform.point({ x, y });

  const topRight = toStage(localWidth, 0);
  const bottomRight = toStage(localWidth, localHeight);
  const bottomLeft = toStage(0, localHeight);
  const center = toStage(localWidth / 2, localHeight / 2);

  const bottomMid = midpoint(bottomLeft, bottomRight);
  const rightMid = midpoint(topRight, bottomRight);

  const widthPos = offsetFromCenter(center, bottomMid, offset);
  const heightPos = offsetFromCenter(center, rightMid, offset);

  return {
    width: {
      ...widthPos,
      rotation: angleDeg(bottomLeft, bottomRight),
    },
    height: {
      ...heightPos,
      rotation: angleDeg(topRight, bottomRight),
    },
  };
}

function AxisLabel({
  x,
  y,
  text,
  rotation = 0,
  color,
}: {
  x: number;
  y: number;
  text: string;
  rotation?: number;
  color: string;
}) {
  const textRef = useRef<Konva.Text>(null);

  useLayoutEffect(() => {
    const label = textRef.current;
    if (!label) return;

    label.offsetX(label.width() / 2);
    label.offsetY(label.height() / 2);
    label.getLayer()?.batchDraw();
  }, [text, x, y, rotation]);

  return (
    <Text
      ref={textRef}
      x={x}
      y={y}
      text={text}
      fontSize={LABEL_FONT_SIZE}
      fill={color}
      fontFamily="system-ui, -apple-system, sans-serif"
      rotation={rotation}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}

export function SelectionDimensionLabels({
  node,
  localWidth,
  localHeight,
  widthLabel,
  heightLabel,
  color = "#2563eb",
  liveDimensionFormatting,
}: SelectionDimensionLabelsProps) {
  const [placements, setPlacements] = useState<OrientedPlacements>({
    width: { x: 0, y: 0, rotation: 0 },
    height: { x: 0, y: 0, rotation: 0 },
  });
  const [axisLabels, setAxisLabels] = useState({
    width: widthLabel,
    height: heightLabel,
  });

  useEffect(() => {
    setAxisLabels({ width: widthLabel, height: heightLabel });
  }, [widthLabel, heightLabel]);

  useEffect(() => {
    if (!node) {
      return;
    }

    const update = () => {
      setPlacements(
        getOrientedLabelPlacements(node, localWidth, localHeight, LABEL_OFFSET),
      );

      if (liveDimensionFormatting) {
        const widthPx = localWidth * Math.abs(node.scaleX());
        const heightPx = localHeight * Math.abs(node.scaleY());
        const dimensions = getSelectionDimensions(
          widthPx,
          heightPx,
          liveDimensionFormatting.unit,
          liveDimensionFormatting.dpi,
          liveDimensionFormatting.decimalPlaces,
          liveDimensionFormatting.formatSelectionDimensions,
        );
        setAxisLabels({
          width: formatDimensionAxisValue(
            dimensions.width,
            dimensions.unit,
            liveDimensionFormatting.decimalPlaces,
          ),
          height: formatDimensionAxisValue(
            dimensions.height,
            dimensions.unit,
            liveDimensionFormatting.decimalPlaces,
          ),
        });
      }
    };

    update();
    const events = [
      "transform",
      "dragmove",
      "dragend",
      "transformend",
      PINCH_LIVE_NODE_EVENT,
    ] as const;
    for (const event of events) {
      node.on(event, update);
    }

    return () => {
      for (const event of events) {
        node.off(event, update);
      }
    };
  }, [node, localWidth, localHeight, liveDimensionFormatting]);

  if (!node) {
    return null;
  }

  return (
    <>
      <AxisLabel
        x={placements.width.x}
        y={placements.width.y}
        text={axisLabels.width}
        rotation={placements.width.rotation}
        color={color}
      />
      <AxisLabel
        x={placements.height.x}
        y={placements.height.y}
        text={axisLabels.height}
        rotation={placements.height.rotation}
        color={color}
      />
    </>
  );
}
