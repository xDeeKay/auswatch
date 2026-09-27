// iPadOS reports as "MacIntel" with no "iPad" in the UA string once desktop-class
// Safari is requested (the default since iPadOS 13), so the UA check alone misses
// it; multi-touch on a Mac-labelled platform is the standard way to catch that
// case, and navigator.standalone (only ever defined on iOS/iPadOS Safari) is a
// second, UA-independent signal for the same devices.
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    typeof (navigator as { standalone?: unknown }).standalone !== "undefined"
  );
}
