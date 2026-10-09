import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Use demo account" }).click();
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
}

test("schedule, persist, invite, and reject an invalid meeting", async ({
  page,
}) => {
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  const title = `Review ${Date.now()}`;
  await page.getByLabel("Topic").fill(title);
  await page.getByLabel("Description").fill("Review the release together.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Meeting invitation");
  await expect(page.getByLabel("Invite link")).toHaveValue(/\/meeting\/\d{11}/);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Meetings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await page.getByLabel("Meeting ID or invite link").fill("00000000000");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Join", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Meeting not found",
  );
});

test("two browsers exchange real video, chat, mute, screen share, removal, and end", async ({
  browser,
}) => {
  const options = {
    permissions: ["camera", "microphone"],
    viewport: { width: 1440, height: 1000 },
  };
  const hostContext = await browser.newContext(options),
    guestContext = await browser.newContext(options);
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  const browserErrors: string[] = [];
  host.on("pageerror", (error) => browserErrors.push(error.message));
  guest.on("pageerror", (error) => browserErrors.push(error.message));
  await signIn(host);
  await host.getByRole("button", { name: /^New Meeting/ }).click();
  await expect(
    host.getByRole("button", { name: "Join Meeting", exact: true }),
  ).toBeEnabled();
  await host.getByLabel("Your name").fill("Ankit Host");
  const url = host.url();
  await host.getByRole("button", { name: "Join Meeting", exact: true }).click();
  await expect(
    host.getByRole("button", { name: "End", exact: true }),
  ).toBeVisible();
  await guest.goto(url);
  await guest.getByLabel("Your name").fill("Priya Guest");
  await guest
    .getByRole("button", { name: "Join Meeting", exact: true })
    .click();
  await expect(
    guest.getByRole("button", { name: "Leave", exact: true }),
  ).toBeVisible();
  await expect(host.getByTestId("remote-tile")).toHaveCount(1);
  await expect
    .poll(
      () =>
        host
          .getByTestId("local-tile")
          .locator("video")
          .evaluate((v: HTMLVideoElement) => v.videoWidth > 0),
      { timeout: 10000 },
    )
    .toBe(true);
  await expect
    .poll(
      () =>
        host
          .getByTestId("remote-tile")
          .locator("video")
          .evaluate(
            (video: HTMLVideoElement) =>
              video.readyState >= 2 && video.videoWidth > 0,
          ),
      { timeout: 25000 },
    )
    .toBe(true);
  await expect
    .poll(
      () =>
        guest
          .getByTestId("remote-tile")
          .locator("video")
          .evaluate(
            (video: HTMLVideoElement) =>
              video.readyState >= 2 && video.videoWidth > 0,
          ),
      { timeout: 25000 },
    )
    .toBe(true);
  await host.getByRole("button", { name: "Chat", exact: true }).click();
  await guest.getByRole("button", { name: "Chat", exact: true }).click();
  await guest.getByLabel("Message everyone").fill("Hello from Priya!");
  await guest
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await expect(host.locator(".chat-history")).toContainText(
    "Hello from Priya!",
  );
  await host.getByRole("button", { name: "Participants", exact: true }).click();
  await host.getByRole("button", { name: "Mute All", exact: true }).click();
  await expect(
    guest.getByRole("button", { name: "Unmute", exact: true }),
  ).toBeVisible();
  await guest.getByRole("button", { name: "Raise Hand", exact: true }).click();
  await expect(
    host.getByTestId("remote-tile").locator(".raised-hand"),
  ).toBeVisible();
  await host.getByRole("button", { name: "Share Screen", exact: true }).click();
  await expect(host.locator(".sharing-banner")).toBeVisible({ timeout: 15000 });
  await expect(guest.locator(".speaker-stage")).toBeVisible();
  await host
    .getByRole("button", { name: "Stop Share", exact: true })
    .first()
    .click();
  await expect(host.locator(".sharing-banner")).toHaveCount(0);
  await host.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(
    guest.getByRole("heading", { name: "You’ve been removed" }),
  ).toBeVisible();
  await host.getByRole("button", { name: "End", exact: true }).click();
  await host.getByRole("button", { name: "End Meeting for All" }).click();
  await expect(
    host.getByRole("heading", { name: "This meeting has ended" }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
  await hostContext.close();
  await guestContext.close();
});

test("dashboard and join form fit a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await expect(
    page.getByRole("button", { name: /^New Meeting/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByLabel("Your name")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
