"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

export type GlbViewerProps = {
  /** Public URL, e.g. `/spray.glb` */
  src: string;
  className?: string;
};

type ViewMode = "orbit" | "space" | "walk";

type ViewApi = {
  applyMode: (m: ViewMode) => void;
  startAr: (overlayRoot: HTMLElement) => Promise<void>;
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

export default function GlbViewer({ src, className = "" }: GlbViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const arOverlayRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<ViewMode>("orbit");
  const viewApiRef = useRef<ViewApi | null>(null);

  const [mode, setMode] = useState<ViewMode>("orbit");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [xrSupported, setXrSupported] = useState<boolean | null>(null);
  const [arPresenting, setArPresenting] = useState(false);
  const [arError, setArError] = useState<string | null>(null);

  modeRef.current = mode;

  useEffect(() => {
    if (!navigator.xr?.isSessionSupported) {
      setXrSupported(false);
      return;
    }
    navigator.xr
      .isSessionSupported("immersive-ar")
      .then(setXrSupported)
      .catch(() => setXrSupported(false));
  }, []);

  useEffect(() => {
    if (mode !== "space") {
      viewApiRef.current?.endAr();
    }
  }, [mode]);

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

    const onPointerLockChange = () => {
      if (modeRef.current === "walk") {
        if (document.pointerLockElement !== renderer.domElement) {
          setHint("Click the viewport to capture the mouse and look around.");
        } else {
          setHint(null);
        }
      } else {
        setHint(null);
      }
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);

    const onPointerLockError = () => {
      setHint("Could not lock pointer — try clicking again.");
    };
    document.addEventListener("pointerlockerror", onPointerLockError);

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
      setArPresenting(true);
      setArError(null);
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
      setArPresenting(false);
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

    const startAr = async (overlayRoot: HTMLElement) => {
      setArError(null);
      if (renderer.xr.isPresenting) return;
      try {
        const session = await requestImmersiveArSession(overlayRoot);
        renderer.xr.setReferenceSpaceType("local-floor");
        await renderer.xr.setSession(session);
      } catch (e) {
        setArError(e instanceof Error ? e.message : "Could not start AR.");
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

        setLoading(false);
        setError(null);
      },
      undefined,
      () => {
        if (cancelled) return;
        setLoading(false);
        setError(
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
      renderer.xr.removeEventListener("sessionstart", onSessionStart);
      renderer.xr.removeEventListener("sessionend", onSessionEnd);
      activeXRSession?.removeEventListener("select", onXrSelect);
      hitTestSource?.cancel();
      renderer.setAnimationLoop(null);
      viewApiRef.current = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
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
    viewApiRef.current?.applyMode(mode);
  }, [mode]);

  const selectOrbit = useCallback(() => {
    setMode("orbit");
    document.exitPointerLock?.();
    setHint(null);
    setArError(null);
  }, []);

  const selectSpace = useCallback(() => {
    setMode("space");
    document.exitPointerLock?.();
    setHint(null);
    setArError(null);
  }, []);

  const selectWalk = useCallback(() => {
    setMode("walk");
    document.exitPointerLock?.();
    setHint("Click the viewport to capture the mouse and look around.");
  }, []);

  const enterAr = useCallback(() => {
    const overlay = arOverlayRef.current;
    if (!overlay) return;
    void viewApiRef.current?.startAr(overlay);
  }, []);

  const exitAr = useCallback(() => {
    viewApiRef.current?.endAr();
  }, []);

  const modeHint =
    mode === "orbit"
      ? "Drag to rotate · scroll to zoom"
      : mode === "space"
        ? arPresenting
          ? "Aim at a floor or table · tap to place · then move around the object"
          : xrSupported === false
            ? "WebXR AR not available here — try Chrome on Android (HTTPS)"
            : "Preview below · Enter AR to place the object in your room"
        : "WASD move · Space / Shift up / down · mouse to look";

  return (
    <div className={`relative flex flex-col ${className}`}>
      <div
        ref={arOverlayRef}
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-end bg-transparent pb-10 sm:pb-14 transition-opacity duration-200 ${
          arPresenting ? "pointer-events-none opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!arPresenting}
      >
        <div className="pointer-events-auto mx-4 max-w-md rounded-lg border border-white/20 bg-black/75 px-4 py-3 text-center text-[11px] leading-relaxed text-white/80">
          <p>
            Move your phone to find a surface. Tap the screen to place the object. Walk around it in real
            space.
          </p>
          <button
            type="button"
            onClick={exitAr}
            className="mt-3 rounded-full border border-white/25 px-4 py-1.5 text-[10px] tracking-[0.2em] text-white/90 transition hover:bg-white/10"
          >
            EXIT AR
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] tracking-[0.2em] text-white/45">VIEW</span>
        <div className="flex flex-wrap rounded-full border border-white/15 bg-black/40 p-0.5 text-[10px] tracking-[0.18em]">
          <button
            type="button"
            onClick={selectOrbit}
            className={`rounded-full px-2.5 py-1.5 transition sm:px-3 ${
              mode === "orbit" ? "bg-white/15 text-white" : "text-white/55 hover:text-white/80"
            }`}
          >
            ORBIT
          </button>
          <button
            type="button"
            onClick={selectSpace}
            className={`rounded-full px-2.5 py-1.5 transition sm:px-3 ${
              mode === "space" ? "bg-white/15 text-white" : "text-white/55 hover:text-white/80"
            }`}
          >
            SPACE
          </button>
          <button
            type="button"
            onClick={selectWalk}
            className={`rounded-full px-2.5 py-1.5 transition sm:px-3 ${
              mode === "walk" ? "bg-white/15 text-white" : "text-white/55 hover:text-white/80"
            }`}
          >
            WALK
          </button>
        </div>
        <span className="text-[10px] text-white/35">{modeHint}</span>
      </div>

      {mode === "space" && !loading && !error ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={enterAr}
            disabled={xrSupported === false || xrSupported === null || arPresenting}
            className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-[10px] tracking-[0.18em] text-emerald-100/90 transition enabled:hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ENTER AR
          </button>
          {xrSupported === null ? (
            <span className="text-[10px] text-white/35">Checking AR support…</span>
          ) : null}
          {arError ? <span className="text-[10px] text-rose-300/90">{arError}</span> : null}
        </div>
      ) : null}

      <div
        ref={containerRef}
        className="relative isolate z-[1] h-[min(70vh,560px)] w-full max-w-full overflow-hidden rounded-xl border border-white/10 bg-[#070708]"
      >
        {loading ? (
          <div className="absolute inset-0 z-[2] flex items-center justify-center bg-[#070708] text-xs tracking-[0.2em] text-white/40">
            LOADING MODEL…
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-0 z-[2] flex items-center justify-center bg-[#070708] p-6 text-center text-sm text-rose-200/80">
            {error}
          </div>
        ) : null}
        {hint && !error ? (
          <div className="pointer-events-none absolute bottom-4 left-1/2 z-[3] max-w-[90%] -translate-x-1/2 rounded-md bg-black/70 px-3 py-2 text-center text-[11px] text-white/70">
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );
}
