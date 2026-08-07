/** Stable path ids matching `data-lsm-path` on {@link LiteShadeMark}. */
export type LsmMarkPathId = "outer" | "inner-a" | "inner-b";

export const LSM_MARK_PATH_IDS: readonly LsmMarkPathId[] = [
  "outer",
  "inner-a",
  "inner-b",
] as const;

export type FluorescentBlinkPathConfig = {
  pathId: LsmMarkPathId;
  animationName: string;
  /** Total CSS animation length (ms) — varies per path so blinks stay unsynced. */
  durationMs: number;
  /** Stagger before this path starts flickering (ms). */
  delayMs: number;
};

export type FluorescentBlinkPlan = {
  cssText: string;
  paths: FluorescentBlinkPathConfig[];
};

export type GenerateFluorescentBlinkPlanOptions = {
  /** Unique prefix for `@keyframes` names (e.g. from `useId`). */
  id: string;
  /** Base window for the flicker phase before lights stay on. Default `2000`. */
  durationMs?: number;
  /** Shared delay before any path starts. Default `0`. */
  delayMs?: number;
  /** Injected RNG for tests. */
  random?: () => number;
};

/**
 * Build per-path fluorescent flicker keyframes.
 * Each path gets its own random on/off schedule, duration, and delay so the
 * three facets do not blink in sync. Ends at opacity 1 (tube stays lit).
 */
export function generateFluorescentBlinkPlan(
  options: GenerateFluorescentBlinkPlanOptions,
): FluorescentBlinkPlan {
  const {
    id,
    durationMs = 2000,
    delayMs = 0,
    random = Math.random,
  } = options;

  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  const paths: FluorescentBlinkPathConfig[] = LSM_MARK_PATH_IDS.map((pathId) => {
    // Unsynced: each facet runs a different length ±40% and a small random lead-in.
    const durationScale = 0.65 + random() * 0.7;
    const pathDurationMs = Math.max(400, Math.round(durationMs * durationScale));
    const pathDelayMs = delayMs + Math.round(random() * Math.min(280, durationMs * 0.2));
    const animationName = `lsm-fluoro-${safeId}-${pathId}`;
    return { pathId, animationName, durationMs: pathDurationMs, delayMs: pathDelayMs };
  });

  const cssText = paths
    .map((path) => {
      const keyframes = buildFlickerKeyframes(random);
      return (
        `@keyframes ${path.animationName} {\n${keyframes}\n}\n` +
        `[data-lsm-blink="${path.animationName}"] {\n` +
        `  animation: ${path.animationName} ${path.durationMs}ms step-end ${path.delayMs}ms 1 forwards;\n` +
        `}`
      );
    })
    .join("\n");

  return { cssText, paths };
}

/**
 * Irregular opacity stops — hard on/off/dim like a fluorescent tube warming up.
 * Settles to full brightness for the last ~20% of the timeline.
 */
export function buildFlickerKeyframes(random: () => number = Math.random): string {
  const stops: Array<{ pct: number; opacity: number }> = [
    { pct: 0, opacity: 0 },
  ];

  let pct = 0;
  const flickerUntil = 78 + random() * 8;

  while (pct < flickerUntil) {
    pct += 1.5 + random() * 7;
    if (pct >= flickerUntil) break;

    const roll = random();
    let opacity: number;
    if (roll < 0.42) {
      opacity = 0;
    } else if (roll < 0.62) {
      opacity = 0.08 + random() * 0.22;
    } else if (roll < 0.82) {
      opacity = 0.45 + random() * 0.35;
    } else {
      opacity = 1;
    }

    stops.push({ pct: Math.min(pct, flickerUntil), opacity });
  }

  stops.push({ pct: Math.min(92, flickerUntil + 4), opacity: 1 });
  stops.push({ pct: 100, opacity: 1 });

  return stops
    .map(
      (stop) =>
        `  ${stop.pct.toFixed(2)}% { opacity: ${Number(stop.opacity.toFixed(3))}; }`,
    )
    .join("\n");
}
