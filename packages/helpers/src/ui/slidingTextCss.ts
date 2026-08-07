/** Attribute consumers put on an interactive ancestor (Link, `<a>`, button). */
export const SLIDING_TEXT_GROUP_ATTR = "data-sliding-text-group" as const;

/** Spread onto a parent so hover/focus-visible drives nested {@link SlidingText}. */
export const slidingTextGroupProps = {
  [SLIDING_TEXT_GROUP_ATTR]: "",
} as const;

export type SlidingTextMotionOptions = {
  durationMs?: number;
  easing?: string;
  slideDistance?: string;
};

const DEFAULT_DURATION_MS = 300;
const DEFAULT_EASING = "cubic-bezier(0.2, 0.9, 0.2, 1)";
const DEFAULT_SLIDE_DISTANCE = "110%";

/**
 * Scoped CSS for vertical slide reveal. Supports:
 * - self-contained `:hover` / `:focus-visible` / `:focus-within` on the root
 * - ancestor `[data-sliding-text-group]:hover` / `:focus-visible` (nav + index siblings)
 */
export function buildSlidingTextCss(
  scopeId: string,
  options: SlidingTextMotionOptions = {},
): string {
  const durationMs = options.durationMs ?? DEFAULT_DURATION_MS;
  const easing = options.easing ?? DEFAULT_EASING;
  const distance = options.slideDistance ?? DEFAULT_SLIDE_DISTANCE;
  const safeId = scopeId.replace(/[^a-zA-Z0-9_-]/g, "");
  const root = `[data-lsm-sliding="${safeId}"]`;
  const group = `[${SLIDING_TEXT_GROUP_ATTR}]`;
  const transition = `transform ${durationMs}ms ${easing}`;

  return `
${root} [data-lsm-sliding-primary],
${root} [data-lsm-sliding-active] {
  display: block;
  transition: ${transition};
}
${root} [data-lsm-sliding-primary] {
  transform: translateY(0);
}
${root} [data-lsm-sliding-active] {
  position: absolute;
  left: 0;
  top: 0;
  transform: translateY(-${distance});
}
${root}:hover [data-lsm-sliding-primary],
${root}:focus-visible [data-lsm-sliding-primary],
${root}:focus-within [data-lsm-sliding-primary],
${group}:hover ${root} [data-lsm-sliding-primary],
${group}:focus-visible ${root} [data-lsm-sliding-primary] {
  transform: translateY(${distance});
}
${root}:hover [data-lsm-sliding-active],
${root}:focus-visible [data-lsm-sliding-active],
${root}:focus-within [data-lsm-sliding-active],
${group}:hover ${root} [data-lsm-sliding-active],
${group}:focus-visible ${root} [data-lsm-sliding-active] {
  transform: translateY(0);
}
`.trim();
}

export const SLIDING_TEXT_DEFAULTS = {
  durationMs: DEFAULT_DURATION_MS,
  easing: DEFAULT_EASING,
  slideDistance: DEFAULT_SLIDE_DISTANCE,
  clipHeight: "1.15em",
} as const;
