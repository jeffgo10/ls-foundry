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
  resizeEnabled?: boolean;
  rotateEnabled?: boolean;
  enabledAnchors?: string[];
  keepRatio?: boolean;
  shouldOverdrawWholeArea?: boolean;
  anchorSize?: number;
  anchorCornerRadius?: number;
  borderStroke?: string;
  borderStrokeWidth?: number;
  anchorStroke?: string;
  anchorFill?: string;
  rotateAnchorOffset?: number;
  anchorStyleFunc?: unknown;
  boundBoxFunc?: unknown;
  onMouseDown?: unknown;
  onTouchStart?: unknown;
  onMouseMove?: unknown;
  onMouseUp?: unknown;
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

export type MockStageNodeApi = MockStageApi & {
  getClassName: () => string;
  getStage: () => MockStageApi;
  fire: (
    event: string,
    payload?: { evt?: Event; cancelBubble?: boolean },
  ) => void;
};

/** Test helper: read the mock Stage node attached to `data-konva="Stage"`. */
export function getMockStageApi(element: Element): MockStageNodeApi | null {
  return (
    (element as HTMLElement & { __mockKonvaStage?: MockStageNodeApi })
      .__mockKonvaStage ?? null
  );
}

export const Stage = forwardRef<MockStageApi, KonvaStubProps>(function StageStub(
  {
    width = 595,
    height = 842,
    children,
    onMouseDown,
    onTouchStart,
    onMouseMove,
    onMouseUp,
    ...props
  },
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

  const handlersRef = useRef({
    onMouseDown,
    onTouchStart,
    onMouseMove,
    onMouseUp,
  });
  handlersRef.current = {
    onMouseDown,
    onTouchStart,
    onMouseMove,
    onMouseUp,
  };

  const stageNodeRef = useRef<MockStageNodeApi | null>(null);
  if (!stageNodeRef.current) {
    stageNodeRef.current = {
      ...apiRef.current,
      getClassName: () => "Stage",
      getStage: () => apiRef.current,
      fire(
        event: string,
        payload?: { evt?: Event; cancelBubble?: boolean },
      ) {
        const target = stageNodeRef.current!;
        const konvaEvent = {
          target,
          evt:
            payload?.evt ??
            new MouseEvent(event === "touchstart" ? "touchstart" : "mousedown", {
              button: 0,
              bubbles: true,
            }),
          cancelBubble: payload?.cancelBubble ?? false,
        };
        const handlers = handlersRef.current;
        const handlerMap: Record<string, unknown> = {
          mousedown: handlers.onMouseDown,
          touchstart: handlers.onTouchStart,
          mousemove: handlers.onMouseMove,
          mouseup: handlers.onMouseUp,
        };
        const handler = handlerMap[event];
        if (typeof handler === "function") {
          handler(konvaEvent);
        }
      },
    };
  } else {
    Object.assign(stageNodeRef.current, apiRef.current);
  }

  useImperativeHandle(ref, () => apiRef.current);

  return (
    <StageContext.Provider value={apiRef.current}>
      <div
        data-konva="Stage"
        ref={(element) => {
          if (element && stageNodeRef.current) {
            (
              element as HTMLElement & { __mockKonvaStage?: MockStageNodeApi }
            ).__mockKonvaStage = stageNodeRef.current;
          }
        }}
        {...stripKonvaProps(props)}
      >
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

export type MockTransformerApi = {
  nodes: (nodes?: unknown[]) => unknown[];
  getLayer: () => { batchDraw: () => void } | null;
  resizeEnabled: (enabled?: boolean) => boolean;
  rotateEnabled: (enabled?: boolean) => boolean;
  enabledAnchors: (anchors?: string[]) => string[];
};

/** Test helper: read the mock Transformer API attached to `data-konva="Transformer"`. */
export function getMockTransformerApi(element: Element): MockTransformerApi | null {
  return (
    (element as HTMLElement & { __mockKonvaTransformer?: MockTransformerApi })
      .__mockKonvaTransformer ?? null
  );
}

export const Transformer = forwardRef<MockTransformerApi, KonvaStubProps>(
  function TransformerStub(props, ref) {
    const resizeEnabledProp = props.resizeEnabled !== false;
    const rotateEnabledProp = props.rotateEnabled !== false;
    const enabledAnchorsProp = Array.isArray(props.enabledAnchors)
      ? (props.enabledAnchors as string[])
      : [
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
        ];

    const stateRef = useRef({
      resizeEnabled: resizeEnabledProp,
      rotateEnabled: rotateEnabledProp,
      enabledAnchors: enabledAnchorsProp,
    });
    stateRef.current.resizeEnabled = resizeEnabledProp;
    stateRef.current.rotateEnabled = rotateEnabledProp;
    stateRef.current.enabledAnchors = enabledAnchorsProp;

    const apiRef = useRef<MockTransformerApi>({
      nodes: jest.fn((nodes?: unknown[]) => nodes ?? []),
      getLayer: () => ({ batchDraw: jest.fn() }),
      resizeEnabled: jest.fn((enabled?: boolean) => {
        if (typeof enabled === "boolean") {
          stateRef.current.resizeEnabled = enabled;
        }
        return stateRef.current.resizeEnabled;
      }),
      rotateEnabled: jest.fn((enabled?: boolean) => {
        if (typeof enabled === "boolean") {
          stateRef.current.rotateEnabled = enabled;
        }
        return stateRef.current.rotateEnabled;
      }),
      enabledAnchors: jest.fn((anchors?: string[]) => {
        if (anchors) {
          stateRef.current.enabledAnchors = anchors;
        }
        return stateRef.current.enabledAnchors;
      }),
    });
    useImperativeHandle(ref, () => apiRef.current);

    return (
      <div
        ref={(el) => {
          if (el) {
            (
              el as HTMLElement & {
                __mockKonvaTransformer?: MockTransformerApi;
              }
            ).__mockKonvaTransformer = apiRef.current;
          }
        }}
        data-konva="Transformer"
        data-resize-enabled={String(stateRef.current.resizeEnabled)}
        data-rotate-enabled={String(stateRef.current.rotateEnabled)}
        data-enabled-anchors={JSON.stringify(stateRef.current.enabledAnchors)}
      />
    );
  },
);
