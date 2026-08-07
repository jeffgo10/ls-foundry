import type { CSSProperties, SVGProps } from "react";

import {
  LSM_PATH_INNER_A,
  LSM_PATH_INNER_B,
  LSM_PATH_OUTER,
  LSM_VIEW_BOX,
} from "./paths";

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
};

/**
 * LiteShade Media brand mark as inline SVG (three separate paths for animation).
 * Geometry matches LiteShadeMedia `public/lsm-white.svg` / `lsm-black.svg`.
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
      <g className="lsm-mark" data-lsm-mark="" fill="currentColor">
        <path data-lsm-path="outer" d={LSM_PATH_OUTER} />
        <path data-lsm-path="inner-a" d={LSM_PATH_INNER_A} />
        <path data-lsm-path="inner-b" d={LSM_PATH_INNER_B} />
      </g>
    </svg>
  );
}
