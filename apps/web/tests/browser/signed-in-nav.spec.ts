import { expect, test } from "@playwright/test";
import { register } from "./helpers";

test("public pages show the workspace link instead of sign in once signed in", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "Sign in" })).toBeVisible();
  await register(page);
  for (const path of ["/", "/pricing"]) {
    await page.goto(path);
    const signedNav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(
      signedNav.getByRole("link", { name: "Open workspace" }),
    ).toBeVisible();
    await expect(signedNav.getByRole("link", { name: "Sign in" })).toHaveCount(
      0,
    );
  }
});
