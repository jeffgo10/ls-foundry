import { useEffect, useState } from "react";

export interface ImageDimensions {
  width: number;
  height: number;
}

export function useImageDimensions(src: string): ImageDimensions {
  const [dimensions, setDimensions] = useState<ImageDimensions>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!src) {
      setDimensions({ width: 0, height: 0 });
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => {
      if (cancelled) return;
      setDimensions({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };

    image.onerror = () => {
      if (cancelled) return;
      setDimensions({ width: 0, height: 0 });
    };

    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return dimensions;
}
