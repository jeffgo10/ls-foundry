/** Common crawler UAs — skip scramble so indexed DOM text is the final copy. */
const SEARCH_BOT_UA =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex(bot|imageserver)|facebookexternalhit|twitterbot|linkedinbot|embedly|pinterest(bot)?|applebot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|anthropic-ai/i;

/** True when `navigator.userAgent` looks like a search/social crawler. */
export function isLikelySearchBot(
  userAgent: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
): boolean {
  return SEARCH_BOT_UA.test(userAgent);
}

let cachedSkipEnvironment: boolean | undefined;

/**
 * Bot / reduced-motion gate, computed once per page load (module cache).
 * SSR (`window` missing) always returns `true` and does not populate the cache.
 */
export function resolveSkipEnvironment(): boolean {
  if (typeof window === "undefined") return true;
  if (cachedSkipEnvironment !== undefined) return cachedSkipEnvironment;
  cachedSkipEnvironment =
    isLikelySearchBot() ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return cachedSkipEnvironment;
}

/** Clears the module cache — for unit tests only. */
export function resetSkipEnvironmentCache(): void {
  cachedSkipEnvironment = undefined;
}
