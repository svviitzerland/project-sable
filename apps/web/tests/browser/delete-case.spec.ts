import { expect, test } from "@playwright/test";
import { createCase, register } from "./helpers";

test("deleting the only case leaves an empty workspace without errors", async ({
  page,
}) => {
  await register(page);
  await createCase(page, "Perkara untuk dihapus");
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Delete this case" }).click();
  await page
    .getByRole("dialog", { name: "Delete this case?" })
    .getByRole("button", { name: "Delete permanently" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Perkara untuk dihapus" }),
  ).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Settings" })).toHaveCount(0);
  // Survive a polling cycle: no "Case not found" for the deleted case.
  await page.waitForTimeout(6000);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
