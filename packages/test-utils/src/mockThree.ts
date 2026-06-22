import React from "react";

/** Minimal GLTFLoader mock — capture load() callbacks for tests. */
export const mockGltfLoaderLoad = jest.fn();

export function resetThreeMocks(): void {
  mockGltfLoaderLoad.mockReset();
}

/** Register Three.js / GLTFLoader / controls mocks (call at top of test file). */
export function registerThreeMocks(): void {
  jest.mock("three", () => {
    class Vector3 {
      x = 0;
      y = 0;
      z = 0;
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
      set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
      }
      copy(v: Vector3) {
        return this.set(v.x, v.y, v.z);
      }
    }

    class Quaternion {
      identity() {
        return this;
      }
    }

    class Matrix4 {
      copy() {
        return this;
      }
      decompose() {}
      fromArray() {
        return this;
      }
    }

    class Color {
      constructor(_hex?: number) {}
    }

    class Scene {
      background = null;
      add = jest.fn();
    }

    class Group {
      children: unknown[] = [];
      position = new Vector3();
      quaternion = new Quaternion();
      scale = new Vector3(1, 1, 1);
      add = jest.fn((child: unknown) => {
        this.children.push(child);
      });
      traverse = jest.fn();
    }

    class PerspectiveCamera {
      aspect = 1;
      near = 0.01;
      far = 1e6;
      fov = 55;
      position = new Vector3();
      lookAt = jest.fn();
      updateProjectionMatrix = jest.fn();
    }

    class WebGLRenderer {
      domElement = document.createElement("canvas");
      xr = {
        enabled: false,
        isPresenting: false,
        getSession: () => null,
        setReferenceSpaceType: jest.fn(),
        setSession: jest.fn().mockResolvedValue(undefined),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      setPixelRatio = jest.fn();
      setClearColor = jest.fn();
      setSize = jest.fn();
      setAnimationLoop = jest.fn();
      render = jest.fn();
    }

    class Clock {
      getDelta = () => 0.016;
    }

    class AmbientLight {
      constructor() {}
    }

    class DirectionalLight {
      position = new Vector3();
      constructor() {}
    }

    class RingGeometry {
      rotateX = jest.fn();
    }

    class MeshBasicMaterial {}

    class Mesh {
      geometry = { rotateX: jest.fn() };
      matrixAutoUpdate = true;
      visible = true;
      matrix = { fromArray: jest.fn() };
      updateMatrixWorld = jest.fn();
    }

    class Box3 {
      setFromObject = () => this;
      getCenter = () => new Vector3();
      getSize = () => new Vector3(1, 1, 1);
    }

    class Points {}
    class PointsMaterial {
      size = 1;
      needsUpdate = false;
    }
    class MeshStandardMaterial {
      needsUpdate = false;
      vertexColors = false;
    }

    return {
      Scene,
      Group,
      PerspectiveCamera,
      WebGLRenderer,
      Clock,
      AmbientLight,
      DirectionalLight,
      RingGeometry,
      MeshBasicMaterial,
      Mesh,
      Box3,
      Vector3,
      Quaternion,
      Matrix4,
      Color,
      Points,
      PointsMaterial,
      MeshStandardMaterial,
      SRGBColorSpace: "srgb",
      ACESFilmicToneMapping: 1,
    };
  });

  jest.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
    GLTFLoader: jest.fn().mockImplementation(() => ({
      load: mockGltfLoaderLoad,
    })),
  }));

  jest.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
    OrbitControls: jest.fn().mockImplementation(() => ({
      enableDamping: false,
      dampingFactor: 0,
      enablePan: true,
      minPolarAngle: 0,
      maxPolarAngle: Math.PI,
      rotateSpeed: 1,
      zoomSpeed: 1,
      target: { copy: jest.fn() },
      minDistance: 0,
      maxDistance: 0,
      update: jest.fn(),
    })),
  }));

  jest.mock("three/examples/jsm/controls/PointerLockControls.js", () => ({
    PointerLockControls: jest.fn().mockImplementation(() => ({
      isLocked: false,
      lock: jest.fn(),
    })),
  }));
}
