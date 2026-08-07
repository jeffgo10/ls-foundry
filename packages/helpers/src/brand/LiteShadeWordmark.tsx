import type { CSSProperties, ElementType, HTMLAttributes } from "react";

import { LSM_BRAND_LABEL } from "./paths";

export type LiteShadeWordmarkProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "color"
> & {
  /** Brand string. Default `"LITESHADEMEDIA"`. */
  label?: string;
  /** CSS color. Default `"currentColor"`. */
  color?: string;
  /** Element tag. Default `"span"`. */
  as?: "span" | "div" | "p";
};

/**
 * Static LiteShade Media wordmark. Scramble animation stays a consumer concern
 * (`@jeffgo10/helpers/text`).
 */
export function LiteShadeWordmark({
  label = LSM_BRAND_LABEL,
  color = "currentColor",
  className,
  as: Component = "span",
  style,
  ...rest
}: LiteShadeWordmarkProps) {
  const Tag = Component as ElementType;
  const mergedStyle: CSSProperties = {
    color,
    letterSpacing: "0.25em",
    ...style,
  };

  return (
    <Tag className={className} style={mergedStyle} data-lsm-wordmark="" {...rest}>
      {label}
    </Tag>
  );
}
