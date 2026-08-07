import { useEffect, useId, useState } from "react";

import {
  resolveSkipEnvironment,
  useScrambleRevealEnvironment,
} from "@jeffgo10/helpers/text";

import {
  generateFluorescentBlinkPlan,
  type FluorescentBlinkPlan,
  type LsmMarkPathId,
} from "./fluorescentBlink";

export type UseFluorescentBlinkOptions = {
  /** Skip flicker; paths stay fully lit. */
  disabled?: boolean;
  /** Base flicker window in ms before tubes settle on. Default `2000`. */
  durationMs?: number;
  /** Delay before flicker starts (all paths). Default `0`. */
  delayMs?: number;
  /**
   * Bump to replay the fluorescent blink (e.g. brand hover).
   * Included in keyframe names so CSS animations restart cleanly.
   */
  replayToken?: number;
};

export type UseFluorescentBlinkResult = {
  /** Injected `<style>` contents, or `null` when skipped / not yet started. */
  cssText: string | null;
  /** `data-lsm-blink` value per path, or `null` when not animating. */
  blinkAttr: Record<LsmMarkPathId, string | null>;
  /** True after skip, or after the longest path animation would finish. */
  isComplete: boolean;
};

const IDLE_BLINK: Record<LsmMarkPathId, string | null> = {
  outer: null,
  "inner-a": null,
  "inner-b": null,
};

/**
 * One-shot fluorescent turn-on for the three mark paths (mount only).
 * Respects {@link ScrambleRevealProvider} / reduced-motion / bots like scramble.
 */
export function useFluorescentBlink(
  options: UseFluorescentBlinkOptions = {},
): UseFluorescentBlinkResult {
  const {
    disabled = false,
    durationMs = 2000,
    delayMs = 0,
    replayToken = 0,
  } = options;
  const reactId = useId();
  const environment = useScrambleRevealEnvironment();
  const skipFromEnvironment = environment?.skipAnimation;

  const [plan, setPlan] = useState<FluorescentBlinkPlan | null>(null);
  const [isComplete, setIsComplete] = useState(Boolean(disabled));

  useEffect(() => {
    const skipAnimation =
      disabled || (skipFromEnvironment ?? resolveSkipEnvironment());

    if (skipAnimation) {
      setPlan(null);
      setIsComplete(true);
      return undefined;
    }

    const next = generateFluorescentBlinkPlan({
      // Token in id → unique @keyframes names so replay restarts CSS animation.
      id: `${reactId}-r${replayToken}`,
      durationMs,
      delayMs,
    });
    setPlan(next);
    setIsComplete(false);

    const longest = next.paths.reduce(
      (max, path) => Math.max(max, path.delayMs + path.durationMs),
      0,
    );
    const timer = window.setTimeout(() => {
      setIsComplete(true);
    }, longest + 32);

    return () => {
      window.clearTimeout(timer);
    };
  }, [disabled, durationMs, delayMs, reactId, replayToken, skipFromEnvironment]);

  if (!plan) {
    return { cssText: null, blinkAttr: IDLE_BLINK, isComplete };
  }

  const blinkAttr = {
    outer: null,
    "inner-a": null,
    "inner-b": null,
  } as Record<LsmMarkPathId, string | null>;

  for (const path of plan.paths) {
    blinkAttr[path.pathId] = path.animationName;
  }

  return {
    cssText: plan.cssText,
    blinkAttr,
    isComplete,
  };
}
