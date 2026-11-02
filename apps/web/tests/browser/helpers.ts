import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
export async function register(page: Page) {
  const email = `acceptance-${randomUUID()}@example.invalid`;
  // Keep the desktop rail expanded so every sidebar control stays visible to tests.
  await page.addInitScript(() =>
    localStorage.setItem("jude.sidebar.pinned", "1"),
  );
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Acceptance counsel");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("test-password-12345");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Account", exact: true }),
  ).toBeVisible();
  return email;
}
/** Create a blank case through the new-case modal and wait for its workspace. */
export async function createCase(page: Page, title: string) {
  await page.getByRole("button", { name: "New case", exact: true }).click();
  await page.getByRole("button", { name: /Start a blank case/ }).click();
  await page.getByLabel("Case title").fill(title);
  await page.getByRole("button", { name: "Create case", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: title, exact: true }),
  ).toBeVisible();
}
/** Upload a small text document from the Case documents tab and wait until it is listed. */
export async function uploadDocument(page: Page, name: string, text: string) {
  await page.getByRole("tab", { name: /^Case documents/ }).click();
  const original = Buffer.from(text);
  await page.getByRole("tabpanel").locator("input[type=file]").setInputFiles({
    name,
    mimeType: "text/plain",
    buffer: original,
  });
  await expect(documentButton(page, name)).toBeVisible();
  return original;
}
/** The document list entry for an uploaded file. */
export function documentButton(page: Page, name: string) {
  return page.getByRole("button", {
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`),
  });
}
