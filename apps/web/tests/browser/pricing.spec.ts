import { test, expect, type Page } from "@playwright/test";
import { register } from "./helpers";

const card = (page: Page, name: string) =>
  page.locator("article", {
    has: page.getByRole("heading", { name, exact: true }),
  });

test("pricing page renders, toggles billing, recommends a plan and fits a phone", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/pricing", { waitUntil: "networkidle" });
  await expect(page).toHaveTitle("Pricing | Jude");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Don't let a single difference in testimony slip past.",
  );
  // The landing page links here.
  await expect(card(page, "Law firm")).toContainText("Recommended for teams");

  // Yearly is selected by default; monthly prices count up to the new values.
  const billing = page.getByRole("group", { name: "Billing period" });
  await expect(billing.getByLabel("Yearly")).toBeChecked();
  const pro = card(page, "Advokat Pro");
  await expect(pro.locator(".amount")).toHaveText("749,000");
  await expect(pro).toContainText("≈ Rp149,800 per hearing hour");
  await billing.getByLabel("Monthly").check();
  await expect(billing.getByLabel("Monthly")).toBeChecked();
  await expect(pro.locator(".amount")).toHaveText("899,000");
  await expect(card(page, "Law firm").locator(".amount")).toHaveText(
    "1,549,000",
  );
  await billing.getByLabel("Yearly").check();
  await expect(card(page, "Law firm").locator(".amount")).toHaveText(
    "1,290,000",
  );

  // Three accounts on shared cases, 25 hours each: the law firm plan.
  await page.getByLabel("Hearing hours per account per month").fill("25");
  await page.getByLabel("Accounts", { exact: true }).fill("3");
  await page.getByLabel("Accounts", { exact: true }).blur();
  await expect(
    page.getByLabel("The team works on the same cases"),
  ).toBeChecked();
  await expect(page.getByTestId("calc-plan")).toHaveText("Law firm");
  await expect(page.locator(".result-amount")).toHaveText("Rp9,945,000");
  // One account at one hour: the entry plan.
  await page.getByRole("button", { name: "Fewer accounts" }).click();
  await page.getByRole("button", { name: "Fewer accounts" }).click();
  await page.getByLabel("Hearing hours per account per month").fill("1");
  await expect(page.getByTestId("calc-plan")).toHaveText("Advokat Lite");

  // FAQ accordion exposes its state.
  const faq = page.getByRole("button", {
    name: "Is my data export ever locked?",
  });
  await expect(faq).toHaveAttribute("aria-expanded", "false");
  await faq.click();
  await expect(faq).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("Never. Exporting a case")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.getByRole("button", { name: "Show the full comparison" });
  await toggle.click();
  await expect(page.locator("#compare-table table")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  // The landing page links to pricing.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Pricing" })
    .click();
  await expect(page).toHaveURL(/\/pricing$/);
  expect(errors).toEqual([]);
});

test("a signed-in user switches plans instantly in demo mode and sees usage", async ({
  page,
}) => {
  await register(page);
  await page.goto("/pricing", { waitUntil: "networkidle" });
  await expect(
    card(page, "Free trial").getByRole("button", { name: "Your current plan" }),
  ).toBeDisabled();
  await card(page, "Advokat Pro")
    .getByRole("button", { name: "Choose this plan" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Activate Advokat Pro" });
  await expect(dialog).toContainText(
    "Demo mode: no payment is taken and the plan applies immediately.",
  );
  await expect(dialog.locator(".modal-total")).toHaveText("Rp749,000");
  await dialog.getByLabel("Monthly").check();
  await expect(dialog.locator(".modal-total")).toHaveText("Rp899,000");
  await dialog.getByRole("button", { name: "Activate plan" }).click();
  await expect(dialog).toContainText(
    "Advokat Pro is now active on your account.",
  );
  const plan = await (await page.request.get("/api/v1/account/plan")).json();
  expect(plan).toMatchObject({
    plan: "advokat",
    billing: "monthly",
    accounts: 1,
  });
  await dialog.getByRole("link", { name: "Back to the workspace" }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await page.getByRole("button", { name: "Account", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Account", exact: true });
  await expect(menu).toContainText("Advokat Pro");
  await expect(menu).toContainText("Simulated billing");
  await expect(
    menu.getByRole("meter", { name: "Hearing hours this month" }),
  ).toHaveAttribute("aria-valuetext", "0 of 5");
  await expect(
    menu.getByRole("meter", { name: "AI questions this month" }),
  ).toHaveAttribute("aria-valuetext", "0 of 300");
  await menu.getByRole("link", { name: "Change plan" }).click();
  await expect(page).toHaveURL(/\/pricing$/);

  // Kantor Hukum needs three accounts.
  await card(page, "Law firm")
    .getByRole("button", { name: "Choose this plan" })
    .click();
  const firm = page.getByRole("dialog", { name: "Activate Law firm" });
  await expect(firm.getByLabel("Accounts")).toHaveValue("3");
  await firm.getByRole("button", { name: "Activate plan" }).click();
  await expect(firm).toContainText("Law firm is now active on your account.");
  await firm.getByRole("button", { name: "Close" }).click();
  await expect(
    card(page, "Law firm").getByRole("button", { name: "Your current plan" }),
  ).toBeVisible();
});
