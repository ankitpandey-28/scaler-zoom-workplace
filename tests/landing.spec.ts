import { test, expect } from "@playwright/test";

test("public landing connects its carousel, search, guest joining, and signed-in workplace", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "when work connects",
  );
  await page.getByRole("button", { name: "Next product", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Screen Sharing", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Search the site" }).click();
  await page.getByLabel("Search products").fill("chat");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Team Chat/ })
    .click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "Keep the conversation going",
  );
  await page
    .locator(".landing-header")
    .getByRole("button", { name: "Join Meeting", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Join Meeting" }),
  ).toBeVisible();
  await page.getByLabel("Your name").fill("Landing Guest");
  await page.getByLabel("Meeting ID or invite link").fill("00000000000");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Join", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Meeting not found",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto("/signin");
  await page.getByRole("button", { name: "Use demo account" }).click();
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/workplace$/);
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "when work connects",
  );
  await page
    .locator(".landing-header")
    .getByRole("link", { name: "Open Workplace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
