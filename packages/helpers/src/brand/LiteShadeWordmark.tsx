import type { CSSProperties, ElementType, HTMLAttributes } from "react";

import {
  useScrambleReveal,
  type UseScrambleRevealOptions,
} from "@jeffgo10/helpers/text";

import { LSM_BRAND_LABEL } from "./paths";

/** Visually hidden but present in the DOM for SEO / a11y (no Tailwind required). */
const visuallyHiddenStyle: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: 0,
};

export type LiteShadeWordmarkProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "color"
> & {
  /** CSS color. Default `"currentColor"`. */
  color?: string;
  /** Element tag. Default `"span"`. */
  as?: "span" | "div" | "p";
  /** Fixed brand string — not overridable. */
  label?: never;
} & Pick<
  UseScrambleRevealOptions,
  | "delayMs"
  | "charset"
  | "tickIntervalMs"
  | "initialScrambleMs"
  | "charRevealMs"
  | "disabled"
>;

/**
 * LiteShade Media wordmark — always `"LITESHADEMEDIA"`, revealed via
 * {@link useScrambleReveal}. Wrap the tree in {@link ScrambleRevealProvider}
 * from `@jeffgo10/helpers/text` in the consumer (not included here).
 */
export function LiteShadeWordmark({
  color = "currentColor",
  className,
  as: Component = "span",
  style,
  delayMs,
  charset,
  tickIntervalMs,
  initialScrambleMs,
  charRevealMs,
  disabled,
  label: _forbiddenLabel,
  ...rest
}: LiteShadeWordmarkProps) {
  void _forbiddenLabel;
  const { displayText } = useScrambleReveal(LSM_BRAND_LABEL, {
    delayMs,
    charset,
    tickIntervalMs,
    initialScrambleMs,
    charRevealMs,
    disabled,
  });

  const Tag = Component as ElementType;
  const mergedStyle: CSSProperties = {
    position: "relative",
    color,
    letterSpacing: "0.25em",
    ...style,
  };

  return (
    <Tag className={className} style={mergedStyle} data-lsm-wordmark="" {...rest}>
      <span style={visuallyHiddenStyle}>{LSM_BRAND_LABEL}</span>
      <span aria-hidden="true">{displayText}</span>
    </Tag>
  );
}
