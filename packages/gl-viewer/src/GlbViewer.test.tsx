const mockGltfLoaderLoad = jest.fn();

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
    traverse = jest.fn();
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
    dispose = jest.fn();
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
    enabled: true,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI,
    rotateSpeed: 1,
    zoomSpeed: 1,
    target: { copy: jest.fn() },
    minDistance: 0,
    maxDistance: 0,
    update: jest.fn(),
    dispose: jest.fn(),
  })),
}));

jest.mock("three/examples/jsm/controls/PointerLockControls.js", () => ({
  PointerLockControls: jest.fn().mockImplementation(() => ({
    isLocked: false,
    lock: jest.fn(),
    dispose: jest.fn(),
    moveForward: jest.fn(),
    moveRight: jest.fn(),
  })),
}));

import { render, waitFor } from "@testing-library/react";
import { createRef } from "react";
import GlbViewer, { type GlbViewerHandle } from "./GlbViewer";

describe("GlbViewer", () => {
  beforeEach(() => {
    mockGltfLoaderLoad.mockReset();
    mockGltfLoaderLoad.mockImplementation((_src, onLoad) => {
      onLoad({
        scene: {
          traverse: jest.fn(),
        },
      });
    });
  });

  it("renders container with className", () => {
    const { container } = render(
      <GlbViewer src="/test.glb" className="my-viewer" />,
    );
    expect(container.querySelector(".my-viewer")).toBeInTheDocument();
  });

  it("calls onLoadingChange and onLoad when model loads", async () => {
    const onLoadingChange = jest.fn();
    const onLoad = jest.fn();
    render(
      <GlbViewer
        src="/test.glb"
        onLoadingChange={onLoadingChange}
        onLoad={onLoad}
      />,
    );
    await waitFor(() => expect(onLoadingChange).toHaveBeenCalledWith(true));
    await waitFor(() => expect(onLoad).toHaveBeenCalled());
    await waitFor(() => expect(onLoadingChange).toHaveBeenCalledWith(false));
  });

  it("calls onError when loader fails", async () => {
    mockGltfLoaderLoad.mockImplementation((_src, _onLoad, _progress, onError) => {
      onError(new Error("load failed"));
    });
    const onError = jest.fn();
    render(<GlbViewer src="/missing.glb" onError={onError} />);
    await waitFor(() => expect(onError).toHaveBeenCalled());
  });

  it("exposes enterAr and exitAr on ref", async () => {
    const ref = createRef<GlbViewerHandle>();
    render(<GlbViewer ref={ref} src="/test.glb" viewMode="space" />);
    await waitFor(() => expect(ref.current).toBeTruthy());
    expect(() => ref.current!.enterAr()).not.toThrow();
    expect(() => ref.current!.exitAr()).not.toThrow();
  });

  it("applies fitParent styles", () => {
    const { container } = render(
      <GlbViewer src="/test.glb" fitParent className="fill" />,
    );
    const wrapper = container.querySelector(".fill") as HTMLElement;
    expect(wrapper.style.height).toBe("");
  });
});
