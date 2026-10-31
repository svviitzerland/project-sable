import { test, expect } from "@playwright/test";
test("original landing, smooth finite motion, keyboard access and no-JavaScript navigation", async ({
  page,
  browser,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const paper = page.locator(".hero-evidence");
  await page.waitForFunction(() =>
    document
      .querySelector(".hero-evidence")
      ?.getAnimations({ subtree: true })
      .some((a) => a.playState === "running"),
  );
  await page.getByRole("button", { name: "Replay comparison" }).click();
  await page.waitForFunction(() =>
    document
      .querySelector(".quote-highlight")
      ?.getAnimations()
      .some((a) => a.playState === "running"),
  );
  await page.locator("#questions").scrollIntoViewIfNeeded();
  await page.waitForFunction(() =>
    document
      .querySelector(".hero-evidence")
      ?.getAnimations({ subtree: true })
      .every((a) => a.playState !== "running"),
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForFunction(
    () =>
      document.querySelector(".hero-evidence")?.getAnimations({ subtree: true })
        .length === 0,
  );
  expect(await paper.evaluate((el) => getComputedStyle(el).transform)).toBe(
    "none",
  );
  await expect(page.locator(".hero h1")).toHaveText(
    "Stay with the testimony. See the whole story.",
  );
  await expect(page.locator(".workflow-list > li")).toHaveCount(3);
  await expect(page.locator(".hero .source-link")).toHaveCount(2);
  expect(
    await page
      .locator(".hero")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toContain("jude-case-files.webp");
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(page.locator("#mobile-navigation a").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeFocused();
  await page.locator(".hero .source-link").nth(1).click();
  await expect(page.locator("#demo-title")).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Earlier account of events" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "A matching detail" }).click();
  await expect(
    page.getByRole("heading", { name: "Both accounts place a guard" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mark as reviewed", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Marked as reviewed", exact: false }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Witness statement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Earlier account of events" }),
  ).toBeVisible();
  await page
    .getByText("Can I upload case documents here?", { exact: true })
    .click();
  await expect(
    page.getByText("The authenticated workspace accepts", { exact: false }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  expect(
    await paper.evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await expect(
    page.getByRole("button", { name: "Replay comparison" }),
  ).toBeHidden();
  const staticPage = await browser.newPage({ javaScriptEnabled: false });
  await staticPage.goto(baseURL!);
  await expect(staticPage.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    staticPage.getByText("I arrived at 9:30 PM.", { exact: false }).first(),
  ).toBeVisible();
  await staticPage
    .getByRole("link", { name: "Open workspace", exact: true })
    .click();
  await expect(staticPage).toHaveURL(baseURL + "/workspace");
  await staticPage.close();
  expect(errors).toEqual([]);
});
