import { expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
export async function register(page: Page) {
  const email = `acceptance-${randomUUID()}@example.invalid`;
  await page.goto("/workspace");
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Acceptance counsel");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("test-password-12345");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Account" })).toBeVisible();
  return email;
}
