import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(process.env.TEST_BASE_URL || "http://localhost:3000");
await page.getByRole("heading", { level: 1 }).waitFor();
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "artifacts/landing-hero-desktop.png" });
await page.screenshot({
  path: "artifacts/landing-desktop.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page
  .locator(".landing-product-track")
  .evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
await page.screenshot({ path: "artifacts/landing-hero-mobile.png" });
await page.screenshot({ path: "artifacts/landing-mobile.png", fullPage: true });
await page.setViewportSize({ width: 768, height: 1024 });
await page
  .locator(".landing-product-track")
  .evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
await page.screenshot({ path: "artifacts/landing-tablet.png", fullPage: true });
await page.setViewportSize({ width: 1440, height: 1000 });
await page
  .locator(".landing-header")
  .getByRole("link", { name: "Sign In", exact: true })
  .click();
await page.getByRole("heading", { name: "Sign in", exact: true }).waitFor();
await page.screenshot({ path: "artifacts/signin-desktop.png", fullPage: true });
await page.getByRole("link", { name: "Sign Up Free" }).click();
await page.getByRole("heading", { name: "Get started with Zoom" }).waitFor();
await page.screenshot({ path: "artifacts/signup-desktop.png", fullPage: true });
await page.goto(
  new URL("/signin", process.env.TEST_BASE_URL || "http://localhost:3000").href,
);
await page.getByRole("button", { name: "Use demo account" }).click();
await page.getByRole("button", { name: "Sign In", exact: true }).click();
await page.getByRole("heading", { name: "Home", exact: true }).waitFor();
await page.getByRole("button", { name: "New Meeting", exact: true }).waitFor();
await page.evaluate(() => document.fonts.ready);
await page.screenshot({
  path: "artifacts/dashboard-desktop.png",
  fullPage: true,
});
await page.setViewportSize({ width: 768, height: 1024 });
await page.screenshot({
  path: "artifacts/dashboard-tablet.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "artifacts/dashboard-mobile.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Schedule", exact: true }).click();
await page.screenshot({
  path: "artifacts/schedule-mobile.png",
  fullPage: true,
});
await browser.close();
