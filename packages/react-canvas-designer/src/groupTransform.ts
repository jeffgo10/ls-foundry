import {
  getItemAxisAlignedBounds,
  type MarginBoundsItem,
} from "./canvasMargin";

export type PlacedTransform = {
  instanceId: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  width: number;
  height: number;
};

export type ProxyState = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
};

export type GroupTransformSnapshot = {
  items: PlacedTransform[];
  proxy: ProxyState;
};

function transformLocalPoint(
  x: number,
  y: number,
  scaleX: number,
  scaleY: number,
  rotationDeg: number,
  originX: number,
  originY: number,
): { x: number; y: number } {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = x * scaleX;
  const sy = y * scaleY;
  return {
    x: originX + sx * cos - sy * sin,
    y: originY + sx * sin + sy * cos,
  };
}

/** Union AABB for the current selection (stage space). */
export function getSelectionAxisAlignedBox(
  items: readonly MarginBoundsItem[],
): ProxyState | null {
  if (items.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const item of items) {
    const bounds = getItemAxisAlignedBounds(item);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
  };
}

export function proxyCenterStage(proxy: ProxyState): { x: number; y: number } {
  return transformLocalPoint(
    proxy.width / 2,
    proxy.height / 2,
    proxy.scaleX,
    proxy.scaleY,
    proxy.rotation,
    proxy.x,
    proxy.y,
  );
}

/** Apply proxy translate / rotate / scale to every sticker in the snapshot. */
export function applyGroupTransformFromProxy(
  snapshot: GroupTransformSnapshot,
  currentProxy: ProxyState,
): PlacedTransform[] {
  const startCenter = proxyCenterStage(snapshot.proxy);
  const currentCenter = proxyCenterStage(currentProxy);
  const rotDelta = currentProxy.rotation - snapshot.proxy.rotation;
  const scaleRatio =
    snapshot.proxy.scaleX !== 0
      ? currentProxy.scaleX / snapshot.proxy.scaleX
      : 1;

  const rad = (rotDelta * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return snapshot.items.map((item) => {
    const relX = item.x - startCenter.x;
    const relY = item.y - startCenter.y;
    const scaledX = relX * scaleRatio;
    const scaledY = relY * scaleRatio;
    const rotX = scaledX * cos - scaledY * sin;
    const rotY = scaledX * sin + scaledY * cos;

    return {
      ...item,
      x: currentCenter.x + rotX,
      y: currentCenter.y + rotY,
      rotation: item.rotation + rotDelta,
      scaleX: item.scaleX * scaleRatio,
      scaleY: item.scaleY * scaleRatio,
    };
  });
}

export function readProxyState(
  node: {
    x: () => number;
    y: () => number;
    rotation: () => number;
    scaleX: () => number;
    scaleY: () => number;
  },
  width: number,
  height: number,
): ProxyState {
  return {
    x: node.x(),
    y: node.y(),
    width,
    height,
    rotation: node.rotation(),
    scaleX: node.scaleX(),
    scaleY: node.scaleY(),
  };
}
