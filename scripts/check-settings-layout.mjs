// Usage: SETTINGS_TEST_URL=http://127.0.0.1:3001/plans/<slug> node scripts/check-settings-layout.mjs
// Requires a real plan with photos. Read-only: no settings are saved.
import { chromium } from "playwright";
import assert from "node:assert/strict";

assert(process.env.SETTINGS_TEST_URL, "Set SETTINGS_TEST_URL to a plan with photos");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_CHANNEL ? { channel: process.env.CHROME_CHANNEL } : {}),
});
try {
  const page = await browser.newPage();
  for (const [width, height] of [[320, 568], [375, 667], [390, 844], [430, 932], [667, 375], [1280, 800]]) {
    await page.setViewportSize({ width, height });
    await page.goto(process.env.SETTINGS_TEST_URL);
    await page.getByRole("button", { name: "Ustawienia", exact: true }).click();
    const panel = page.locator(".settings-menu-dropdown");
    await panel.waitFor();
    await panel.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    await panel.locator("select option").last().evaluate(el => {
      el.textContent = "Bardzo długa nazwa atrakcji i zdjęcia nagłówka ".repeat(8);
    });
    const result = await panel.evaluate(el => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left, right: r.right, top: r.top, bottom: r.bottom,
        clientWidth: el.clientWidth, scrollWidth: el.scrollWidth,
        controls: [...el.querySelectorAll("input, select, button")].map(control => {
          const b = control.getBoundingClientRect();
          return { left: b.left, right: b.right, width: b.width };
        }),
      };
    });
    assert(result.left >= 0 && result.right <= width, "Panel exceeds viewport width");
    assert(result.top >= 0 && result.bottom <= height, "Panel exceeds viewport height");
    assert(result.scrollWidth <= result.clientWidth, "Panel has horizontal overflow");
    assert(result.controls.every(c => c.left >= result.left && c.right <= result.right && c.width > 0), "Control exceeds panel");
    for (const control of await panel.locator("input, select, button").all()) {
      await control.scrollIntoViewIfNeeded();
      assert(await control.evaluate(el => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return hit === el || el.contains(hit);
      }), "Control is obscured by another layer");
    }
    await panel.evaluate(el => { el.scrollTop = 0; });
    if (width === 390 && process.env.SETTINGS_SCREENSHOT) {
      await page.screenshot({ path: process.env.SETTINGS_SCREENSHOT });
    }
    await page.getByRole("button", { name: "Ustawienia", exact: true }).click();
    assert.equal(await panel.count(), 0, "Panel does not close");
    console.log(`PASS settings layout ${width}x${height}`);
  }
} finally {
  await browser.close();
}
