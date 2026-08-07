import {
  useId,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import {
  SLIDING_TEXT_DEFAULTS,
  buildSlidingTextCss,
} from "./slidingTextCss";

export type SlidingTextProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "color"
> & {
  /** Label content (string or scrambled display text). */
  children: ReactNode;
  /** Rest-state color. Default `currentColor`. */
  color?: string;
  /** Hover/focus layer color. Default same as `color`. */
  activeColor?: string;
  /** Transform duration in ms. Default `300`. */
  durationMs?: number;
  /** CSS easing. Default `cubic-bezier(0.2, 0.9, 0.2, 1)`. */
  easing?: string;
  /** Vertical slide distance. Default `110%`. */
  slideDistance?: string;
  /**
   * When true, the clip is `aria-hidden` (parent supplies `aria-label`,
   * e.g. while scramble is running).
   */
  decorative?: boolean;
  /** Root element. Default `"span"`. */
  as?: "span" | "div";
};

/**
 * Vertical slide hover/focus label — overflow-clipped dual layers.
 * No Tailwind / Next.js. Self-contained `:hover` / `:focus-visible` / `:focus-within`,
 * plus ancestor `[data-sliding-text-group]` for Link wrappers with index siblings.
 */
export function SlidingText({
  children,
  color = "currentColor",
  activeColor,
  durationMs = SLIDING_TEXT_DEFAULTS.durationMs,
  easing = SLIDING_TEXT_DEFAULTS.easing,
  slideDistance = SLIDING_TEXT_DEFAULTS.slideDistance,
  decorative = false,
  as: Component = "span",
  className,
  style,
  ...rest
}: SlidingTextProps) {
  const reactId = useId();
  const scopeId = reactId.replace(/:/g, "");
  const resolvedActive = activeColor ?? color;
  const cssText = buildSlidingTextCss(scopeId, {
    durationMs,
    easing,
    slideDistance,
  });

  const Tag = Component as ElementType;
  const clipStyle: CSSProperties = {
    position: "relative",
    display: "inline-block",
    height: SLIDING_TEXT_DEFAULTS.clipHeight,
    overflow: "hidden",
    verticalAlign: "bottom",
    lineHeight: SLIDING_TEXT_DEFAULTS.clipHeight,
    ...style,
  };

  return (
    <Tag
      className={className}
      style={clipStyle}
      data-lsm-sliding={scopeId}
      aria-hidden={decorative ? true : undefined}
      {...rest}
    >
      <style>{cssText}</style>
      <span data-lsm-sliding-primary="" style={{ color }}>
        {children}
      </span>
      <span
        data-lsm-sliding-active=""
        style={{ color: resolvedActive }}
        aria-hidden="true"
      >
        {children}
      </span>
    </Tag>
  );
}
