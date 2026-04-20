// Setup for all test environments
// jest-dom matchers only apply in jsdom (Element is defined there)
if (typeof Element !== "undefined") {
  // @ts-expect-error — vitest types don't expose setup properly
  await import("@testing-library/jest-dom/vitest");
  // jsdom doesn't implement scrollIntoView
  Element.prototype.scrollIntoView = function () {} as any;
}