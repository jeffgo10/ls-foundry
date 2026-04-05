"use client";

import type { CSSProperties } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

export type GlbViewerViewMode = "orbit" | "space" | "walk";

const DEFAULT_BLOCK_STYLE: CSSProperties = {
  height: "min(70vh, 560px)",
  minHeight: "min(70vh, 560px)",
};

export type GlbViewerProps = {
  /** Public URL, e.g. `/spray.glb` */
  src: string;
  /** Wrapper classes (border, radius, …). */
  className?: string;
  /** Merged over default sizing; set `height` / `minHeight` to override the default block size. */
  style?: CSSProperties;
  /**
   * Use `h-full min-h-0` and skip default block height; parent must define height (flex/grid).
   */
  fitParent?: boolean;
  /** Orbit, space (AR-capable preview), or first-person walk. Default `"orbit"`. */
  viewMode?: GlbViewerViewMode;
  /** Model finished loading and is visible. */
  onLoad?: () => void;
  /** Model failed to load (network / parse / missing file). */
  onError?: (message: string) => void;
  /** Loading state for optional parent UI. */
  onLoadingChange?: (loading: boolean) => void;
  /** `enterAr()` failed (unsupported device, permission, etc.). */
  onArError?: (message: string) => void;
  /** WebXR immersive AR session started or ended. */
  onArSessionChange?: (presenting: boolean) => void;
};

export type GlbViewerHandle = {
  enterAr: () => void;
  exitAr: () => void;
};

type ViewMode = GlbViewerViewMode;

type ViewApi = {
  applyMode: (m: ViewMode) => void;
  startAr: (overlayRoot: HTMLElement | null) => Promise<void>;
  endAr: () => void;
};

function frameCameraToObject(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  controls: OrbitControls
): { center: THREE.Vector3; size: THREE.Vector3; maxDim: number } {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);

  const dist = maxDim * 1.75;
  camera.near = Math.max(maxDim / 2000, 0.001);
  camera.far = Math.max(maxDim * 50, 100);
  camera.fov = 55;
  camera.updateProjectionMatrix();

  camera.position.set(center.x + dist * 0.6, center.y + dist * 0.35, center.z + dist * 0.75);
  camera.lookAt(center);

  controls.target.copy(center);
  controls.minDistance = maxDim * 0.02;
  controls.maxDistance = maxDim * 15;
  controls.update();

  return { center, size, maxDim };
}

