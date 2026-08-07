import {
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type MouseEvent,
  type FocusEvent,
} from "react";

import { slidingTextGroupProps } from "@jeffgo10/helpers/ui";

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
 * Hover (default): sliding wordmark + fluorescent re-blink on the mark, in parallel.
 */
export function LiteShadeBrand({
  color = "currentColor",
  size = 24,
  className,
  showMark = true,
  showWordmark = true,
  gap = "0.5rem",
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
  const blinkDisabled = Boolean(markProps?.blinkDisabled);
  const slideEnabled = hoverEffects && showWordmark;

  const replayHoverBlink = () => {
    if (!hoverEffects || blinkDisabled || !showMark) return;
    setBlinkReplayToken((token) => token + 1);
  };

  const handleMouseEnter = (event: MouseEvent<HTMLDivElement>) => {
    replayHoverBlink();
    onMouseEnter?.(event);
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    // Focus on the brand root (or bubbled from a focusable child).
    replayHoverBlink();
    onFocus?.(event);
  };

  const mountBlinkDurationMs = markProps?.blinkDurationMs;
  const resolvedBlinkDurationMs =
    blinkReplayToken > 0
      ? hoverBlinkDurationMs
      : mountBlinkDurationMs;

  return (
    <div
      className={className}
      style={mergedStyle}
      data-lsm-brand=""
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
    </div>
  );
}
