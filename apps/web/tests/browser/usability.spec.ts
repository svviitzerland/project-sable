import { test, expect } from "@playwright/test";
import { register } from "./helpers";

test("case setup, case search and mobile conversations keep the next action clear", async ({
  page,
}, info) => {
  await register(page);
  await page.getByRole("button", { name: "Create your first case" }).click();
  await page.getByRole("button", { name: /Start a blank case/ }).click();
  await page.getByLabel("Case title").fill("Usability review");
  await page.getByLabel("Reference (optional)").fill("REF-2026");
  await page.getByRole("button", { name: "Create case", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Start with your case material." }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("case-start-desktop.png") });
  await page.getByLabel("Find a case").fill("not a case");
  await expect(page.getByText("No matching cases.")).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await page.getByLabel("Find a case").fill("REF-2026");
  await expect(
    page.getByRole("navigation", { name: "Your cases" }).getByRole("button"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Add case documents" }).click();
  await page
    .getByRole("tabpanel")
    .locator('input[type="file"]')
    .setInputFiles({
      name: "Witness statement.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "The witness arrived at the warehouse at eight. The guard recorded the arrival.",
      ),
    });
  await expect(
    page.getByRole("status").filter({ hasText: "Document added." }),
  ).toBeVisible();
  await page
    .getByLabel("Search case evidence", { exact: true })
    .fill("warehouse");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Search results/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search results" }).click();
  await expect(
    page.getByLabel("Search case evidence", { exact: true }),
  ).toHaveValue("");
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("tabpanel")).not.toContainText(
    /Bedrock|backend|configured|deployment|Connections/,
  );
  await page.getByRole("tab", { name: "Case assistant", exact: true }).click();
  await page
    .getByLabel("Ask about this case", { exact: true })
    .fill("What time did the witness arrive?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log").locator("article")).toHaveCount(2);
  await expect(page.getByRole("tabpanel")).not.toContainText(
    /Bedrock|backend|configured|deployment/,
  );
  await page.route(
    "**/api/v1/cases/*/dialogues/*/messages",
    (route) =>
      route.fulfill({
        status: 503,
        json: {
          detail:
            "Amazon Bedrock request failed (HTTP 403). Check the instance role. Reference: support-example",
        },
      }),
    { times: 1 },
  );
  await page
    .getByLabel("Ask about this case", { exact: true })
    .fill("Which account should I compare?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Reference: support-example",
  );
  await expect(page.getByRole("alert")).not.toContainText(
    /Bedrock|HTTP|instance role/,
  );
  await expect(
    page.getByLabel("Ask about this case", { exact: true }),
  ).toHaveValue("Which account should I compare?");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("complementary", { name: "Saved conversations" }),
  ).toBeHidden();
  const history = page.getByRole("button", { name: /^History/ });
  await history.click();
  await expect(
    page.getByRole("complementary", { name: "Saved conversations" }),
  ).toBeVisible();
  await history.click();
  await page
    .getByLabel("Ask about this case", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("assistant-mobile.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("sign in offers password visibility without setup instructions", async ({
  page,
}) => {
  await page.goto("/workspace");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await expect(page.locator("body")).not.toContainText(
    /configured|deployment|operator|backend/,
  );
});