async function requestImmersiveArSession(overlayRoot: HTMLElement | null): Promise<XRSession> {
  if (!navigator.xr) {
    throw new Error("WebXR is not available in this browser.");
  }

  const configs: XRSessionInit[] = [
    {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay", "local-floor"],
      ...(overlayRoot ? { domOverlay: { root: overlayRoot } } : {}),
    },
    {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      ...(overlayRoot ? { domOverlay: { root: overlayRoot } } : {}),
    },
    { requiredFeatures: ["hit-test"], optionalFeatures: ["local-floor"] },
    { requiredFeatures: ["hit-test"], optionalFeatures: [] },
  ];

  let lastErr: unknown;
  for (const init of configs) {
    try {
      return await navigator.xr.requestSession("immersive-ar", init);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Could not start AR session.");
}

const GlbViewer = forwardRef<GlbViewerHandle, GlbViewerProps>(function GlbViewer(
  {
    src,
    className = "",
    style,
    fitParent = false,
    viewMode = "orbit",
    onLoad,
    onError,
    onLoadingChange,
    onArError,
    onArSessionChange,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<ViewMode>(viewMode);
  const viewApiRef = useRef<ViewApi | null>(null);

  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  const onLoadingChangeRef = useRef(onLoadingChange);
  const onArErrorRef = useRef(onArError);
  const onArSessionChangeRef = useRef(onArSessionChange);
  onLoadRef.current = onLoad;
  onErrorRef.current = onError;
  onLoadingChangeRef.current = onLoadingChange;
  onArErrorRef.current = onArError;
  onArSessionChangeRef.current = onArSessionChange;

  modeRef.current = viewMode;

  useEffect(() => {
    if (viewMode !== "space") {
      viewApiRef.current?.endAr();
    }
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "walk") {
      document.exitPointerLock?.();
    }
  }, [viewMode]);

  const enterAr = useCallback(() => {
    void viewApiRef.current?.startAr(null);
  }, []);

  const exitAr = useCallback(() => {
    viewApiRef.current?.endAr();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      enterAr,
      exitAr,
    }),
    [enterAr, exitAr]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070708);

    const modelRoot = new THREE.Group();
    scene.add(modelRoot);

    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.04, 0.05, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    reticle.geometry.rotateX(-Math.PI / 2);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1e6);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    renderer.xr.enabled = true;
    renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setClearColor(0x070708, 1);

    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.boxSizing = "border-box";
    canvas.style.zIndex = "1";
    container.appendChild(canvas);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.06;

    const pointerLock = new PointerLockControls(camera, renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(1, 2, 3);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xaaccff, 0.3);
    fill.position.set(-2, 0, -1);
    scene.add(fill);

    const move = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
    };

    let maxDim = 10;
    const moveSpeed = () => maxDim * 0.85;

    const onKeyDown = (e: KeyboardEvent) => {
      if (modeRef.current !== "walk" || !pointerLock.isLocked) return;
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          move.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          move.backward = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          move.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          move.right = true;
          break;
        case "Space":
          e.preventDefault();
          move.up = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          move.down = true;
          break;
        default:
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          move.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          move.backward = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          move.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          move.right = false;
          break;
        case "Space":
          move.up = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          move.down = false;
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const onCanvasClick = () => {
      if (modeRef.current === "walk" && !pointerLock.isLocked) {
        pointerLock.lock();
      }
    };
    renderer.domElement.addEventListener("click", onCanvasClick);

    const clock = new THREE.Clock();
    let hitTestSource: XRHitTestSource | null = null;
    let hitTestSourceRequested = false;
    let xrPlaced = false;
    let activeXRSession: XRSession | null = null;
    const arComposeMat = new THREE.Matrix4();
    const arDecompPos = new THREE.Vector3();
    const arDecompQuat = new THREE.Quaternion();
    const arDecompScale = new THREE.Vector3();

    const onXrSelect = () => {
      if (xrPlaced || !reticle.visible) return;
      xrPlaced = true;
      reticle.updateMatrixWorld(true);
      arComposeMat.copy(reticle.matrixWorld);
      arComposeMat.decompose(modelRoot.position, modelRoot.quaternion, arDecompScale);
      modelRoot.scale.set(1, 1, 1);
      reticle.visible = false;
      hitTestSource?.cancel();
      hitTestSource = null;
    };

    const onSessionStart = () => {
      activeXRSession = renderer.xr.getSession();
      activeXRSession?.addEventListener("select", onXrSelect);
      xrPlaced = false;
      hitTestSourceRequested = false;
      hitTestSource?.cancel();
      hitTestSource = null;
      reticle.visible = false;
      onArSessionChangeRef.current?.(true);
    };

    const onSessionEnd = () => {
      activeXRSession?.removeEventListener("select", onXrSelect);
      activeXRSession = null;
      hitTestSource?.cancel();
      hitTestSource = null;
      hitTestSourceRequested = false;
      xrPlaced = false;
      reticle.visible = false;
      modelRoot.position.set(0, 0, 0);
      modelRoot.quaternion.identity();
      modelRoot.scale.set(1, 1, 1);
      onArSessionChangeRef.current?.(false);
      viewApiRef.current?.applyMode(modeRef.current);
    };

    renderer.xr.addEventListener("sessionstart", onSessionStart);
    renderer.xr.addEventListener("sessionend", onSessionEnd);

    const resize = () => {
      if (!container) return;
      const w = Math.max(1, Math.round(container.clientWidth));
      const h = Math.max(1, Math.round(container.clientHeight));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, true);
    };

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(resize);
    });
    ro.observe(container);
    resize();
    requestAnimationFrame(() => {
      if (!cancelled) resize();
    });

    const startAr = async (overlayRoot: HTMLElement | null) => {
      if (renderer.xr.isPresenting) return;
      try {
        const session = await requestImmersiveArSession(overlayRoot);
        renderer.xr.setReferenceSpaceType("local-floor");
        await renderer.xr.setSession(session);
      } catch (e) {
        onArErrorRef.current?.(e instanceof Error ? e.message : "Could not start AR.");
      }
    };

    const endAr = () => {
      const session = renderer.xr.getSession();
      session?.end();
    };

    const applyMode = (_m: ViewMode) => {
      orbit.enablePan = true;
      orbit.minPolarAngle = 0;
      orbit.maxPolarAngle = Math.PI;
      orbit.rotateSpeed = 1;
      orbit.zoomSpeed = 1;
      if (modelRoot.children.length === 0) {
        orbit.update();
        return;
      }
      const r = frameCameraToObject(camera, modelRoot, orbit);
      maxDim = r.maxDim;
      orbit.update();
    };

    viewApiRef.current = { applyMode, startAr, endAr };

    onLoadingChangeRef.current?.(true);
    const loader = new GLTFLoader();
    loader.load(
      src,
      (gltf) => {
        if (cancelled) return;
        const root = gltf.scene;
        modelRoot.add(root);

        root.traverse((child) => {
          if (child instanceof THREE.Points) {
            child.frustumCulled = false;
            const mat = child.material as THREE.PointsMaterial;
            if (mat && mat.size < 2) {
              mat.size = Math.max(mat.size * 3, 1.25);
              mat.needsUpdate = true;
            }
          }
          if (child instanceof THREE.Mesh) {
            child.frustumCulled = false;
            if (child.material) {
              const mats = Array.isArray(child.material) ? child.material : [child.material];
              mats.forEach((m) => {
                const mat = m as THREE.MeshStandardMaterial;
                if ("vertexColors" in mat && mat.vertexColors) {
                  mat.needsUpdate = true;
                }
              });
            }
          }
        });

        applyMode(modeRef.current);

        resize();
        orbit.update();

        onLoadingChangeRef.current?.(false);
        onLoadRef.current?.();
      },
      undefined,
      () => {
        if (cancelled) return;
        onLoadingChangeRef.current?.(false);
        onErrorRef.current?.(
          `Could not load ${src}. Place the file under public/ (e.g. public/spray.glb) and refresh.`
        );
      }
    );

    renderer.setAnimationLoop((_, frame: XRFrame | undefined) => {
      const delta = Math.min(clock.getDelta(), 0.08);
      const session = renderer.xr.getSession();
      const refSpace = renderer.xr.getReferenceSpace();

      if (renderer.xr.isPresenting && frame && session && refSpace && !xrPlaced) {
        if (!hitTestSourceRequested) {
          hitTestSourceRequested = true;
          session
            .requestReferenceSpace("viewer")
            .then((viewerSpace) => {
              const requestHitTest = session.requestHitTestSource;
              if (!requestHitTest) throw new Error("Hit test not supported");
              return requestHitTest.call(session, { space: viewerSpace });
            })
            .then((source) => {
              hitTestSource = source ?? null;
            })
            .catch(() => {
              hitTestSourceRequested = false;
            });
        }

        if (hitTestSource) {
          const hits = frame.getHitTestResults(hitTestSource);
          if (hits.length > 0) {
            const pose = hits[0].getPose(refSpace);
            if (pose) {
              reticle.matrix.fromArray(pose.transform.matrix);
              reticle.visible = true;
            }
          } else {
            reticle.visible = false;
          }
        }
      }

      if (!renderer.xr.isPresenting) {
        if (modeRef.current === "walk") {
          orbit.enabled = false;
          if (pointerLock.isLocked) {
            const speed = moveSpeed();
            const forward = Number(move.forward) - Number(move.backward);
            const strafe = Number(move.right) - Number(move.left);
            const vertical = Number(move.up) - Number(move.down);
            pointerLock.moveForward(-forward * speed * delta);
            pointerLock.moveRight(strafe * speed * delta);
            camera.position.y += vertical * speed * delta;
          }
        } else {
          orbit.enabled = true;
          orbit.update();
        }
      } else {
        orbit.enabled = false;
      }

      renderer.render(scene, camera);
    });

    return () => {
      cancelled = true;
      onLoadingChangeRef.current?.(false);
      renderer.xr.removeEventListener("sessionstart", onSessionStart);
      renderer.xr.removeEventListener("sessionend", onSessionEnd);
      activeXRSession?.removeEventListener("select", onXrSelect);
      hitTestSource?.cancel();
      renderer.setAnimationLoop(null);
      viewApiRef.current = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("click", onCanvasClick);
      ro.disconnect();
      pointerLock.dispose();
      orbit.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
    };
  }, [src]);

  useEffect(() => {
    viewApiRef.current?.applyMode(viewMode);
  }, [viewMode]);

  const mergedStyle: CSSProperties | undefined = fitParent
    ? { ...style }
    : { ...DEFAULT_BLOCK_STYLE, ...style };

  return (
    <div
      ref={containerRef}
      style={mergedStyle}
      className={`relative isolate w-full min-w-0 bg-[#070708] ${fitParent ? "h-full min-h-0" : ""} ${className}`.trim()}
    />
  );
});

export default GlbViewer;
