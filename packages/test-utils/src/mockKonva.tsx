import React, { forwardRef, useImperativeHandle, useRef } from "react";

type KonvaStubProps = React.HTMLAttributes<HTMLDivElement> & {
  image?: unknown;
  points?: number[];
  dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number };
  listening?: boolean;
  perfectDrawEnabled?: boolean;
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  rotation?: number;
  stroke?: string;
  strokeWidth?: number;
  dash?: number[];
  strokeScaleEnabled?: boolean;
  closed?: boolean;
  text?: string;
  scaleX?: number;
  scaleY?: number;
  draggable?: boolean;
  onMouseDown?: unknown;
  onTouchStart?: unknown;
  onDragEnd?: unknown;
  onTransform?: unknown;
  onTransformEnd?: unknown;
};

function stripKonvaProps(props: KonvaStubProps) {
  const {
    image: _image,
    points: _points,
    dragBoundFunc: _drag,
    listening: _listening,
    perfectDrawEnabled: _perfectDrawEnabled,
    fill: _fill,
    fontSize: _fontSize,
    fontFamily: _fontFamily,
    rotation: _rotation,
    stroke: _stroke,
    strokeWidth: _strokeWidth,
    dash: _dash,
    strokeScaleEnabled: _strokeScaleEnabled,
    closed: _closed,
    text: _text,
    scaleX: _scaleX,
    scaleY: _scaleY,
    draggable: _draggable,
    onMouseDown: _onMouseDown,
    onTouchStart: _onTouchStart,
    onDragEnd: _onDragEnd,
    onTransform: _onTransform,
    onTransformEnd: _onTransformEnd,
    ...rest
  } = props;
  return rest;
}

function makeStub(name: string) {
  return forwardRef<HTMLDivElement, KonvaStubProps>(function Stub(props, ref) {
    return <div ref={ref} data-konva={name} {...stripKonvaProps(props)} />;
  });
}

export const Stage = makeStub("Stage");
export const Layer = makeStub("Layer");
export const Group = makeStub("Group");
export const Image = makeStub("Image");
export const Line = makeStub("Line");
export const Rect = makeStub("Rect");

export const Text = forwardRef<
  {
    width: () => number;
    height: () => number;
    offsetX: (value: number) => void;
    offsetY: (value: number) => void;
    getLayer: () => { batchDraw: () => void } | null;
  },
  KonvaStubProps
>(function TextStub({ text, ...props }, ref) {
  useImperativeHandle(ref, () => ({
    width: () => String(text ?? "").length * 6,
    height: () => 12,
    offsetX: jest.fn(),
    offsetY: jest.fn(),
    getLayer: () => ({ batchDraw: jest.fn() }),
  }));
  return (
    <div data-konva="Text" {...stripKonvaProps(props)}>
      {text}
    </div>
  );
});

export const Transformer = forwardRef<
  {
    nodes: (nodes?: unknown[]) => unknown[];
    getLayer: () => { batchDraw: () => void } | null;
    resizeEnabled: (enabled?: boolean) => boolean;
    rotateEnabled: (enabled?: boolean) => boolean;
  },
  KonvaStubProps
>(function TransformerStub(_props, ref) {
  const apiRef = useRef({
    nodes: jest.fn((nodes?: unknown[]) => nodes ?? []),
    getLayer: () => ({ batchDraw: jest.fn() }),
    resizeEnabled: jest.fn((enabled = true) => enabled),
    rotateEnabled: jest.fn((enabled = true) => enabled),
  });
  useImperativeHandle(ref, () => apiRef.current);
  return <div data-konva="Transformer" />;
});
