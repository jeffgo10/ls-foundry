import {
  useState,
  type CSSProperties,
  type ElementType,
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
} from "react";

import { slidingTextGroupProps } from "@jeffgo10/helpers/ui";

import {
  buildLiteShadeBrandHref,
  LSM_BRAND_HOME_URL,
} from "./brandHref";
import {
  LiteShadeMark,
  type LiteShadeMarkProps,
} from "./LiteShadeMark";
import {
  LiteShadeWordmark,
  type LiteShadeWordmarkProps,
  type LiteShadeWordmarkSlideProps,
} from "./LiteShadeWordmark";

const DEFAULT_HOVER_BLINK_MS = 900;

export type LiteShadeBrandProps = Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "color" | "href"
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
  /**
   * Destination URL for the brand root (`<a>`). Default
   * {@link LSM_BRAND_HOME_URL}. Pass `false` to render a non-link `<div>`
   * (e.g. when the consumer already wraps with Next.js `Link`).
   */
  href?: string | false;
  /**
   * Optional referral / campaign code appended as the `ref` query param.
   * Named `referral` so it does not collide with React’s `ref`.
   */
  referral?: string;
  /**
   * On hover / focus-within: wordmark vertical slide + mark fluorescent re-blink.
   * Initial mount scramble / blink still run. Default `true`.
   */
  hoverEffects?: boolean;
  /**
   * Fluorescent window when replaying on hover. Default `900`.
   * Mount still uses `markProps.blinkDurationMs` (default `2000`).
   */
  hoverBlinkDurationMs?: number;
  /** Extra props for {@link LiteShadeMark} (animation classNames, etc.). */
  markProps?: Omit<LiteShadeMarkProps, "size" | "color">;
  /**
   * Extra props for {@link LiteShadeWordmark} (scramble options, className, …).
   * Label is fixed to `LITESHADEMEDIA` and cannot be overridden.
   * Brand sets `slide` unless `hoverEffects` is false.
   */
  wordmarkProps?: Omit<LiteShadeWordmarkProps, "color" | "slide">;
  /** Forwarded to the wordmark {@link SlidingText} when hover slide is on. */
  slideProps?: LiteShadeWordmarkSlideProps;
};

/**
 * Combined LiteShade mark + wordmark for headers / nav.
 * Layout matches LiteShadeMedia TopNav brand block (flex, gap, tracking).
 * Wordmark always reads `LITESHADEMEDIA` with scramble via `useScrambleReveal`.
 * Provide {@link ScrambleRevealProvider} in the consumer app.
 *
 * By default the root is a link to {@link LSM_BRAND_HOME_URL}. Hover (default):
 * sliding wordmark + fluorescent re-blink on the mark, in parallel.
 */
export function LiteShadeBrand({
  color = "currentColor",
  size = 24,
  className,
  showMark = true,
  showWordmark = true,
  gap = "0.5rem",
  href = LSM_BRAND_HOME_URL,
  referral,
  hoverEffects = true,
  hoverBlinkDurationMs = DEFAULT_HOVER_BLINK_MS,
  markProps,
  wordmarkProps,
  slideProps,
  style,
  onMouseEnter,
  onFocus,
  label: _forbiddenLabel,
  ...rest
}: LiteShadeBrandProps) {
  void _forbiddenLabel;
  const [blinkReplayToken, setBlinkReplayToken] = useState(0);

  const isLink = href !== false;
  const resolvedHref = isLink
    ? buildLiteShadeBrandHref(href, referral)
    : undefined;

  const mergedStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap,
    color,
    fontSize: "0.875rem",
    letterSpacing: "0.25em",
    ...(isLink
      ? {
          textDecoration: "none",
          cursor: "pointer",
        }
      : null),
    ...style,
  };

  const markDecorative = showWordmark;
  const blinkDisabled = Boolean(markProps?.blinkDisabled);
  const slideEnabled = hoverEffects && showWordmark;

  const replayHoverBlink = () => {
    if (!hoverEffects || blinkDisabled || !showMark) return;
    setBlinkReplayToken((token) => token + 1);
  };

  const handleMouseEnter = (event: MouseEvent<HTMLElement>) => {
    replayHoverBlink();
    onMouseEnter?.(event);
  };

  const handleFocus = (event: FocusEvent<HTMLElement>) => {
    // Focus on the brand root (or bubbled from a focusable child).
    replayHoverBlink();
    onFocus?.(event);
  };

  const mountBlinkDurationMs = markProps?.blinkDurationMs;
  const resolvedBlinkDurationMs =
    blinkReplayToken > 0
      ? hoverBlinkDurationMs
      : mountBlinkDurationMs;

  const Tag = (isLink ? "a" : "div") as ElementType;

  return (
    <Tag
      className={className}
      style={mergedStyle}
      data-lsm-brand=""
      href={resolvedHref}
      rel={isLink ? "noopener noreferrer" : undefined}
      aria-label={isLink ? "LiteShadeMedia" : undefined}
      {...(hoverEffects ? slidingTextGroupProps : null)}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...rest}
    >
      {showMark ? (
        <LiteShadeMark
          size={size}
          color={color}
          title={markDecorative ? undefined : "LiteShadeMedia"}
          aria-hidden={markDecorative ? true : undefined}
          {...markProps}
          blinkReplayToken={blinkReplayToken}
          blinkDurationMs={resolvedBlinkDurationMs}
        />
      ) : null}
      {showWordmark ? (
        <LiteShadeWordmark
          color={color}
          {...wordmarkProps}
          slide={slideEnabled}
          slideProps={slideProps}
        />
      ) : null}
    </Tag>
  );
}
