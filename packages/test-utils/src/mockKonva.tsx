import React, {
  createContext,
  forwardRef,
  useContext,
  useImperativeHandle,
  useRef,
} from "react";

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
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  draggable?: boolean;
  onMouseDown?: unknown;
  onTouchStart?: unknown;
  onDragStart?: unknown;
  onDragMove?: unknown;
  onDragEnd?: unknown;
  onTransformStart?: unknown;
  onTransform?: unknown;
  onTransformEnd?: unknown;
};

export type MockStageApi = {
  width: () => number;
  height: () => number;
  container: () => { getBoundingClientRect: () => DOMRect };
  getPointerPosition: () => { x: number; y: number } | null;
};

export type MockGroupApi = {
  x: (value?: number) => number;
  y: (value?: number) => number;
  scaleX: (value?: number) => number;
  scaleY: (value?: number) => number;
  rotation: (value?: number) => number;
  draggable: (value?: boolean) => boolean;
  stopDrag: () => void;
  fire: (event: string) => void;
  getLayer: () => { batchDraw: () => void } | null;
  getStage: () => MockStageApi | null;
  getAbsoluteTransform: () => {
    copy: () => {
      invert: () => {
        point: (point: { x: number; y: number }) => { x: number; y: number };
      };
    };
  };
};

/** Test helper: read the mock Konva node attached to a `data-konva="Group"` element. */
export function getMockGroupApi(element: Element): MockGroupApi | null {
  return (element as HTMLElement & { __mockKonvaNode?: MockGroupApi }).__mockKonvaNode ?? null;
}

const StageContext = createContext<MockStageApi | null>(null);

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
    x: _x,
    y: _y,
    width: _width,
    height: _height,
    draggable: _draggable,
    onMouseDown: _onMouseDown,
    onTouchStart: _onTouchStart,
    onDragStart: _onDragStart,
    onDragMove: _onDragMove,
    onDragEnd: _onDragEnd,
    onTransformStart: _onTransformStart,
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

export const Stage = forwardRef<MockStageApi, KonvaStubProps>(function StageStub(
  { width = 595, height = 842, children, ...props },
  ref,
) {
  const apiRef = useRef<MockStageApi>({
    width: () => width,
    height: () => height,
    container: () => ({
      getBoundingClientRect: () =>
        ({
          left: 0,
          top: 0,
          width,
          height,
          right: width,
          bottom: height,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect,
    }),
    getPointerPosition: () => ({ x: 50, y: 50 }),
  });

  apiRef.current.width = () => width;
  apiRef.current.height = () => height;

  useImperativeHandle(ref, () => apiRef.current);

  return (
    <StageContext.Provider value={apiRef.current}>
      <div data-konva="Stage" {...stripKonvaProps(props)}>
        {children}
      </div>
    </StageContext.Provider>
  );
});

export const Layer = makeStub("Layer");
export const Image = makeStub("Image");
export const Line = makeStub("Line");
export const Rect = makeStub("Rect");

export const Group = forwardRef<MockGroupApi, KonvaStubProps>(function GroupStub(
  {
    x: xProp = 0,
    y: yProp = 0,
    scaleX: scaleXProp = 1,
    scaleY: scaleYProp = 1,
    rotation: rotationProp = 0,
    draggable: draggableProp = false,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformStart,
    onTransform,
    onTransformEnd,
    ...props
  },
  ref,
) {
  const stage = useContext(StageContext);
  const stateRef = useRef({
    x: xProp,
    y: yProp,
    scaleX: scaleXProp,
    scaleY: scaleYProp,
    rotation: rotationProp,
    draggable: draggableProp,
  });
  const handlersRef = useRef({
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformStart,
    onTransform,
    onTransformEnd,
  });
  handlersRef.current = {
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformStart,
    onTransform,
    onTransformEnd,
  };

  stateRef.current.x = xProp;
  stateRef.current.y = yProp;
  stateRef.current.scaleX = scaleXProp;
  stateRef.current.scaleY = scaleYProp;
  stateRef.current.rotation = rotationProp;
  stateRef.current.draggable = draggableProp;

  const apiRef = useRef<MockGroupApi>({
    x(value?: number) {
      if (value !== undefined) {
        stateRef.current.x = value;
      }
      return stateRef.current.x;
    },
    y(value?: number) {
      if (value !== undefined) {
        stateRef.current.y = value;
      }
      return stateRef.current.y;
    },
    scaleX(value?: number) {
      if (value !== undefined) {
        stateRef.current.scaleX = value;
      }
      return stateRef.current.scaleX;
    },
    scaleY(value?: number) {
      if (value !== undefined) {
        stateRef.current.scaleY = value;
      }
      return stateRef.current.scaleY;
    },
    rotation(value?: number) {
      if (value !== undefined) {
        stateRef.current.rotation = value;
      }
      return stateRef.current.rotation;
    },
    draggable(value?: boolean) {
      if (value !== undefined) {
        stateRef.current.draggable = value;
      }
      return stateRef.current.draggable;
    },
    stopDrag: jest.fn(),
    fire(event: string) {
      const target = apiRef.current;
      const payload = { target, evt: new Event(event) };
      const handlers = handlersRef.current;
      const handlerMap: Record<string, unknown> = {
        dragstart: handlers.onDragStart,
        dragmove: handlers.onDragMove,
        dragend: handlers.onDragEnd,
        transformstart: handlers.onTransformStart,
        transform: handlers.onTransform,
        transformend: handlers.onTransformEnd,
      };
      const handler = handlerMap[event];
      if (typeof handler === "function") {
        handler(payload);
      }
    },
    getLayer: () => ({ batchDraw: jest.fn() }),
    getStage: () => stage,
    getAbsoluteTransform: () => ({
      copy: () => ({
        invert: () => ({
          point: ({ x, y }: { x: number; y: number }) => {
            const { x: nodeX, y: nodeY, scaleX, scaleY, rotation } = stateRef.current;
            const rad = (-rotation * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const dx = x - nodeX;
            const dy = y - nodeY;
            return {
              x: (dx * cos - dy * sin) / scaleX,
              y: (dx * sin + dy * cos) / scaleY,
            };
          },
        }),
      }),
    }),
  });

  useImperativeHandle(ref, () => apiRef.current);

  return (
    <div
      data-konva="Group"
      ref={(element) => {
        if (element) {
          (
            element as HTMLElement & { __mockKonvaNode?: MockGroupApi }
          ).__mockKonvaNode = apiRef.current;
        }
      }}
      {...stripKonvaProps(props)}
    />
  );
});

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
