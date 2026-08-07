import type { CSSProperties, HTMLAttributes } from "react";

import {
  LiteShadeMark,
  type LiteShadeMarkProps,
} from "./LiteShadeMark";
import {
  LiteShadeWordmark,
  type LiteShadeWordmarkProps,
} from "./LiteShadeWordmark";

export type LiteShadeBrandProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "color"
> & {
  /** Applied to mark + wordmark (and root `color`). Default `"currentColor"`. */
  color?: string;
  /** Mark size (width & height). Default `24` (~1.5rem). */
  size?: number | string;
  /** Fixed brand string — not overridable (always `LITESHADEMEDIA`). */
  label?: never;
  /** Render the SVG mark. Default `true`. */
  showMark?: boolean;
  /** Render the wordmark. Default `true`. */
  showWordmark?: boolean;
  /** Flex gap between mark and wordmark. Default `"0.5rem"`. */
  gap?: number | string;
  /** Extra props for {@link LiteShadeMark} (animation classNames, etc.). */
  markProps?: Omit<LiteShadeMarkProps, "size" | "color">;
  /**
   * Extra props for {@link LiteShadeWordmark} (scramble options, className, …).
   * Label is fixed to `LITESHADEMEDIA` and cannot be overridden.
   */
  wordmarkProps?: Omit<LiteShadeWordmarkProps, "color">;
};

/**
 * Combined LiteShade mark + wordmark for headers / nav.
 * Layout matches LiteShadeMedia TopNav brand block (flex, gap, tracking).
 * Wordmark always reads `LITESHADEMEDIA` with scramble via `useScrambleReveal`.
 * Provide {@link ScrambleRevealProvider} in the consumer app.
 */
export function LiteShadeBrand({
  color = "currentColor",
  size = 24,
  className,
  showMark = true,
  showWordmark = true,
  gap = "0.5rem",
  markProps,
  wordmarkProps,
  style,
  label: _forbiddenLabel,
  ...rest
}: LiteShadeBrandProps) {
  void _forbiddenLabel;
  const mergedStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap,
    color,
    fontSize: "0.875rem",
    letterSpacing: "0.25em",
    ...style,
  };

  const markDecorative = showWordmark;

  return (
    <div className={className} style={mergedStyle} data-lsm-brand="" {...rest}>
      {showMark ? (
        <LiteShadeMark
          size={size}
          color={color}
          title={markDecorative ? undefined : "LiteShadeMedia"}
          aria-hidden={markDecorative ? true : undefined}
          {...markProps}
        />
      ) : null}
      {showWordmark ? (
        <LiteShadeWordmark color={color} {...wordmarkProps} />
      ) : null}
    </div>
  );
}
