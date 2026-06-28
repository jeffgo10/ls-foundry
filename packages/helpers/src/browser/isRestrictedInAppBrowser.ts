const RESTRICTED_IN_APP_BROWSER_PATTERN =
  /(?:FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|MicroMessenger|Twitter|LinkedInApp)/i;

/** In-app browsers that block programmatic file downloads (e.g. Meta Messenger). */
export function isRestrictedInAppBrowser(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return RESTRICTED_IN_APP_BROWSER_PATTERN.test(navigator.userAgent);
}
