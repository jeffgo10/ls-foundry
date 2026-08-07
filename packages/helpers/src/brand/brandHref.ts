/** Default destination for {@link LiteShadeBrand} when used as a link. */
export const LSM_BRAND_HOME_URL = "https://liteshademedia.com";

/**
 * Resolve a brand href, optionally appending a `ref` query param.
 * Absolute URLs use the `URL` API; relative paths append `?ref=` / `&ref=`.
 */
export function buildLiteShadeBrandHref(
  href: string,
  referral?: string,
): string {
  if (!referral) return href;

  try {
    const url = new URL(href);
    url.searchParams.set("ref", referral);
    return url.toString();
  } catch {
    const join = href.includes("?") ? "&" : "?";
    return `${href}${join}ref=${encodeURIComponent(referral)}`;
  }
}
