import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";

interface PixelOrthographicCameraProps {
  imageWidth: number;
  imageHeight: number;
}

/**
 * Orthographic camera with frustum 0…width × 0…height (image pixel space).
 * Position at origin so left/right/top/bottom map to world corners; zoom stays 1
 * so R3F resize logic does not crop the image to a quarter viewport.
 */
export function PixelOrthographicCamera({
  imageWidth,
  imageHeight,
}: PixelOrthographicCameraProps) {
  const size = useThree((state) => state.size);
  const set = useThree((state) => state.set);
  const camera = useThree((state) => state.camera);

  useLayoutEffect(() => {
    let orthoCamera = camera;
    if (!(orthoCamera instanceof THREE.OrthographicCamera)) {
      orthoCamera = new THREE.OrthographicCamera(
        0,
        imageWidth,
        imageHeight,
        0,
        -1000,
        1000,
      );
      set({ camera: orthoCamera });
    }

    orthoCamera.left = 0;
    orthoCamera.right = imageWidth;
    orthoCamera.top = imageHeight;
    orthoCamera.bottom = 0;
    orthoCamera.position.set(0, 0, 500);
    orthoCamera.zoom = 1;
    orthoCamera.updateProjectionMatrix();
  }, [camera, imageWidth, imageHeight, set, size.width, size.height]);

  return null;
}
