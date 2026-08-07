import type { CSSProperties, SVGProps } from "react";

import {
  LSM_PATH_INNER_A,
  LSM_PATH_INNER_B,
  LSM_PATH_OUTER,
  LSM_VIEW_BOX,
} from "./paths";
import {
  useFluorescentBlink,
  type UseFluorescentBlinkOptions,
} from "./useFluorescentBlink";

export type LiteShadeMarkProps = Omit<
  SVGProps<SVGSVGElement>,
  "children" | "width" | "height" | "viewBox"
> & {
  /** CSS color via `style.color`; paths use `fill="currentColor"`. */
  color?: string;
  /** SVG `width` and `height`. Default `24`. */
  size?: number | string;
  /**
   * Accessible name when the mark is used alone.
   * Pass `undefined` / omit with `aria-hidden` when decorative next to a wordmark.
   */
  title?: string;
  /**
   * Skip the fluorescent turn-on flicker (paths stay fully lit).
   * Also skipped automatically for reduced-motion / bots via scramble skip env.
   */
  blinkDisabled?: boolean;
  /** Base flicker window in ms before the mark settles on. Default `2000`. */
  blinkDurationMs?: number;
  /** Delay before flicker starts. Default `0`. */
  blinkDelayMs?: number;
};

/**
 * LiteShade Media brand mark as inline SVG (three separate paths for animation).
 * Geometry matches LiteShadeMedia `public/lsm-white.svg` / `lsm-black.svg`.
 *
 * On mount, paths run an unsynced fluorescent blink (CSS keyframes) for ~n seconds,
 * then stay lit — same one-shot idea as scramble reveal on the wordmark.
 */
export function LiteShadeMark({
  size = 24,
  color = "currentColor",
  className,
  title,
  style,
  role,
  "aria-label": ariaLabel,
  "aria-hidden": ariaHidden,
  blinkDisabled = false,
  blinkDurationMs = 2000,
  blinkDelayMs = 0,
  ...svgProps
}: LiteShadeMarkProps) {
  const isDecorative = ariaHidden === true || ariaHidden === "true";
  // Default name when used alone; `undefined` from Brand + aria-hidden stays decorative.
  const resolvedTitle = isDecorative
    ? undefined
    : title === undefined
      ? "LiteShadeMedia"
      : title || undefined;
  const mergedStyle: CSSProperties = { color, ...style };

  const blinkOptions: UseFluorescentBlinkOptions = {
    disabled: blinkDisabled,
    durationMs: blinkDurationMs,
    delayMs: blinkDelayMs,
  };
  const { cssText, blinkAttr } = useFluorescentBlink(blinkOptions);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={LSM_VIEW_BOX}
      width={size}
      height={size}
      className={className}
      style={mergedStyle}
      role={role ?? (resolvedTitle ? "img" : undefined)}
      aria-label={ariaLabel ?? resolvedTitle}
      aria-hidden={ariaHidden}
      {...svgProps}
    >
      {resolvedTitle ? <title>{resolvedTitle}</title> : null}
      {cssText ? <style>{cssText}</style> : null}
      <g className="lsm-mark" data-lsm-mark="" fill="currentColor">
        <path
          data-lsm-path="outer"
          data-lsm-blink={blinkAttr.outer ?? undefined}
          d={LSM_PATH_OUTER}
        />
        <path
          data-lsm-path="inner-a"
          data-lsm-blink={blinkAttr["inner-a"] ?? undefined}
          d={LSM_PATH_INNER_A}
        />
        <path
          data-lsm-path="inner-b"
          data-lsm-blink={blinkAttr["inner-b"] ?? undefined}
          d={LSM_PATH_INNER_B}
        />
      </g>
    </svg>
  );
}
