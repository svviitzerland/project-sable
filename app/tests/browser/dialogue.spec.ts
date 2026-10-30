import { test, expect } from "@playwright/test";
import { register } from "./helpers";
test("case assistant and manually configured courtroom practice", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await register(page);
  await page.getByRole("button", { name: "Try a synthetic hearing" }).click();
  await page
    .getByRole("button", { name: "Witness statement", exact: false })
    .first()
    .click();
  await page.getByRole("button", { name: "Discuss with assistant" }).click();
  await expect(
    page.getByRole("tab", { name: "Case assistant", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByText("Reference case material (1)", { exact: false }).click();
  await expect(page.getByLabel("Selected evidence passage")).toBeChecked();
  await page
    .getByLabel("Ask about this case", { exact: true })
    .fill("What does the statement say about arrival time?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByText("AI replies are unavailable", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("log")
    .locator("details")
    .first()
    .locator("summary")
    .click();
  await expect(
    page.getByRole("link", { name: "Open original", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("log").locator("blockquote").first(),
  ).toBeVisible();
  await page.getByText("Include legal lookup", { exact: false }).click();
  await expect(page.getByLabel("Legal search terms")).toBeDisabled();
  await page
    .getByLabel("Ask about this case", { exact: true })
    .fill("What other context is available?");
  await page.route(
    "**/dialogues/*/messages",
    (route) =>
      route.fulfill({
        status: 503,
        json: {
          detail: "Provider temporarily unavailable. Retry your message.",
        },
      }),
    { times: 1 },
  );
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Provider temporarily unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Ask about this case", { exact: true }),
  ).toHaveValue("What other context is available?");
  await expect(page.getByRole("log").locator("article")).toHaveCount(2);
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log").locator("article")).toHaveCount(4);
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Export conversation" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
  await page.reload();
  await page.getByRole("tab", { name: "Case assistant", exact: true }).click();
  await expect(page.getByRole("log").locator("article")).toHaveCount(4);
  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(
    page.getByRole("textbox", { name: "Ask about this case", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("log").locator("article")).toHaveCount(0);
  await page
    .getByRole("button", { name: "What does the statement say", exact: false })
    .click();
  await expect(page.getByRole("log").locator("article")).toHaveCount(4);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page
    .getByRole("tab", { name: "Courtroom practice", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Suggest from case" }),
  ).toBeDisabled();
  await page
    .getByLabel("Trial type", { exact: true })
    .fill("Civil hearing practice");
  await page
    .getByLabel("Jurisdiction / court")
    .fill("Practice court — verify local procedure");
  await page.getByLabel("Your role", { exact: false }).selectOption("judge");
  await page
    .getByLabel("Stage", { exact: false })
    .selectOption("Procedural hearing");
  await page.getByLabel("Difficulty").selectOption("Challenging");
  await page
    .getByLabel("Scenario assumptions and ground rules")
    .fill(
      "Hypothetical hearing with two counsel; no additional witness facts assumed.",
    );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Start rehearsal" }).click();
  await expect(
    page.getByText("You are practising as judge", { exact: false }),
  ).toBeVisible();
  await page.getByText("Trial conditions", { exact: true }).click();
  await expect(
    page.getByText("Civil hearing practice", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Your turn · Judge", exact: true })
    .fill(
      "Counsel, identify the question that the evidence leaves unresolved.",
    );
  await page.getByRole("button", { name: "Take your turn" }).click();
  await expect(
    page.getByText("Which exact source supports that point", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Finish & debrief" }).click();
  await expect(
    page.getByText("Rehearsal complete. Your dialogue and debrief are saved."),
  ).toBeVisible();
  await expect(
    page.getByText("did not assess your performance", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("tab", { name: "Courtroom practice", exact: true })
    .click();
  await expect(
    page.getByText("Rehearsal complete.", { exact: false }),
  ).toBeVisible();
  await page.getByText("Trial conditions", { exact: true }).click();
  await page
    .getByRole("button", { name: "Edit setup for a new rehearsal" })
    .click();
  await expect(page.getByLabel("Trial type", { exact: true })).toHaveValue(
    "Civil hearing practice",
  );
  await expect(page.getByLabel("Your role", { exact: false })).toHaveValue(
    "judge",
  );
  await page.getByLabel("Your role", { exact: false }).selectOption("opposing");
  await page.getByRole("button", { name: "Start rehearsal" }).click();
  await expect(
    page.getByRole("textbox", {
      name: "Your turn · Opposing counsel",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
