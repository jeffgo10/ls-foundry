import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

interface BackgroundPlaneProps {
  displayCanvasSrc: string;
  imageWidth: number;
  imageHeight: number;
}

export function BackgroundPlane({
  displayCanvasSrc,
  imageWidth,
  imageHeight,
}: BackgroundPlaneProps) {
  const texture = useTexture(displayCanvasSrc);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return () => {
      texture.dispose();
    };
  }, [texture]);

  const geometry = useMemo(
    () => new THREE.PlaneGeometry(imageWidth, imageHeight),
    [imageWidth, imageHeight],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh
      position={[imageWidth / 2, imageHeight / 2, 0]}
      geometry={geometry}
      renderOrder={0}
    >
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
