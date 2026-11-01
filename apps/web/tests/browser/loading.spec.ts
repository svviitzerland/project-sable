import { test, expect, type Page } from "@playwright/test";
import { documentButton, register, uploadDocument } from "./helpers";

test.use({ actionTimeout: 15000 });

async function hold(page: Page, pattern: string) {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(pattern, async (route) => {
    await ready;
    await route.continue();
  });
  return async () => {
    release();
  };
}

test("skeletons cover delayed workspace, sources, hearings and replies without false empty states", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const releaseBoot = await hold(page, "**/api/v1/capabilities");
  await page.goto("/workspace", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("status", { name: "Opening your workspace…" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("workspace-loading-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("workspace-loading-mobile.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await releaseBoot();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await register(page);
  const releaseGraph = await hold(page, "**/api/v1/cases/*/graph");
  await page.getByRole("button", { name: "Open the demo case" }).click();
  await expect(
    page.getByRole("status", { name: "Loading evidence map…" }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("evidence-loading.png") });
  await releaseGraph();
  await expect(
    page.getByRole("status", { name: "Loading evidence map…" }),
  ).toHaveCount(0);

  const releaseCases = await hold(page, "**/api/v1/cases");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("status", { name: "Loading your cases…" }).last(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A place for the whole case." }),
  ).toHaveCount(0);
  await releaseCases();
  // Upload a small labeled document so the reader and search do not depend on demo content.
  await uploadDocument(
    page,
    "skeleton-witness.txt",
    "Synthetic test note. The witness crossed the Saguling bridge at eight.",
  );
  const uploaded = documentButton(page, "skeleton-witness.txt");
  const releaseReader = await hold(
    page,
    "**/api/v1/cases/*/documents/*/chunks",
  );
  await uploaded.click();
  await expect(
    page.getByRole("status", { name: "Loading document passages…" }),
  ).toBeVisible();
  await releaseReader();
  await expect(
    page.getByRole("heading", { name: "Extracted passages" }),
  ).toBeVisible();

  const releaseSearch = await hold(page, "**/api/v1/cases/*/search?*");
  await page
    .getByLabel("Search case evidence", { exact: true })
    .fill("Saguling");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Searching case documents…" }),
  ).toBeVisible();
  await releaseSearch();
  await expect(
    page.getByRole("heading", { name: /Search results/ }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Hearings", exact: true }).click();
  const releaseHearing = await hold(page, "**/api/v1/cases/*/hearings/preview");
  await page.getByLabel("Upload hearing transcript").setInputFiles({
    name: "training.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Counsel: When did you arrive?\nWitness: At eight."),
  });
  await expect(
    page.getByRole("status", { name: "Reading transcript…" }),
  ).toBeVisible();
  await releaseHearing();
  await expect(page.getByLabel("Imported hearing title")).toBeVisible();

  const releaseConversation = await hold(
    page,
    "**/api/v1/cases/*/assistant/context",
  );
  await page.getByRole("tab", { name: "Case assistant", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Opening this case’s conversations…" }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("conversation-loading.png") });
  await releaseConversation();
  await page
    .getByLabel("Ask about this case", { exact: true })
    .fill("What does the witness say?");
  const releaseReply = await hold(
    page,
    "**/api/v1/cases/*/dialogues/*/messages",
  );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Reading the case…" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Start with what you need to understand.",
    }),
  ).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const skeleton = page.getByRole("status", { name: "Reading the case…" });
  expect(
    await skeleton
      .locator('[aria-hidden="true"]')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: info.outputPath("reply-loading-mobile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await releaseReply();
  await expect(page.getByRole("log").locator("article")).toHaveCount(2);
  await expect(skeleton).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("failed evidence loads replace skeletons with a working retry", async ({
  page,
}) => {
  await register(page);
  await page.route(
    "**/api/v1/cases/*/graph",
    (route) =>
      route.fulfill({
        status: 503,
        json: { detail: "Evidence temporarily unavailable." },
      }),
    { times: 1 },
  );
  await page.getByRole("button", { name: "Open the demo case" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Evidence temporarily unavailable.",
  );
  await expect(
    page.getByRole("status", { name: "Loading evidence map…" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Retry loading evidence" }).click();
  await expect(
    page.getByRole("button", { name: "Evidence map", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
