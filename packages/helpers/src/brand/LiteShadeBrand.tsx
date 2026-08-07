import type { CSSProperties, HTMLAttributes } from "react";

import {
  LiteShadeMark,
  type LiteShadeMarkProps,
} from "./LiteShadeMark";
import {
  LiteShadeWordmark,
  type LiteShadeWordmarkProps,
} from "./LiteShadeWordmark";
import { LSM_BRAND_LABEL } from "./paths";

export type LiteShadeBrandProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "color"
> & {
  /** Applied to mark + wordmark (and root `color`). Default `"currentColor"`. */
  color?: string;
  /** Mark size (width & height). Default `24` (~1.5rem). */
  size?: number | string;
  /** Wordmark text. Default `"LITESHADEMEDIA"`. */
  label?: string;
  /** Render the SVG mark. Default `true`. */
  showMark?: boolean;
  /** Render the wordmark. Default `true`. */
  showWordmark?: boolean;
  /** Flex gap between mark and wordmark. Default `"0.5rem"`. */
  gap?: number | string;
  /** Extra props for {@link LiteShadeMark} (animation classNames, etc.). */
  markProps?: Omit<LiteShadeMarkProps, "size" | "color">;
  /** Extra props for {@link LiteShadeWordmark}. */
  wordmarkProps?: Omit<LiteShadeWordmarkProps, "label" | "color">;
};

/**
 * Combined LiteShade mark + wordmark for headers / nav.
 * Layout matches LiteShadeMedia TopNav brand block (flex, gap, tracking).
 */
export function LiteShadeBrand({
  color = "currentColor",
  size = 24,
  className,
  label = LSM_BRAND_LABEL,
  showMark = true,
  showWordmark = true,
  gap = "0.5rem",
  markProps,
  wordmarkProps,
  style,
  ...rest
}: LiteShadeBrandProps) {
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
        <LiteShadeWordmark label={label} color={color} {...wordmarkProps} />
      ) : null}
    </div>
  );
}
