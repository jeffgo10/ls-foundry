import {
  useCallback,
  useLayoutEffect,
  useState,
  type RefCallback,
} from "react";
import {
  CANVAS_SHELL_BORDER_PX,
  getContainerFitDimensions,
  getFullSizeContainerDimensions,
  type ContainerFitDimensions,
} from "./containerFitScale";

export function useContainerFitScale(
  enabled: boolean,
  canvasWidth: number,
  canvasHeight: number,
): {
  containerRef: RefCallback<HTMLDivElement>;
  fit: ContainerFitDimensions;
  /** False until the container has been measured when `enabled`. */
  isReady: boolean;
} {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [fit, setFit] = useState<ContainerFitDimensions>(() =>
    enabled
      ? getContainerFitDimensions(0, canvasWidth, canvasHeight)
      : getFullSizeContainerDimensions(canvasWidth, canvasHeight),
  );
  const [isReady, setIsReady] = useState(!enabled);

  const containerRef = useCallback<RefCallback<HTMLDivElement>>((element) => {
    setNode(element);
  }, []);

  useLayoutEffect(() => {
    if (!enabled) {
      setFit(getFullSizeContainerDimensions(canvasWidth, canvasHeight));
      setIsReady(true);
      return;
    }

    if (!node) {
      setIsReady(false);
      setFit((prev) =>
        prev.displayScale === 0
          ? prev
          : getContainerFitDimensions(0, canvasWidth, canvasHeight),
      );
      return;
    }

    const update = () => {
      const width = node.clientWidth;
      setFit(
        getContainerFitDimensions(
          width,
          canvasWidth,
          canvasHeight,
          CANVAS_SHELL_BORDER_PX,
        ),
      );
      if (width > 0) {
        setIsReady(true);
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, canvasWidth, canvasHeight, node]);

  return { containerRef, fit, isReady };
}
