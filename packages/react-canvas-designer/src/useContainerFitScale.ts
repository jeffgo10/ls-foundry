import { useEffect, useRef, useState, type RefObject } from "react";
import {
  CANVAS_SHELL_BORDER_PX,
  getContainerFitDimensions,
  type ContainerFitDimensions,
} from "./containerFitScale";

export function useContainerFitScale(
  enabled: boolean,
  canvasWidth: number,
  canvasHeight: number,
): {
  containerRef: RefObject<HTMLDivElement | null>;
  fit: ContainerFitDimensions;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<ContainerFitDimensions>(() =>
    getContainerFitDimensions(0, canvasWidth, canvasHeight),
  );

  useEffect(() => {
    if (!enabled) {
      setFit(getContainerFitDimensions(0, canvasWidth, canvasHeight));
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    const update = () => {
      setFit(
        getContainerFitDimensions(
          node.clientWidth,
          canvasWidth,
          canvasHeight,
          CANVAS_SHELL_BORDER_PX,
        ),
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, canvasWidth, canvasHeight]);

  return { containerRef, fit };
}
