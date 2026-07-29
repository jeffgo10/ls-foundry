import { useEffect, useState } from "react";

import { useScrambleRevealEnvironment } from "./ScrambleRevealProvider";
import { resolveSkipEnvironment } from "./skipEnvironment";

const DEFAULT_SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DEFAULT_TICK_INTERVAL_MS = 42;
/** Hold full scramble before the first character locks. */
const DEFAULT_INITIAL_SCRAMBLE_MS = 480;
/** Delay between each successive character locking in. */
const DEFAULT_CHAR_REVEAL_MS = 68;

export type UseScrambleRevealOptions = {
  /** Wait before the scramble cycle starts. */
  delayMs?: number;
  /** Glyph pool for unresolved characters. */
  charset?: string;
  tickIntervalMs?: number;
  initialScrambleMs?: number;
  charRevealMs?: number;
  /** When true, skip animation and return `text` immediately. */
  disabled?: boolean;
};

export type UseScrambleRevealResult = {
  /** Current frame to render (scrambled or final). */
  displayText: string;
  /** True once every character has locked to `text`. */
  isComplete: boolean;
};

function pickRandomChar(charset: string) {
  return charset[Math.floor(Math.random() * charset.length)] ?? charset[0] ?? "?";
}

function buildScrambledFrame(text: string, revealedCount: number, charset: string) {
  return text
    .split("")
    .map((char, index) => {
      if (char === " ") return " ";
      if (index < revealedCount) return char;
      return pickRandomChar(charset);
    })
    .join("");
}

/**
 * Ticker-style scramble that cycles random glyphs, then locks into `text` left-to-right.
 * Platform-agnostic animation logic — pair with any text element in the consumer.
 *
 * Initial state is always `text` (SSR / first paint). Prefer wrapping the tree in
 * {@link ScrambleRevealProvider} so bot / reduced-motion is checked once; otherwise
 * the hook uses a page-level module cache via {@link resolveSkipEnvironment}.
 */
export function useScrambleReveal(
  text: string,
  options: UseScrambleRevealOptions = {},
): UseScrambleRevealResult {
  const {
    delayMs = 0,
    charset = DEFAULT_SCRAMBLE_CHARS,
    tickIntervalMs = DEFAULT_TICK_INTERVAL_MS,
    initialScrambleMs = DEFAULT_INITIAL_SCRAMBLE_MS,
    charRevealMs = DEFAULT_CHAR_REVEAL_MS,
    disabled = false,
  } = options;

  const environment = useScrambleRevealEnvironment();
  const skipFromEnvironment = environment?.skipAnimation;

  const [displayText, setDisplayText] = useState(text);
  const [isComplete, setIsComplete] = useState(Boolean(disabled));

  useEffect(() => {
    const skipAnimation =
      disabled ||
      (skipFromEnvironment ?? resolveSkipEnvironment());

    if (skipAnimation) {
      setDisplayText(text);
      setIsComplete(true);
      return undefined;
    }

    setDisplayText(buildScrambledFrame(text, 0, charset));
    setIsComplete(false);

    let frameId = 0;
    let lastTickAt = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const elapsedAfterDelay = now - startedAt - delayMs;
      if (elapsedAfterDelay < 0) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      if (now - lastTickAt < tickIntervalMs) {
        frameId = requestAnimationFrame(tick);
        return;
      }
      lastTickAt = now;

      const revealElapsed = Math.max(0, elapsedAfterDelay - initialScrambleMs);
      const revealedCount = Math.min(
        text.length,
        Math.floor(revealElapsed / charRevealMs),
      );

      if (revealedCount >= text.length) {
        setDisplayText(text);
        setIsComplete(true);
        return;
      }

      setDisplayText(buildScrambledFrame(text, revealedCount, charset));
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [
    text,
    delayMs,
    charset,
    tickIntervalMs,
    initialScrambleMs,
    charRevealMs,
    disabled,
    skipFromEnvironment,
  ]);

  return { displayText, isComplete };
}
