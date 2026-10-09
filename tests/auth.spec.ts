import { test, expect } from "@playwright/test";

test("welcome, signup, sign out, wrong password and persistent login", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `signup.${Date.now()}@example.com`;
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "when work connects",
  );
  await page
    .locator(".landing-header")
    .getByRole("link", { name: "Sign Up Free", exact: true })
    .click();
  await page.getByLabel("First name").fill("Priya");
  await page.getByLabel("Last name").fill("Pandey");
  await page.getByLabel("Email Address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("MyPassword123!");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No meetings scheduled", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await expect(page.locator(".account-summary")).toContainText("Priya Pandey");
  await expect(page.locator(".account-summary")).toContainText(email);
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "when work connects",
  );
  await page
    .locator(".landing-header")
    .getByRole("link", { name: "Sign In", exact: true })
    .click();
  await page.getByLabel("Email Address").fill(email);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByLabel("Password", { exact: true }).fill("WrongPassword123!");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.locator(".auth-form").getByRole("alert")).toContainText(
    "Incorrect email or password",
  );
  await page.getByLabel("Password", { exact: true }).fill("MyPassword123!");
  await page.getByLabel("Stay signed in").check();
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("signed-out guest can join and auth screens fit mobile and tablet", async ({
  page,
}) => {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/signin", "/signup"]) {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .locator(".landing-mobile-menu")
    .getByRole("button", { name: "Join Meeting", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Join Meeting" }),
  ).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveValue("");
  await page.getByLabel("Your name").fill("Guest Visitor");
  await page.getByLabel("Meeting ID or invite link").fill("00000000000");
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Meeting not found",
  );
});

test("signing out in another tab closes a host room and stops its camera", async ({
  page,
  context,
}) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Use demo account" }).click();
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByRole("button", { name: "New Meeting", exact: true }).click();
  await page.getByRole("button", { name: "Join Meeting", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "End", exact: true }),
  ).toBeVisible();
  await page
    .getByTestId("local-tile")
    .locator("video")
    .evaluate((video: HTMLVideoElement) => {
      (window as unknown as { callTracks: MediaStreamTrack[] }).callTracks = (
        video.srcObject as MediaStream
      ).getTracks();
    });
  const second = await context.newPage();
  await second.goto("/workplace");
  await second.getByRole("button", { name: "Profile", exact: true }).click();
  await second.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "You’ve been signed out" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      (
        window as unknown as { callTracks: MediaStreamTrack[] }
      ).callTracks.every((track) => track.readyState === "ended"),
    ),
  ).toBe(true);
  await expect(second.getByRole("heading", { level: 1 })).toContainText(
    "when work connects",
  );
});
